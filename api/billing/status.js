// /api/billing/status.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const plannerEmail = url.searchParams.get('plannerEmail');

    if (!plannerEmail) {
      return res.status(400).json({ error: 'Missing plannerEmail' });
    }

    // Get subscription status
    const { data: subscription, error } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('*')
      .eq('planner_email', plannerEmail.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get current user count
    const { data: connections } = await supabaseAdmin
      .from('user_connections')
      .select('user_email')
      .eq('planner_email', plannerEmail.toLowerCase())
      .eq('status', 'connected');

    const userCount = connections?.length || 0;
    const userLimit = subscription?.user_limit || 1;
    const isAtLimit = userCount >= userLimit;

    return res.json({
      ok: true,
      subscription: subscription || {
        plan_tier: 'free',
        status: 'active',
        user_limit: 1,
        user_count: userCount
      },
      userCount,
      userLimit,
      isAtLimit,
      canAddUsers: !isAtLimit,
      needsUpgrade: isAtLimit && subscription?.plan_tier === 'free'
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: 'Failed to get status' });
  }
}