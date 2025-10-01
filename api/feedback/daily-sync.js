export const config = { 
  runtime: 'nodejs',
  // Run daily at 2 AM UTC (late night in most timezones)
  schedule: '0 2 * * *'
};

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { GoogleTasksFeedback } from '../../lib/google-tasks-feedback.js';

export default async function handler(req, res) {
  try {
    console.log('Starting daily feedback sync...');
    
    // Get all active bundles from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: bundles, error: bundlesError } = await supabaseAdmin
      .from('inbox_bundles')
      .select('id, planner_email, assigned_user_email, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('assigned_at', 'is', null)
      .is('archived_at', null);

    if (bundlesError) {
      console.error('Error fetching bundles:', bundlesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch bundles' });
    }

    console.log(`Found ${bundles?.length || 0} bundles to check`);

    // For each bundle, check feedback status
    const results = [];
    for (const bundle of bundles || []) {
      try {
        // Check if user has Google Tasks connection
        const { data: connection } = await supabaseAdmin
          .from('user_connections')
          .select('*')
          .eq('user_email', bundle.assigned_user_email)
          .eq('planner_email', bundle.planner_email)
          .eq('status', 'connected')
          .single();

        if (connection) {
          console.log(`Checking feedback for bundle ${bundle.id} (user: ${bundle.assigned_user_email})`);
          
          try {
            // Get bundle tasks from inbox_tasks table
            const { data: tasks } = await supabaseAdmin
              .from('inbox_tasks')
              .select('title')
              .eq('bundle_id', bundle.id);

            if (tasks && tasks.length > 0) {
              const taskResults = [];

              // Initialize Google Tasks API
              const googleTasks = new GoogleTasksFeedback(connection.access_token);

              // Check each task
              for (const task of tasks) {
                try {
                  const completion = await googleTasks.checkTaskCompletion(task.title);
                  taskResults.push({
                    taskTitle: task.title,
                    found: completion.found,
                    completed: completion.completed,
                    status: completion.status
                  });
                } catch (taskError) {
                  console.error(`Error checking task "${task.title}":`, taskError);
                  taskResults.push({
                    taskTitle: task.title,
                    error: taskError.message,
                    status: 'error'
                  });
                }
              }

              results.push({
                bundleId: bundle.id,
                userEmail: bundle.assigned_user_email,
                status: 'checked',
                hasConnection: true,
                taskResults: taskResults,
                totalTasks: tasks.length,
                completedTasks: taskResults.filter(t => t.completed).length
              });
            } else {
              results.push({
                bundleId: bundle.id,
                userEmail: bundle.assigned_user_email,
                status: 'no_tasks',
                hasConnection: true
              });
            }
          } catch (apiError) {
            console.error(`Error checking Google Tasks for bundle ${bundle.id}:`, apiError);
            results.push({
              bundleId: bundle.id,
              userEmail: bundle.assigned_user_email,
              status: 'api_error',
              hasConnection: true,
              error: apiError.message
            });
          }
        } else {
          results.push({
            bundleId: bundle.id,
            userEmail: bundle.assigned_user_email,
            status: 'no_connection',
            hasConnection: false
          });
        }
      } catch (error) {
        console.error(`Error checking bundle ${bundle.id}:`, error);
        results.push({
          bundleId: bundle.id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('Daily feedback sync completed:', results);
    return res.status(200).json({ 
      ok: true, 
      message: 'Daily feedback sync completed',
      results: results.length,
      details: results
    });

  } catch (e) {
    console.error('Daily feedback sync error:', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
