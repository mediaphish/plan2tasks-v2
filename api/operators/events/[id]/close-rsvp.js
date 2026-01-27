/**
 * Close RSVP
 * 
 * POST /api/operators/events/[id]/close-rsvp
 * 
 * Closes RSVP for a LIVE event. Only SA, CO, or Accountant can close RSVP.
 * After RSVP is closed, no new RSVPs are accepted and waitlist stops auto-promoting.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canManageTopics } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only SA, CO, or Accountant can close RSVP
    const canClose = await canManageTopics(email);
    if (!canClose) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins, Chief Operators, or Accountants can close RSVP' });
    }

    // Get current event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('state, rsvp_closed')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: `Event must be LIVE to close RSVP. Current state: ${event.state}` });
    }

    // Check if RSVP is already closed
    if (event.rsvp_closed) {
      return res.status(400).json({ ok: false, error: 'RSVP is already closed for this event' });
    }

    // Update event to close RSVP
    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('operators_events')
      .update({
        rsvp_closed: true
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[CLOSE_RSVP] Database error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to close RSVP' });
    }

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('[CLOSE_RSVP] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
