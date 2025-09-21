// api/inbox/review.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { plannerEmail, inboxId } = req.body;

    if (!plannerEmail || !inboxId) {
      return res.status(400).json({ error: 'Missing plannerEmail or inboxId' });
    }

    // Update the bundle to mark it as reviewed
    const { data, error } = await supabaseAdmin
      .from('inbox_bundles')
      .update({ reviewed_at: new Date().toISOString() })
      .eq('id', inboxId)
      .eq('planner_email', plannerEmail)
      .select()
      .single();

    if (error) {
      console.error('Review update error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    return res.status(200).json({ ok: true, bundle: data });
  } catch (e) {
    console.error('Review error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
}
