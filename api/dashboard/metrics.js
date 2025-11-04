// api/dashboard/metrics.js
// Returns aggregate metrics, user engagement data, and recent activity for the dashboard
// Uses Google task IDs for accurate completion tracking when available

export const config = { runtime: 'nodejs' };

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { getAccessTokenForUser } from '../../lib/google-tasks.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const plannerEmail = url.searchParams.get('plannerEmail');

    if (!plannerEmail) {
      return res.status(400).json({ ok: false, error: 'Missing plannerEmail' });
    }

    // Get all users for this planner (from user_connections and invites)
    const userEmails = new Set();
    
    // Get connected users
    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .in('status', ['connected', 'active']);
    
    if (connectionsError) {
      console.error('[DASHBOARD] Error fetching connections:', connectionsError);
    } else {
      (connections || []).forEach(c => {
        if (c.user_email) userEmails.add(c.user_email.toLowerCase().trim());
      });
    }
    
    // Get invited users (pending)
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('invites')
      .select('user_email')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .is('used_at', null);
    
    if (invitesError) {
      console.error('[DASHBOARD] Error fetching invites:', invitesError);
    } else {
      (invites || []).forEach(inv => {
        if (inv.user_email) userEmails.add(inv.user_email.toLowerCase().trim());
      });
    }
    
    const userEmailsArray = Array.from(userEmails);
    
    // Get all assigned bundles for these users
    const { data: bundles, error: bundlesError } = await supabaseAdmin
      .from('inbox_bundles')
      .select('id, assigned_user_email, title, start_date, created_at, archived_at')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .in('assigned_user_email', userEmailsArray)
      .is('deleted_at', null);

    if (bundlesError) {
      console.error('[DASHBOARD] Error fetching bundles:', bundlesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch bundles' });
    }

    const bundleIds = (bundles || []).map(b => b.id);

    // Get all tasks for these bundles
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('inbox_tasks')
      .select('id, bundle_id, title, day_offset, google_task_id')
      .in('bundle_id', bundleIds);

    if (tasksError) {
      console.error('[DASHBOARD] Error fetching tasks:', tasksError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch tasks' });
    }

    // Get user connections for Google Tasks API access
    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email, google_access_token, google_refresh_token, status')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .eq('status', 'connected')
      .in('user_email', userEmailsArray);

    if (connectionsError) {
      console.error('[DASHBOARD] Error fetching connections:', connectionsError);
    }

    // Build user lookup map
    const userConnections = new Map();
    (connections || []).forEach(conn => {
      userConnections.set(conn.user_email.toLowerCase(), conn);
    });

    // Build bundle lookup map
    const bundleMap = new Map();
    (bundles || []).forEach(bundle => {
      bundleMap.set(bundle.id, bundle);
    });

    // Group tasks by user
    const tasksByUser = new Map();
    (tasks || []).forEach(task => {
      const bundle = bundleMap.get(task.bundle_id);
      if (!bundle || !bundle.assigned_user_email) return;
      
      const userEmail = bundle.assigned_user_email.toLowerCase();
      if (!tasksByUser.has(userEmail)) {
        tasksByUser.set(userEmail, []);
      }
      tasksByUser.get(userEmail).push({
        ...task,
        bundleTitle: bundle.title,
        bundleCreatedAt: bundle.created_at
      });
    });

    // Calculate metrics for each user
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const userMetrics = [];
    const recentCompletions = [];
    
    // Aggregate metrics
    let totalCompletedToday = 0;
    let totalCompletedThisWeek = 0;
    let totalCompletedYesterday = 0;
    let totalCompletedLastWeek = 0;
    let totalTasks = 0;
    let totalCompleted = 0;

    // Process each user
    for (const [userEmail, userTasks] of tasksByUser.entries()) {
      const connection = userConnections.get(userEmail);
      
      if (!connection) {
        // No connection - still add user with zero metrics
        userMetrics.push({
          userEmail,
          isConnected: false,
          today: 0,
          thisWeek: 0,
          completionRate: 0,
          activePlans: new Set([...userTasks.map(t => t.bundle_id)]).size,
          lastActivity: null
        });
        continue;
      }

      // Get access token
      let accessToken;
      try {
        accessToken = await getAccessTokenForUser(userEmail);
      } catch (e) {
        console.error(`[DASHBOARD] Failed to get access token for ${userEmail}:`, e);
        userMetrics.push({
          userEmail,
          isConnected: false,
          today: 0,
          thisWeek: 0,
          completionRate: 0,
          activePlans: new Set([...userTasks.map(t => t.bundle_id)]).size,
          lastActivity: null
        });
        continue;
      }

      // Get all task lists for this user
      let allTaskLists = [];
      try {
        const listsResponse = await fetch(
          'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (listsResponse.ok) {
          const listsData = await listsResponse.json();
          allTaskLists = listsData.items || [];
        }
      } catch (error) {
        console.error(`[DASHBOARD] Error fetching task lists for ${userEmail}:`, error);
      }

      // Build a map of all tasks across all lists (for lookup)
      const allGoogleTasks = new Map(); // Map<taskId, {status, completed, listId}>
      
      // Fetch tasks from all lists
      for (const taskList of allTaskLists) {
        try {
          const tasksResponse = await fetch(
            `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskList.id)}/tasks?maxResults=100&showCompleted=true`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            (tasksData.items || []).forEach(gt => {
              allGoogleTasks.set(gt.id, {
                status: gt.status,
                completed: gt.completed ? new Date(gt.completed) : null,
                title: gt.title
              });
            });
          }
        } catch (error) {
          console.error(`[DASHBOARD] Error fetching tasks from list ${taskList.id}:`, error);
        }
      }

      // Check task completion status via Google Tasks API
      const tasksWithStatus = await Promise.all(
        userTasks.map(async (task) => {
          let completed = false;
          let completedAt = null;

          try {
            if (task.google_task_id) {
              // Use task ID for accurate lookup from our fetched tasks
              const googleTask = allGoogleTasks.get(task.google_task_id);
              if (googleTask) {
                completed = googleTask.status === 'completed';
                completedAt = googleTask.completed;
              }
            } else {
              // Fallback: search by title (for older tasks without stored IDs)
              // Match by title from our fetched tasks
              const matchingTasks = Array.from(allGoogleTasks.entries())
                .filter(([id, gt]) => gt.title === task.title && gt.status === 'completed');
              
              if (matchingTasks.length > 0) {
                completed = true;
                completedAt = matchingTasks[0][1].completed;
              }
            }
          } catch (error) {
            console.error(`[DASHBOARD] Error checking task ${task.id}:`, error);
            // Continue with completed = false
          }

          return {
            ...task,
            completed,
            completedAt
          };
        })
      );

      // Calculate user metrics
      const completedTasks = tasksWithStatus.filter(t => t.completed);
      const completedToday = tasksWithStatus.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= today;
      });
      const completedThisWeek = tasksWithStatus.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= weekAgo;
      });
      const completedYesterday = tasksWithStatus.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= yesterday && completedDate < today;
      });
      const completedLastWeek = tasksWithStatus.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        const lastWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
        return completedDate >= lastWeekStart && completedDate < weekAgo;
      });

      const completionRate = tasksWithStatus.length > 0
        ? Math.round((completedTasks.length / tasksWithStatus.length) * 100)
        : 0;

      // Find most recent activity
      const lastActivity = tasksWithStatus
        .filter(t => t.completed && t.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

      userMetrics.push({
        userEmail,
        isConnected: true,
        today: completedToday.length,
        thisWeek: completedThisWeek.length,
        yesterday: completedYesterday.length,
        lastWeek: completedLastWeek.length,
        completionRate,
        totalTasks: tasksWithStatus.length,
        completedTasks: completedTasks.length,
        activePlans: new Set([...tasksWithStatus.map(t => t.bundle_id)]).size,
        lastActivity: lastActivity?.completedAt || null
      });

      // Add to recent completions (for activity feed)
      completedThisWeek.forEach(task => {
        if (task.completedAt) {
          recentCompletions.push({
            userEmail,
            taskTitle: task.title,
            bundleTitle: task.bundleTitle,
            completedAt: task.completedAt,
            taskId: task.id
          });
        }
      });

      // Add to aggregate totals
      totalCompletedToday += completedToday.length;
      totalCompletedThisWeek += completedThisWeek.length;
      totalCompletedYesterday += completedYesterday.length;
      totalCompletedLastWeek += completedLastWeek.length;
      totalTasks += tasksWithStatus.length;
      totalCompleted += completedTasks.length;
    }

    // Sort user metrics by completion rate (descending)
    userMetrics.sort((a, b) => b.completionRate - a.completionRate);

    // Find most active user
    const mostActiveUser = userMetrics.length > 0
      ? userMetrics.reduce((max, user) => 
          user.today > max.today ? user : max, 
          userMetrics[0]
        )
      : null;

    // Calculate average completion rate
    const averageCompletionRate = userMetrics.length > 0
      ? Math.round(userMetrics.reduce((sum, u) => sum + u.completionRate, 0) / userMetrics.length)
      : 0;

    // Sort recent completions by date (most recent first) and limit to 15
    recentCompletions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const activityFeed = recentCompletions.slice(0, 15);

    // Calculate trends
    const todayTrend = totalCompletedYesterday > 0
      ? Math.round(((totalCompletedToday - totalCompletedYesterday) / totalCompletedYesterday) * 100)
      : (totalCompletedToday > 0 ? 100 : 0);

    const weekTrend = totalCompletedLastWeek > 0
      ? Math.round(((totalCompletedThisWeek - totalCompletedLastWeek) / totalCompletedLastWeek) * 100)
      : (totalCompletedThisWeek > 0 ? 100 : 0);

    return res.status(200).json({
      ok: true,
      metrics: {
        aggregate: {
          completedToday: totalCompletedToday,
          completedThisWeek: totalCompletedThisWeek,
          averageCompletionRate,
          mostActiveUser: mostActiveUser ? {
            email: mostActiveUser.userEmail,
            completions: mostActiveUser.today
          } : null,
          trends: {
            today: todayTrend,
            week: weekTrend
          }
        },
        userEngagement: userMetrics,
        activityFeed
      }
    });

  } catch (error) {
    console.error('[DASHBOARD] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

