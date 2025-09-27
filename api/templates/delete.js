export const config = { runtime: 'nodejs' };

import { supabaseAdmin } from '../../lib/supabase-admin.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'DELETE') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const { plannerEmail, templateId } = req.body;

    if (!plannerEmail || !templateId) {
      return send(res, 400, { ok: false, error: 'Missing plannerEmail or templateId' });
    }

    // Delete the template
    const { error } = await supabaseAdmin
      .from('plan_templates')
      .delete()
      .eq('id', templateId)
      .eq('planner_email', plannerEmail.toLowerCase().trim());

    if (error) {
      console.error('Template deletion error:', error);
      return send(res, 500, { ok: false, error: 'Failed to delete template' });
    }

    return send(res, 200, { 
      ok: true, 
      message: 'Template deleted successfully' 
    });

  } catch (e) {
    console.error('Template deletion error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
