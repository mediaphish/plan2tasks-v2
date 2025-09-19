export default async function handler(req, res) {
  const { status, plannerEmail } = req.query;

  if (!status || !plannerEmail) {
    return res.status(400).json({ error: 'status and plannerEmail parameters are required' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get bundles from your actual inbox_bundles table
    let query = supabase
      .from('inbox_bundles')
      .select('*')
      .eq('planner_email', plannerEmail)
      .order('created_at', { ascending: false });

    // Filter by status if it's not 'all'
    if (status === 'assigned') {
      query = query.not('assigned_user_email', 'is', null);
    } else if (status === 'new') {
      query = query.is('assigned_user_email', null);
    } else if (status === 'archived') {
      query = query.not('archived_at', 'is', null);
    }

    const { data: bundles, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch bundles' });
    }

    return res.json({
      bundles: bundles || [],
      count: bundles ? bundles.length : 0,
      status,
      plannerEmail
    });

  } catch (error) {
    console.error('Inbox API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
