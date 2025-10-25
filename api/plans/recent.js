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

    // Get templates sorted by last used date (no date restriction)
    const { data: templates, error } = await supabaseAdmin
      .from('templates')
      .select(`
        id,
        template_name,
        created_at,
        updated_at,
        last_used_at,
        tasks:template_tasks(count)
      `)
      .eq('planner_email', plannerEmail.toLowerCase())
      .order('last_used_at', { ascending: false, nullsLast: true })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch recent plans' });
    }

    // Format the response
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.template_name,
      tasks: template.tasks?.[0]?.count || 0,
      last_used: template.last_used_at ? new Date(template.last_used_at).toLocaleDateString() : null,
      created_at: template.created_at,
      updated_at: template.updated_at
    }));

    return res.json({ ok: true, plans: formattedTemplates });

  } catch (error) {
    console.error('Recent plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent plans' });
  }
}
