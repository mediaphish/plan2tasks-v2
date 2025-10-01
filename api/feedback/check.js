export const config = { runtime: 'nodejs' };

import { supabaseAdmin } from '../../lib/supabase-admin.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const { plannerEmail, bundleId } = req.body;

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
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_email', bundle.assigned_user_email)
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .eq('status', 'connected')
      .single();

    if (connectionError || !connection) {
      return send(res, 200, { 
        ok: true, 
        message: 'No Google Tasks connection found',
        feedback: { status: 'no_connection' }
      });
    }

    // TODO: Implement Google Tasks API checking
    // For now, just return success
    return send(res, 200, { 
      ok: true, 
      message: 'Feedback check completed',
      feedback: { 
        status: 'pending',
        last_checked: new Date().toISOString()
      }
    });

  } catch (e) {
    console.error('Feedback check error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
