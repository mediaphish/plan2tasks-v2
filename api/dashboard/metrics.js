// api/dashboard/metrics.js
// Returns aggregate metrics, user engagement data, and recent activity for the dashboard
// Uses Google task IDs for accurate completion tracking when available

// Use Node.js runtime for better performance with Google Tasks API calls
export const config = { runtime: 'nodejs', maxDuration: 60 }; // 60 second timeout

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { getAccessTokenForUser } from '../../lib/google-tasks.js';

export default async function handler(req, res) {
  // Log immediately when handler is called
  console.log(`[DASHBOARD] ===== HANDLER CALLED =====`);
  console.log(`[DASHBOARD] Method: ${req.method}`);
  console.log(`[DASHBOARD] URL: ${req.url}`);
  console.log(`[DASHBOARD] Timestamp: ${new Date().toISOString()}`);
  
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    console.error(`[DASHBOARD] Wrong method: ${req.method}`);
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
    // IMPORTANT: Exclude the planner email from the user list
    const plannerEmailLower = plannerEmail.toLowerCase().trim();
    const userEmails = new Set();
    
    // Get connected users (for email list only)
    const { data: userConnectionsForEmail, error: userConnectionsError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email')
      .eq('planner_email', plannerEmailLower)
      .in('status', ['connected', 'active']);
    
    if (userConnectionsError) {
      console.error('[DASHBOARD] Error fetching user connections:', userConnectionsError);
    } else {
      (userConnectionsForEmail || []).forEach(c => {
        const email = c.user_email?.toLowerCase().trim();
        // Exclude planner email from user list
        if (email && email !== plannerEmailLower) {
          userEmails.add(email);
        }
      });
    }
    
    // Get invited users (pending)
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('invites')
      .select('user_email')
      .eq('planner_email', plannerEmailLower)
      .is('used_at', null);
    
    if (invitesError) {
      console.error('[DASHBOARD] Error fetching invites:', invitesError);
    } else {
      (invites || []).forEach(inv => {
        const email = inv.user_email?.toLowerCase().trim();
        // Exclude planner email from user list
        if (email && email !== plannerEmailLower) {
          userEmails.add(email);
        }
      });
    }
    
    const userEmailsArray = Array.from(userEmails);
    console.log(`[DASHBOARD] Found ${userEmailsArray.length} users (excluding planner ${plannerEmailLower})`);
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
    
    // DIAGNOSTIC: First, let's see ALL plans (including archived) to understand the data
    // This will help us see if archiving is working
    const { data: allPlansDiagnostic, error: diagnosticError } = await supabaseAdmin
      .from('history_plans')
      .select('id, user_email, title, archived_at, pushed_at')
      .eq('planner_email', plannerEmailLower)
      .in('user_email', userEmailsArray)
      .order('pushed_at', { ascending: false });
    
    if (!diagnosticError && allPlansDiagnostic) {
      const totalPlans = allPlansDiagnostic.length;
      const archivedPlans = allPlansDiagnostic.filter(p => {
        const archived = p.archived_at !== null && p.archived_at !== undefined && p.archived_at !== '';
        return archived;
      });
      const activePlans = allPlansDiagnostic.filter(p => {
        const active = p.archived_at === null || p.archived_at === undefined || p.archived_at === '';
        return active;
      });
      
      console.log(`[DASHBOARD] ===== DIAGNOSTIC =====`);
      console.log(`[DASHBOARD] Total plans: ${totalPlans}`);
      console.log(`[DASHBOARD] Active plans (archived_at IS NULL): ${activePlans.length}`);
      console.log(`[DASHBOARD] Archived plans (archived_at IS NOT NULL): ${archivedPlans.length}`);
      
      if (archivedPlans.length > 0) {
        console.log(`[DASHBOARD] Sample archived plans:`, archivedPlans.slice(0, 3).map(p => ({ 
          id: p.id, 
          title: p.title.substring(0, 40),
          archived_at: p.archived_at,
          user: p.user_email
        })));
      }
      
      if (activePlans.length > 0) {
        console.log(`[DASHBOARD] Sample active plans:`, activePlans.slice(0, 5).map(p => ({ 
          id: p.id, 
          title: p.title.substring(0, 40),
          archived_at: p.archived_at,
          user: p.user_email
        })));
      }
      console.log(`[DASHBOARD] ===== END DIAGNOSTIC =====`);
    }
    
    // Get all ACTIVE plans from history_plans (archived plans should NOT appear in dashboard)
    // Note: inbox_bundles is no longer used - all plans go through history_plans
    // IMPORTANT: Only show non-archived plans in dashboard. Archived plans are visible in History tab.
    // 
    // Query with explicit filter for archived_at IS NULL
    // Using the same pattern as api/history/list.js which correctly filters active plans
    const { data: historyPlans, error: historyError } = await supabaseAdmin
      .from('history_plans')
      .select('id, user_email, title, start_date, pushed_at, archived_at')
      .eq('planner_email', plannerEmailLower)
      .in('user_email', userEmailsArray)
      .is('archived_at', null); // CRITICAL: Only active plans where archived_at IS NULL
    
    console.log(`[DASHBOARD] Querying history_plans for ${userEmailsArray.length} users (planner: ${plannerEmailLower})`);
    console.log(`[DASHBOARD] Query returned ${(historyPlans || []).length} plans (filtered: archived_at IS NULL)`);
    
    // Defensive check: verify no archived plans slipped through the query filter
    const plansWithArchived = (historyPlans || []).filter(p => {
      const hasArchived = p.archived_at !== null && p.archived_at !== undefined && p.archived_at !== '';
      return hasArchived;
    });
    if (plansWithArchived.length > 0) {
      console.error(`[DASHBOARD] ERROR: Query returned ${plansWithArchived.length} plans with archived_at set!`);
      console.error(`[DASHBOARD] Sample archived plans:`, plansWithArchived.slice(0, 3).map(p => ({
        id: p.id,
        title: p.title,
        archived_at: p.archived_at,
        archived_at_type: typeof p.archived_at
      })));
    }
    
    if (historyError) {
      console.error('[DASHBOARD] Error fetching history_plans:', historyError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
    }
    
    // Map history_plans to match bundle structure for consistency
    // CRITICAL: Only include plans where archived_at IS NULL (already filtered by query, but double-check)
    let bundles = (historyPlans || []).map(p => ({
      id: p.id,
      assigned_user_email: p.user_email,
      title: p.title,
      start_date: p.start_date,
      created_at: p.pushed_at,
      archived_at: p.archived_at,
      deleted_at: null,
      source: 'history'
    }));
    
    // Double-check: filter out any plans that somehow have archived_at set (defensive check)
    // Handle null, undefined, and empty string cases
    const beforeFilterCount = bundles.length;
    bundles = bundles.filter(b => {
      const isArchived = b.archived_at !== null && b.archived_at !== undefined && b.archived_at !== '';
      return !isArchived;
    });
    if (bundles.length !== beforeFilterCount) {
      console.warn(`[DASHBOARD] WARNING: Filtered out ${beforeFilterCount - bundles.length} archived plans that shouldn't have been in query`);
      console.warn(`[DASHBOARD] Filtered bundles had archived_at:`, 
        bundles.slice(0, 3).map(b => ({ id: b.id, archived_at: b.archived_at }))
      );
    }
    console.log(`[DASHBOARD] After defensive filtering: ${bundles.length} active bundles`);
    
    console.log(`[DASHBOARD] Total active plans: ${bundles.length}`);
    if (bundles.length > 0) {
      console.log(`[DASHBOARD] Active plan details (first 5):`, bundles.slice(0, 5).map(b => ({
        id: b.id,
        title: b.title,
        assigned_user: b.assigned_user_email,
        archived_at: b.archived_at // Should be null for all active plans
      })));
    }


    console.log(`[DASHBOARD] Found ${(bundles || []).length} bundles`);
    const bundleIds = (bundles || []).map(b => b.id);

    // Get user connections for Google Tasks API access (needed for both early return and main flow)
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

    // Get all tasks from history_items (all plans use history_items)
    const planIds = bundles.map(b => b.id);
    
    let tasks = [];
    if (planIds.length > 0) {
      // First check if google_task_id column exists
      const { data: testItem, error: testError } = await supabaseAdmin
        .from('history_items')
        .select('id, google_task_id')
        .limit(1);
      
      const hasGoogleTaskIdColumn = !testError && testItem;
      
      // Select google_task_id if column exists
      const selectFields = hasGoogleTaskIdColumn 
        ? 'id, plan_id, title, day_offset, google_task_id'
        : 'id, plan_id, title, day_offset';
      
      const { data: historyItems, error: historyItemsError } = await supabaseAdmin
        .from('history_items')
        .select(selectFields)
        .in('plan_id', planIds);
      
      if (historyItemsError) {
        console.error('[DASHBOARD] Error fetching history_items:', historyItemsError);
        return res.status(500).json({ ok: false, error: 'Failed to fetch tasks' });
      }
      
      // Map history_items to match expected structure
      tasks = (historyItems || []).map(item => ({
        id: item.id,
        bundle_id: item.plan_id, // Use plan_id as bundle_id for grouping
        title: item.title,
        day_offset: item.day_offset || 0,
        google_task_id: item.google_task_id || null // Include google_task_id if available
      }));
      
      console.log(`[DASHBOARD] Fetched ${tasks.length} tasks, ${tasks.filter(t => t.google_task_id).length} have google_task_id`);
    }

    console.log(`[DASHBOARD] Found ${(tasks || []).length} tasks`);

    // Note: userConnections Map is already built above (before the early return check)

    // Build bundle lookup map - include ALL bundles for task lookup
    // All bundles are already filtered to active only (archived_at IS NULL)
    // So bundleMap only contains active bundles
    const bundleMap = new Map();
    (bundles || []).forEach(bundle => {
      bundleMap.set(bundle.id, bundle);
    });

    console.log(`[DASHBOARD] Bundle map has ${bundleMap.size} active bundles (all non-archived)`);

    // Group tasks by user - include tasks from ALL bundles (active and archived) for completion tracking
    const tasksByUser = new Map();
    (tasks || []).forEach(task => {
      const bundle = bundleMap.get(task.bundle_id);
      if (!bundle || !bundle.assigned_user_email) return;
      
      const userEmail = bundle.assigned_user_email.toLowerCase();
      // Exclude planner email
      if (userEmail === plannerEmailLower) return;
      
      if (!tasksByUser.has(userEmail)) {
        tasksByUser.set(userEmail, []);
      }
      tasksByUser.get(userEmail).push({
        ...task,
        bundleTitle: bundle.title,
        bundleCreatedAt: bundle.created_at,
        bundleId: bundle.id,
        bundleArchived: !!bundle.archived_at // Track if bundle is archived
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
      
      // Fetch tasks from all lists with pagination
      for (const taskList of allTaskLists) {
        try {
          let allTasksFromList = [];
          let pageToken = null;
          let fetchCount = 0;
          const maxFetches = 10; // Safety limit to prevent infinite loops
          
          // Paginate through all tasks in this list
          do {
            const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskList.id)}/tasks`);
            url.searchParams.set('maxResults', '100');
            url.searchParams.set('showCompleted', 'true');
            url.searchParams.set('showHidden', 'true'); // Include hidden tasks (completed tasks are often hidden)
            if (pageToken) {
              url.searchParams.set('pageToken', pageToken);
            }
            
            const tasksResponse = await fetch(url.toString(), {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              allTasksFromList = allTasksFromList.concat(tasksData.items || []);
              pageToken = tasksData.nextPageToken || null;
              fetchCount++;
              console.log(`[DASHBOARD] Fetched ${tasksData.items?.length || 0} tasks from list "${taskList.title}" (page ${fetchCount}, hasMore: ${!!pageToken})`);
            } else {
              const errorText = await tasksResponse.text();
              console.error(`[DASHBOARD] Error fetching tasks from list ${taskList.id}:`, errorText);
              break;
            }
          } while (pageToken && fetchCount < maxFetches);
          
          console.log(`[DASHBOARD] Total fetched ${allTasksFromList.length} tasks from list "${taskList.title}"`);
          
          // Log raw task data from Google to see what we're actually getting
          if (allTasksFromList.length > 0) {
            console.log(`[DASHBOARD] Raw Google Tasks data from "${taskList.title}" (first 3):`, allTasksFromList.slice(0, 3).map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              completed: t.completed,
              hidden: t.hidden,
              deleted: t.deleted,
              updated: t.updated
            })));
          }
          
          allTasksFromList.forEach(gt => {
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
            
            // Check if task is actually completed - Google Tasks marks completed tasks as:
            // 1. status === 'completed' (primary indicator)
            // 2. OR completed field exists (alternative indicator)
            const isCompleted = gt.status === 'completed' || (gt.completed != null && gt.completed !== '');
            
            // Log each task for debugging
            if (isCompleted) {
              console.log(`[DASHBOARD] ✅ Found COMPLETED task in Google: "${gt.title}" (id: ${gt.id}, status: ${gt.status}, completed: ${gt.completed})`);
            }
            
            allGoogleTasks.set(gt.id, {
              status: gt.status,
              completed: completedDate,
              title: gt.title,
              isCompleted: isCompleted, // Explicit completion flag
              // Store raw data for debugging
              _raw: { status: gt.status, completed: gt.completed, title: gt.title }
            });
          });
        } catch (error) {
          console.error(`[DASHBOARD] Error fetching tasks from list ${taskList.id}:`, error);
        }
      }

      console.log(`[DASHBOARD] Fetched ${allGoogleTasks.size} tasks from Google Tasks for ${userEmail}`);
      console.log(`[DASHBOARD] User has ${userTasks.length} tasks in database, ${userTasks.filter(t => t.google_task_id).length} have google_task_id`);
      
      // Count completed tasks in Google Tasks
      const completedInGoogle = Array.from(allGoogleTasks.values()).filter(t => 
        t.isCompleted || t.status === 'completed' || (t.completed && t.completed !== null)
      );
      console.log(`[DASHBOARD] Google Tasks shows ${completedInGoogle.length} completed tasks out of ${allGoogleTasks.size} total`);
      if (completedInGoogle.length > 0) {
        console.log(`[DASHBOARD] Sample completed tasks from Google:`, completedInGoogle.slice(0, 5).map(t => ({
          title: t.title,
          status: t.status,
          completed: t.completed?.toISOString(),
          id: Array.from(allGoogleTasks.entries()).find(([id, task]) => task === t)?.[0]
        })));
      }
      
      // Log sample of Google Tasks for debugging
      if (allGoogleTasks.size > 0) {
        const sampleTasks = Array.from(allGoogleTasks.entries()).slice(0, 5);
        console.log(`[DASHBOARD] Sample Google Tasks for ${userEmail}:`, sampleTasks.map(([id, task]) => ({
          id,
          title: task.title,
          status: task.status,
          completed: task.completed?.toISOString()
        })));
      }
      
      // Log sample of database tasks for debugging
      if (userTasks.length > 0) {
        console.log(`[DASHBOARD] Sample database tasks for ${userEmail}:`, userTasks.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          google_task_id: t.google_task_id,
          bundleTitle: t.bundleTitle
        })));
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
                // Use explicit isCompleted flag OR check both status and completed field
                completed = googleTask.isCompleted || googleTask.status === 'completed' || (googleTask.completed && googleTask.completed !== null);
                completedAt = googleTask.completed;
                if (completed) {
                  console.log(`[DASHBOARD] ✅ Task ${task.id} (${task.title}) is COMPLETED via task ID - status: ${googleTask.status}, completed: ${googleTask.completed?.toISOString()}`);
                } else {
                  console.log(`[DASHBOARD] ⚠️ Task ${task.id} (${task.title}) has ID but NOT completed - status: ${googleTask.status}, completed: ${googleTask.completed?.toISOString() || 'null'}`);
                }
              } else {
                console.log(`[DASHBOARD] ❌ Task ${task.id} has google_task_id ${task.google_task_id} but NOT FOUND in Google Tasks`);
                console.log(`[DASHBOARD] Available Google Task IDs (first 10):`, Array.from(allGoogleTasks.keys()).slice(0, 10));
              }
            } else {
              // Fallback: search by title (for older tasks without stored IDs)
              // Match by title from our fetched tasks - try exact match first, then partial
              console.log(`[DASHBOARD] Task ${task.id} (${task.title}) has no google_task_id, trying title match`);
              
              const exactMatches = Array.from(allGoogleTasks.entries())
                .filter(([id, gt]) => gt.title === task.title);
              
              console.log(`[DASHBOARD] Found ${exactMatches.length} exact title matches for "${task.title}"`);
              
              // Check completion using same logic as task ID lookup
              const completedMatches = exactMatches.filter(([id, gt]) => 
                gt.isCompleted || gt.status === 'completed' || (gt.completed && gt.completed !== null)
              );
              
              if (completedMatches.length > 0) {
                completed = true;
                completedAt = completedMatches[0][1].completed;
                console.log(`[DASHBOARD] ✅ Task ${task.id} (${task.title}) is COMPLETED via exact title match at ${completedAt?.toISOString()}`);
                console.log(`[DASHBOARD]   Match details: status=${completedMatches[0][1].status}, completed=${completedMatches[0][1].completed?.toISOString()}, isCompleted=${completedMatches[0][1].isCompleted}`);
              } else if (exactMatches.length > 0) {
                // Task exists but not completed
                const match = exactMatches[0][1];
                console.log(`[DASHBOARD] ⚠️ Task ${task.id} (${task.title}) found in Google Tasks but NOT completed`);
                console.log(`[DASHBOARD]   Match details: status=${match.status}, completed=${match.completed?.toISOString() || 'null'}, isCompleted=${match.isCompleted}`);
              } else {
                // No exact match found - try partial match
                console.log(`[DASHBOARD] No exact match for "${task.title}", trying partial match...`);
                const partialMatches = Array.from(allGoogleTasks.entries())
                  .filter(([id, gt]) => {
                    const dbTitle = task.title.toLowerCase().trim();
                    const gtTitle = gt.title.toLowerCase().trim();
                    return gtTitle.includes(dbTitle) || dbTitle.includes(gtTitle);
                  });
                
                console.log(`[DASHBOARD] Found ${partialMatches.length} partial title matches for "${task.title}"`);
                
                if (partialMatches.length > 0) {
                  // Check completion using same logic
                  const completedPartial = partialMatches.filter(([id, gt]) => 
                    gt.isCompleted || gt.status === 'completed' || (gt.completed && gt.completed !== null)
                  );
                  if (completedPartial.length > 0) {
                    completed = true;
                    completedAt = completedPartial[0][1].completed;
                    console.log(`[DASHBOARD] ✅ Task ${task.id} (${task.title}) is COMPLETED via partial title match at ${completedAt?.toISOString()}`);
                  } else {
                    console.log(`[DASHBOARD] ⚠️ Found ${partialMatches.length} partial matches but NONE are completed`);
                    console.log(`[DASHBOARD]   Sample match statuses:`, partialMatches.slice(0, 3).map(([id, gt]) => ({
                      title: gt.title,
                      status: gt.status,
                      completed: gt.completed?.toISOString(),
                      isCompleted: gt.isCompleted
                    })));
                  }
                } else {
                  console.log(`[DASHBOARD] ❌ No matches found for task "${task.title}" in Google Tasks`);
                  // Log all Google task titles for debugging
                  if (allGoogleTasks.size > 0 && allGoogleTasks.size < 50) {
                    const allTitles = Array.from(allGoogleTasks.values()).map(t => t.title);
                    console.log(`[DASHBOARD] Available Google Tasks titles:`, allTitles);
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
        // Compare dates at midnight (ignore time) - task is "today" if completed date >= today midnight
        const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isToday = completedDateOnly.getTime() === todayDateOnly.getTime();
        if (isToday) {
          console.log(`[DASHBOARD] ✅ Task completed TODAY: ${t.title} at ${completedDate.toISOString()}`);
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

      // Count unique bundle IDs - ONLY count bundles that exist in our filtered active bundles
      // This ensures we don't count archived bundles even if they have tasks
      const activeBundleIds = new Set();
      tasksWithStatus.forEach(task => {
        const bundleId = task.bundleId || task.bundle_id;
        if (bundleId && bundleMap.has(bundleId)) {
          // bundleMap only contains active bundles (already filtered), so if it exists, it's active
          activeBundleIds.add(bundleId);
        }
      });
      
      console.log(`[DASHBOARD] User ${userEmail}: ${tasksWithStatus.length} tasks, ${activeBundleIds.size} active bundles`);
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
    console.error('[DASHBOARD] ===== ERROR CAUGHT =====');
    console.error('[DASHBOARD] Error message:', error.message);
    console.error('[DASHBOARD] Error stack:', error.stack);
    console.error('[DASHBOARD] Error name:', error.name);
    console.error('[DASHBOARD] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
}

