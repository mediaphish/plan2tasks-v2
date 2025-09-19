export const config = { runtime: 'nodejs' };

import { createClient } from '@supabase/supabase-js';

function n(v) { return (typeof v === 'string' ? v : '').trim().toLowerCase(); }
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE; // support both names
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return handleGet(req, res);
    } else if (req.method === 'POST') {
      return handlePost(req, res);
    } else {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }
  } catch (e) {
    console.error('users error', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}

async function handleGet(req, res) {
  try {

    const url = new URL(req.url, `http://${req.headers.host}`);
    const plannerEmail = n(url.searchParams.get('plannerEmail') || '');
    const status = (url.searchParams.get('status') || 'active').toLowerCase(); // active|archived|deleted|all

    if (!plannerEmail || !plannerEmail.includes('@')) {
      return send(res, 400, { ok: false, error: 'Invalid plannerEmail' });
    }
    if (!['active','archived','deleted','all'].includes(status)) {
      return send(res, 400, { ok: false, error: 'Invalid status' });
    }

    const sb = admin();
    const byEmail = new Map();

    const priority = { connected: 3, invited: 2, archived: 2, deleted: 1 };

    async function addConnections(statuses) {
      const { data, error } = await sb
        .from('user_connections')
        .select('user_email, groups, status, updated_at')
        .ilike('planner_email', plannerEmail)
        .in('status', statuses);
      if (error) throw new Error('Database error (connections)');

      for (const c of data || []) {
        const email = n(c.user_email || '');
        if (!email || email === n(plannerEmail)) continue; // Skip planner email
        const next = { email, groups: Array.isArray(c.groups) ? c.groups : [], status: c.status, updated_at: c.updated_at || null, __source: 'connection' };
        const prev = byEmail.get(email);
        if (!prev || (priority[next.status] || 0) >= (priority[prev.status] || 0)) byEmail.set(email, next);
      }
    }

    async function addPendingInvites() {
      const { data, error } = await sb
        .from('invites')
        .select('user_email, used_at')
        .ilike('planner_email', plannerEmail)
        .is('used_at', null);
      if (error) throw new Error('Database error (invites)');

      for (const inv of data || []) {
        const email = n(inv.user_email || '');
        if (!email) continue;
        if (!byEmail.has(email)) {
          byEmail.set(email, { email, groups: [], status: 'invited', updated_at: null, __source: 'invite' });
        }
      }
    }

    if (status === 'all') {
      await addConnections(['connected','archived','deleted']);
      await addPendingInvites();
    } else {
      const wanted = status === 'active' ? ['connected'] : status === 'archived' ? ['archived'] : ['deleted'];
      await addConnections(wanted);
      if (status === 'active') await addPendingInvites();
    }

    const users = Array.from(byEmail.values());
    return send(res, 200, { ok: true, users });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message || 'Unhandled error' });
  }
}

async function handlePost(req, res) {
  try {
    const { plannerEmail, userEmail, groups } = req.body;
    
    if (!plannerEmail || !userEmail) {
      return send(res, 400, { ok: false, error: 'Missing plannerEmail or userEmail' });
    }

    const sb = admin();
    
    // Update user categories
    const { error } = await sb
      .from('user_connections')
      .update({ groups: groups || [] })
      .eq('planner_email', plannerEmail)
      .eq('user_email', userEmail);

    if (error) {
      return send(res, 500, { ok: false, error: error.message });
    }

    return send(res, 200, { ok: true });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message || 'Unhandled error' });
  }
}
