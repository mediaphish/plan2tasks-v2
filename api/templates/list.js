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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25')));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (!plannerEmail || !plannerEmail.includes('@')) {
      return send(res, 400, { ok: false, error: 'Invalid plannerEmail' });
    }

    // Get templates for this planner
    const { data, error, count } = await supabaseAdmin
      .from('plan_templates')
      .select('id, name, description, tasks, created_at', { count: 'exact' })
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Template list error:', error);
      return send(res, 500, { ok: false, error: 'Failed to fetch templates' });
    }

    const templates = (data || []).map(t => ({
      id: t.id,
      title: t.name,
      description: t.description,
      tasks: t.tasks || [],
      tags: t.tags || [],
      itemsCount: Array.isArray(t.tasks) ? t.tasks.length : 0,
      created_at: t.created_at,
      isTemplate: true
    }));

    return send(res, 200, { 
      ok: true, 
      templates,
      total: count || 0,
      page,
      pageSize
    });

  } catch (e) {
    console.error('Template list error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
