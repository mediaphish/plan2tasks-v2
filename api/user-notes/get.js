// api/user-notes/get.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

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

    const url = new URL(req.url, `http://${req.headers.host}`);
    const userEmail = url.searchParams.get('userEmail');
    const plannerEmail = url.searchParams.get('plannerEmail');

    if (!userEmail || !plannerEmail) {
      return send(res, 400, { ok: false, error: 'Missing userEmail or plannerEmail' });
    }

    // Get user notes
    const { data, error } = await supabaseAdmin
      .from('user_notes')
      .select('notes, updated_at')
      .eq('user_email', userEmail.toLowerCase().trim())
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('User notes get error:', error);
      return send(res, 500, { ok: false, error: 'Failed to fetch user notes' });
    }

    return send(res, 200, {
      ok: true,
      notes: data?.notes || '',
      updatedAt: data?.updated_at || null
    });

  } catch (e) {
    console.error('User notes get error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
