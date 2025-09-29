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

    const { plannerEmail, name, description, tasks, tags } = req.body;

    // Validation
    if (!plannerEmail || !plannerEmail.includes('@')) {
      return send(res, 400, { ok: false, error: 'Invalid plannerEmail' });
    }
    if (!name || !name.trim()) {
      return send(res, 400, { ok: false, error: 'Template name is required' });
    }
    if (!description || !description.trim()) {
      return send(res, 400, { ok: false, error: 'Template description is required' });
    }
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return send(res, 400, { ok: false, error: 'At least one task is required' });
    }

    // Save template to database
    const { data, error } = await supabaseAdmin
      .from('plan_templates')
      .insert({
        planner_email: plannerEmail.toLowerCase().trim(),
        name: name.trim(),
        description: description.trim(),
        tasks: tasks,
        tags: tags || []
      })
      .select('id, name, created_at')
      .single();

    if (error) {
      console.error('Template save error:', error);
      return send(res, 500, { ok: false, error: 'Failed to save template' });
    }

    return send(res, 200, { 
      ok: true, 
      template: data,
      message: 'Template saved successfully'
    });

  } catch (e) {
    console.error('Template save error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
