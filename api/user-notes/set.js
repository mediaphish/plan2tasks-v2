// api/user-notes/set.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

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

    const { userEmail, plannerEmail, notes } = req.body;

    // Validation
    if (!userEmail || !plannerEmail) {
      return send(res, 400, { ok: false, error: 'Missing userEmail or plannerEmail' });
    }

    // Upsert user notes (insert or update)
    const { data, error } = await supabaseAdmin
      .from('user_notes')
      .upsert({
        user_email: userEmail.toLowerCase().trim(),
        planner_email: plannerEmail.toLowerCase().trim(),
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .select('id, notes, updated_at')
      .single();

    if (error) {
      console.error('User notes set error:', error);
      return send(res, 500, { ok: false, error: 'Failed to save user notes' });
    }

    return send(res, 200, {
      ok: true,
      message: 'User notes saved successfully',
      data: {
        id: data.id,
        notes: data.notes,
        updatedAt: data.updated_at
      }
    });

  } catch (e) {
    console.error('User notes set error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
