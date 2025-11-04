// api/test/google-tasks.js
// Simple test endpoint to verify Google Tasks API connection and data retrieval

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { getAccessTokenForUser } from '../../lib/google-tasks.js';

export default async function handler(req, res) {
  console.log('[TEST] ===== GOOGLE TASKS API TEST =====');
  
  try {
    const { plannerEmail, userEmail } = req.query;
    
    if (!plannerEmail || !userEmail) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing plannerEmail or userEmail',
        test: 'failed'
      });
    }

    console.log(`[TEST] Testing for planner: ${plannerEmail}, user: ${userEmail}`);

    // Step 1: Get user connection (using correct column names)
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email, google_access_token, google_refresh_token, google_token_expiry, google_expires_at, status')
      .eq('planner_email', plannerEmail.toLowerCase())
      .eq('user_email', userEmail.toLowerCase())
      .single();

    if (connError || !connection) {
      console.error('[TEST] No connection found:', connError);
      return res.status(200).json({
        ok: false,
        test: 'connection_check',
        error: 'No Google Tasks connection found',
        details: connError?.message || 'Connection not found'
      });
    }

    console.log('[TEST] ✓ Connection found in database');

    // Step 2: Get access token
    let accessToken;
    try {
      accessToken = await getAccessTokenForUser(userEmail.toLowerCase());
      console.log('[TEST] ✓ Access token retrieved');
    } catch (tokenError) {
      console.error('[TEST] Token error:', tokenError);
      return res.status(200).json({
        ok: false,
        test: 'token_retrieval',
        error: 'Failed to get access token',
        details: tokenError.message
      });
    }

    if (!accessToken) {
      return res.status(200).json({
        ok: false,
        test: 'token_validation',
        error: 'Access token is null/undefined'
      });
    }

    console.log('[TEST] ✓ Access token is valid');

    // Step 3: Try to fetch task lists
    const listsResponse = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listsResponse.ok) {
      const errorText = await listsResponse.text();
      console.error('[TEST] Lists API error:', errorText);
      return res.status(200).json({
        ok: false,
        test: 'fetch_task_lists',
        error: 'Failed to fetch task lists',
        status: listsResponse.status,
        statusText: listsResponse.statusText,
        details: errorText.substring(0, 500)
      });
    }

    const listsData = await listsResponse.json();
    console.log('[TEST] ✓ Task lists fetched:', listsData.items?.length || 0, 'lists');

    if (!listsData.items || listsData.items.length === 0) {
      return res.status(200).json({
        ok: true,
        test: 'success_no_lists',
        message: 'API connection works, but user has no task lists',
        tokenValid: true,
        listsCount: 0
      });
    }

    // Step 4: Get tasks from ALL lists (not just first one)
    const allLists = listsData.items;
    const allTasks = [];
    const allCompletedTasks = [];
    const listDetails = [];

    for (const list of allLists) {
      console.log(`[TEST] Fetching tasks from list: ${list.title} (${list.id})`);
      
      const tasksResponse = await fetch(
        `https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks?maxResults=100&showCompleted=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const tasks = tasksData.items || [];
        const completed = tasks.filter(t => t.status === 'completed' && t.completed);
        
        allTasks.push(...tasks);
        allCompletedTasks.push(...completed);
        listDetails.push({
          id: list.id,
          title: list.title,
          totalTasks: tasks.length,
          completedTasks: completed.length
        });
        
        console.log(`[TEST] ✓ List "${list.title}": ${tasks.length} tasks, ${completed.length} completed`);
      } else {
        const errorText = await tasksResponse.text();
        console.error(`[TEST] Error fetching tasks from ${list.title}:`, errorText.substring(0, 200));
        listDetails.push({
          id: list.id,
          title: list.title,
          error: `Failed to fetch: ${tasksResponse.status}`
        });
      }
    }

    console.log('[TEST] ✓ Total tasks across all lists:', allTasks.length);
    console.log('[TEST] ✓ Total completed tasks:', allCompletedTasks.length);

    // Return comprehensive test results
    return res.status(200).json({
      ok: true,
      test: 'full_success',
      message: 'Google Tasks API connection verified and data retrieved',
      results: {
        connectionFound: true,
        tokenValid: true,
        listsCount: listsData.items.length,
        totalTasksAcrossAllLists: allTasks.length,
        totalCompletedTasksAcrossAllLists: allCompletedTasks.length,
        listDetails: listDetails,
        sampleTasks: allTasks.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          completed: t.completed || null,
          updated: t.updated || null,
          listId: t.listId || 'unknown'
        })),
        completedTasksSample: allCompletedTasks.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          updated: t.updated,
          listId: t.listId || 'unknown'
        }))
      }
    });

  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      test: 'unexpected_error',
      error: error.message,
      stack: error.stack
    });
  }
}

