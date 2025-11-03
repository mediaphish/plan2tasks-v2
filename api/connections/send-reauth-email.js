// api/connections/send-reauth-email.js
// Manual trigger endpoint for Planners to send re-authorization emails to users
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { sendReauthEmail } from '../../lib/email-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { plannerEmail, userEmail } = req.body || {};

    if (!plannerEmail || !userEmail) {
      return res.status(400).json({ ok: false, error: 'Missing plannerEmail or userEmail' });
    }

    // Verify that the planner owns this user connection
    const sb = supabaseAdmin();
    const { data: connection, error: connError } = await sb
      .from('user_connections')
      .select('planner_email, user_email')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .eq('user_email', userEmail.toLowerCase().trim())
      .maybeSingle();

    if (connError) {
      console.error('Connection verification error:', connError);
      return res.status(500).json({ ok: false, error: 'Failed to verify connection' });
    }

    // Allow email even if no connection record exists (user might need to connect initially)
    // But if connection exists, verify planner matches
    if (connection && connection.planner_email.toLowerCase() !== plannerEmail.toLowerCase().trim()) {
      return res.status(403).json({ ok: false, error: 'Unauthorized: You do not have access to this user' });
    }

    // Send re-authorization email (bypassRateLimit = true for manual triggers, but still apply 1-hour limit)
    const result = await sendReauthEmail(userEmail, plannerEmail, true);

    if (result.sent) {
      return res.status(200).json({ 
        ok: true, 
        message: 'Re-authorization email sent successfully',
        userEmail 
      });
    } else {
      return res.status(200).json({ 
        ok: false, 
        error: result.reason || 'Failed to send email',
        userEmail 
      });
    }

  } catch (error) {
    console.error('Send reauth email error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

