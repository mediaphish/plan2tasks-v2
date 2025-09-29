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
      .from('plan_bundles')
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

    // For now, return basic status
    // TODO: Add actual feedback data when we implement Google Tasks API checking
    return send(res, 200, {
      ok: true,
      feedback: {
        bundleId: bundleId,
        userEmail: bundle.assigned_user_email,
        hasConnection: !!connection,
        status: connection ? 'monitoring' : 'no_connection',
        lastChecked: new Date().toISOString(),
        // TODO: Add actual task completion data
        tasksCompleted: 0,
        totalTasks: bundle.tasks?.length || 0
      }
    });

  } catch (e) {
    console.error('Feedback status error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
