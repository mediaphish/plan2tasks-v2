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

    // Get templates from the actual plan_templates table
    const { data: templates, error } = await supabaseAdmin
      .from('plan_templates')
      .select(`
        id,
        name,
        created_at,
        updated_at
      `)
      .eq('planner_email', plannerEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch recent plans' });
    }

    // Format the response
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      tasks: Array.isArray(template.tasks) ? template.tasks.length : 0,
      created_at: template.created_at,
      updated_at: template.created_at
    }));

    return res.json({ ok: true, plans: formattedTemplates });

  } catch (error) {
    console.error('Recent plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent plans' });
  }
}
