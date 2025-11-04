// api/dashboard/metrics.js
// Returns aggregate metrics, user engagement data, and recent activity for the dashboard
// Uses Google task IDs for accurate completion tracking when available

// Use Node.js runtime for better performance with Google Tasks API calls
export const config = { runtime: 'nodejs', maxDuration: 60 }; // 60 second timeout

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { getAccessTokenForUser } from '../../lib/google-tasks.js';

export default async function handler(req, res) {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const plannerEmail = url.searchParams.get('plannerEmail');

    if (!plannerEmail) {
      console.error('[DASHBOARD] Missing plannerEmail parameter');
      return res.status(400).json({ ok: false, error: 'Missing plannerEmail' });
    }

    console.log(`[DASHBOARD] ===== STARTING METRICS FETCH =====`);
    console.log(`[DASHBOARD] Planner: ${plannerEmail}`);
    console.log(`[DASHBOARD] Timestamp: ${new Date().toISOString()}`);

    // Get all users for this planner (from user_connections and invites)
    const userEmails = new Set();
    
    // Get connected users (for email list only)
    const { data: userConnectionsForEmail, error: userConnectionsError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .in('status', ['connected', 'active']);
    
    if (userConnectionsError) {
      console.error('[DASHBOARD] Error fetching user connections:', userConnectionsError);
    } else {
      (userConnectionsForEmail || []).forEach(c => {
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
    console.log(`[DASHBOARD] Found ${userEmailsArray.length} users:`, userEmailsArray.slice(0, 5));
    
    if (userEmailsArray.length === 0) {
      // Return empty metrics if no users
      return res.status(200).json({
        ok: true,
        metrics: {
          aggregate: {
            completedToday: 0,
            completedThisWeek: 0,
            averageCompletionRate: 0,
            mostActiveUser: null,
            trends: { today: 0, week: 0 }
          },
          userEngagement: [],
          activityFeed: []
        }
      });
    }
    
    // Get all assigned bundles for these users (only non-archived, non-deleted)
    // IMPORTANT: We explicitly filter for archived_at IS NULL to only get active bundles
    const { data: bundles, error: bundlesError } = await supabaseAdmin
      .from('inbox_bundles')
      .select('id, assigned_user_email, title, start_date, created_at, archived_at, deleted_at')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .in('assigned_user_email', userEmailsArray)
      .is('deleted_at', null)
      .is('archived_at', null); // Only count non-archived bundles as "active"
    
    console.log(`[DASHBOARD] Query returned ${(bundles || []).length} bundles (after filtering archived/deleted)`);
    if ((bundles || []).length > 0) {
      console.log(`[DASHBOARD] Bundle details:`, bundles.map(b => ({
        id: b.id,
        title: b.title,
        assigned_user: b.assigned_user_email,
        archived_at: b.archived_at,
        deleted_at: b.deleted_at
      })));
    }

    if (bundlesError) {
      console.error('[DASHBOARD] Error fetching bundles:', bundlesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch bundles' });
    }

    console.log(`[DASHBOARD] Found ${(bundles || []).length} bundles`);
    const bundleIds = (bundles || []).map(b => b.id);

    // If no bundles, still return user metrics (users with zero tasks)
    if (bundleIds.length === 0) {
      console.log(`[DASHBOARD] No bundles found, returning users with zero metrics`);
      
      // Build user metrics for users with no tasks
      const userMetricsNoTasks = [];
      for (const userEmail of userEmailsArray) {
        const connection = userConnections.get(userEmail);
        userMetricsNoTasks.push({
          userEmail,
          isConnected: !!connection,
          today: 0,
          thisWeek: 0,
          completionRate: 0,
          activePlans: 0,
          lastActivity: null
        });
      }

      return res.status(200).json({
        ok: true,
        metrics: {
          aggregate: {
            completedToday: 0,
            completedThisWeek: 0,
            averageCompletionRate: 0,
            mostActiveUser: null,
            trends: { today: 0, week: 0 }
          },
          userEngagement: userMetricsNoTasks,
          activityFeed: []
        }
      });
    }

    // Get all tasks for these bundles
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('inbox_tasks')
      .select('id, bundle_id, title, day_offset, google_task_id')
      .in('bundle_id', bundleIds);

    if (tasksError) {
      console.error('[DASHBOARD] Error fetching tasks:', tasksError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch tasks' });
    }

    console.log(`[DASHBOARD] Found ${(tasks || []).length} tasks`);

    // Get user connections for Google Tasks API access
    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email, google_access_token, google_refresh_token, status')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .eq('status', 'connected')
      .in('user_email', userEmailsArray);

    if (connectionsError) {
      console.error('[DASHBOARD] Error fetching connections for API access:', connectionsError);
    }

    // Build user lookup map
    const userConnections = new Map();
    (connections || []).forEach(conn => {
      userConnections.set(conn.user_email.toLowerCase(), conn);
    });

    // Build bundle lookup map - only include non-archived bundles
    const bundleMap = new Map();
    (bundles || []).forEach(bundle => {
      // Only include bundles that are not archived
      if (!bundle.archived_at) {
        bundleMap.set(bundle.id, bundle);
      }
    });

    console.log(`[DASHBOARD] Bundle map has ${bundleMap.size} active (non-archived) bundles out of ${(bundles || []).length} total`);

    // Group tasks by user - only tasks from active bundles
    const tasksByUser = new Map();
    (tasks || []).forEach(task => {
      const bundle = bundleMap.get(task.bundle_id);
      // Only include tasks from active (non-archived) bundles
      if (!bundle || !bundle.assigned_user_email) return;
      
      const userEmail = bundle.assigned_user_email.toLowerCase();
      if (!tasksByUser.has(userEmail)) {
        tasksByUser.set(userEmail, []);
      }
      tasksByUser.get(userEmail).push({
        ...task,
        bundleTitle: bundle.title,
        bundleCreatedAt: bundle.created_at,
        bundleId: bundle.id
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

    console.log(`[DASHBOARD] Processing ${tasksByUser.size} users with tasks`);
    
    // Process each user
    for (const [userEmail, userTasks] of tasksByUser.entries()) {
      console.log(`[DASHBOARD] Processing user ${userEmail} with ${userTasks.length} tasks`);
      const connection = userConnections.get(userEmail);
      
      if (!connection) {
        // No connection - still add user with zero metrics
        console.log(`[DASHBOARD] User ${userEmail} has no connection, adding with zero metrics`);
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
              // Google Tasks returns completed date as ISO string (e.g., "2025-11-04T17:30:00.000Z")
              let completedDate = null;
              if (gt.completed) {
                try {
                  completedDate = new Date(gt.completed);
                  // Validate the date is valid
                  if (isNaN(completedDate.getTime())) {
                    console.error(`[DASHBOARD] Invalid completed date for task ${gt.id}: ${gt.completed}`);
                    completedDate = null;
                  }
                } catch (e) {
                  console.error(`[DASHBOARD] Error parsing completed date for task ${gt.id}:`, e);
                  completedDate = null;
                }
              }
              
              allGoogleTasks.set(gt.id, {
                status: gt.status,
                completed: completedDate,
                title: gt.title,
                // Store raw data for debugging
                _raw: { status: gt.status, completed: gt.completed, title: gt.title }
              });
            });
          }
        } catch (error) {
          console.error(`[DASHBOARD] Error fetching tasks from list ${taskList.id}:`, error);
        }
      }

      console.log(`[DASHBOARD] Fetched ${allGoogleTasks.size} tasks from Google Tasks for ${userEmail}`);
      console.log(`[DASHBOARD] User has ${userTasks.length} tasks in database, ${userTasks.filter(t => t.google_task_id).length} have google_task_id`);

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
                if (completed) {
                  console.log(`[DASHBOARD] Task ${task.id} (${task.title}) is completed via task ID`);
                }
              } else {
                console.log(`[DASHBOARD] Task ${task.id} has google_task_id ${task.google_task_id} but not found in Google Tasks`);
              }
            } else {
              // Fallback: search by title (for older tasks without stored IDs)
              // Match by title from our fetched tasks - try exact match first, then partial
              const exactMatches = Array.from(allGoogleTasks.entries())
                .filter(([id, gt]) => gt.title === task.title);
              
              const completedMatches = exactMatches.filter(([id, gt]) => gt.status === 'completed');
              
              if (completedMatches.length > 0) {
                completed = true;
                completedAt = completedMatches[0][1].completed;
                console.log(`[DASHBOARD] Task ${task.id} (${task.title}) is completed via title match`);
              } else if (exactMatches.length > 0) {
                // Task exists but not completed
                console.log(`[DASHBOARD] Task ${task.id} (${task.title}) found in Google Tasks but not completed`);
              } else {
                // No match found - try partial match
                const partialMatches = Array.from(allGoogleTasks.entries())
                  .filter(([id, gt]) => gt.title.toLowerCase().includes(task.title.toLowerCase()) || 
                                         task.title.toLowerCase().includes(gt.title.toLowerCase()));
                
                if (partialMatches.length > 0) {
                  const completedPartial = partialMatches.filter(([id, gt]) => gt.status === 'completed');
                  if (completedPartial.length > 0) {
                    completed = true;
                    completedAt = completedPartial[0][1].completed;
                    console.log(`[DASHBOARD] Task ${task.id} (${task.title}) is completed via partial title match`);
                  }
                }
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
      console.log(`[DASHBOARD] User ${userEmail}: ${completedTasks.length} completed tasks out of ${tasksWithStatus.length} total`);
      
      const completedToday = tasksWithStatus.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        // completedAt is already a Date object from our map
        const completedDate = t.completedAt instanceof Date ? t.completedAt : new Date(t.completedAt);
        if (isNaN(completedDate.getTime())) {
          console.error(`[DASHBOARD] Invalid completedAt date for task ${t.id}: ${t.completedAt}`);
          return false;
        }
        const isToday = completedDate >= today;
        if (isToday) {
          console.log(`[DASHBOARD] Task completed today: ${t.title} at ${completedDate.toISOString()}, today threshold: ${today.toISOString()}`);
        }
        return isToday;
      });
      const completedThisWeek = tasksWithStatus.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completedDate = t.completedAt instanceof Date ? t.completedAt : new Date(t.completedAt);
        if (isNaN(completedDate.getTime())) return false;
        return completedDate >= weekAgo;
      });
      
      console.log(`[DASHBOARD] User ${userEmail}: ${completedToday.length} today, ${completedThisWeek.length} this week`);
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

      // Count unique bundle IDs from active tasks (only non-archived bundles)
      // Double-check that each bundle is still in our active bundleMap
      const activeBundleIds = new Set();
      tasksWithStatus.forEach(task => {
        const bundleId = task.bundleId || task.bundle_id;
        if (bundleId && bundleMap.has(bundleId)) {
          // Only count if bundle is still in our active bundle map
          activeBundleIds.add(bundleId);
        }
      });
      
      console.log(`[DASHBOARD] User ${userEmail}: ${tasksWithStatus.length} tasks, ${activeBundleIds.size} active bundles (from ${tasksWithStatus.length} tasks)`);
      console.log(`[DASHBOARD] Active bundle IDs for ${userEmail}:`, Array.from(activeBundleIds));
      
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
        activePlans: activeBundleIds.size,
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

    console.log(`[DASHBOARD] Metrics calculated: ${userMetrics.length} users, ${totalCompletedToday} today, ${totalCompletedThisWeek} this week, ${activityFeed.length} recent completions`);

    // Calculate trends
    const todayTrend = totalCompletedYesterday > 0
      ? Math.round(((totalCompletedToday - totalCompletedYesterday) / totalCompletedYesterday) * 100)
      : (totalCompletedToday > 0 ? 100 : 0);

    const weekTrend = totalCompletedLastWeek > 0
      ? Math.round(((totalCompletedThisWeek - totalCompletedLastWeek) / totalCompletedLastWeek) * 100)
      : (totalCompletedThisWeek > 0 ? 100 : 0);

    const response = {
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
    };

    console.log(`[DASHBOARD] ===== METRICS CALCULATED =====`);
    console.log(`[DASHBOARD] Aggregate:`, JSON.stringify(response.metrics.aggregate, null, 2));
    console.log(`[DASHBOARD] User Engagement: ${response.metrics.userEngagement.length} users`);
    console.log(`[DASHBOARD] Activity Feed: ${response.metrics.activityFeed.length} items`);
    if (response.metrics.userEngagement.length > 0) {
      console.log(`[DASHBOARD] User details:`, response.metrics.userEngagement.map(u => ({
        email: u.userEmail,
        today: u.today,
        thisWeek: u.thisWeek,
        completionRate: u.completionRate,
        activePlans: u.activePlans,
        isConnected: u.isConnected
      })));
    }
    console.log(`[DASHBOARD] ===== END METRICS FETCH =====`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('[DASHBOARD] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

