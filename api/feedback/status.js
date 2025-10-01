export const config = { runtime: 'nodejs' };

import { supabaseAdmin } from '../../lib/supabase-admin.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const plannerEmail = url.searchParams.get('plannerEmail');
    const bundleId = url.searchParams.get('bundleId');

    if (!plannerEmail || !bundleId) {
      return send(res, 400, { ok: false, error: 'Missing plannerEmail or bundleId' });
    }

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabaseAdmin
      .from('inbox_bundles')
      .select('*')
      .eq('id', bundleId)
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .single();

    if (bundleError || !bundle) {
      return send(res, 404, { ok: false, error: 'Bundle not found' });
    }

    // Check if user has Google Tasks connection
    const { data: connection } = await supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_email', bundle.assigned_user_email)
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .eq('status', 'connected')
      .single();

    // Get tasks from inbox_tasks table
    const { data: tasks } = await supabaseAdmin
      .from('inbox_tasks')
      .select('title')
      .eq('bundle_id', bundleId);

    // Check actual task completion if connection exists
    let taskCompletionData = {
      tasksCompleted: 0,
      totalTasks: tasks?.length || 0,
      taskDetails: []
    };

    if (connection && tasks && tasks.length > 0) {
      try {
        const { GoogleTasksFeedback } = await import('../../lib/google-tasks-feedback.js');
        const googleTasks = new GoogleTasksFeedback(connection.access_token);
        
        const taskResults = [];
        for (const task of tasks) {
          try {
            const completion = await googleTasks.checkTaskCompletion(task.title);
            taskResults.push({
              title: task.title,
              found: completion.found,
              completed: completion.completed,
              status: completion.status
            });
          } catch (taskError) {
            taskResults.push({
              title: task.title,
              error: taskError.message,
              status: 'error'
            });
          }
        }

        taskCompletionData = {
          tasksCompleted: taskResults.filter(t => t.completed).length,
          totalTasks: tasks.length,
          taskDetails: taskResults
        };
      } catch (apiError) {
        console.error('Error checking Google Tasks:', apiError);
        taskCompletionData.error = apiError.message;
      }
    }

    return send(res, 200, {
      ok: true,
      feedback: {
        bundleId: bundleId,
        userEmail: bundle.assigned_user_email,
        hasConnection: !!connection,
        status: connection ? 'monitoring' : 'no_connection',
        lastChecked: new Date().toISOString(),
        ...taskCompletionData
      }
    });

  } catch (e) {
    console.error('Feedback status error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
