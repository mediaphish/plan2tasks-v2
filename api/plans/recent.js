// /api/plans/recent.js
// Get recent plans for a planner
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plannerEmail } = req.query;

    if (!plannerEmail) {
      return res.status(400).json({ error: 'Missing plannerEmail' });
    }

    // Get recent plans from the last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: plans, error } = await supabaseAdmin
      .from('plans')
      .select(`
        id,
        plan_name,
        user_email,
        status,
        created_at,
        updated_at,
        tasks:plan_tasks(count)
      `)
      .eq('planner_email', plannerEmail.toLowerCase())
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch recent plans' });
    }

    // Format the response
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.plan_name,
      user: plan.user_email,
      tasks: plan.tasks?.[0]?.count || 0,
      status: plan.status,
      created_at: plan.created_at,
      updated_at: plan.updated_at
    }));

    return res.json({ ok: true, plans: formattedPlans });

  } catch (error) {
    console.error('Recent plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent plans' });
  }
}
