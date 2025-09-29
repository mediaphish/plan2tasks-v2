export const config = { 
  runtime: 'nodejs',
  // Run daily at 2 AM UTC (late night in most timezones)
  schedule: '0 2 * * *'
};

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  try {
    console.log('Starting daily feedback sync...');
    
    // Get all active bundles from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: bundles, error: bundlesError } = await supabaseAdmin
      .from('plan_bundles')
      .select('id, planner_email, assigned_user_email, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'assigned');

    if (bundlesError) {
      console.error('Error fetching bundles:', bundlesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch bundles' });
    }

    console.log(`Found ${bundles?.length || 0} bundles to check`);

    // For each bundle, check feedback status
    const results = [];
    for (const bundle of bundles || []) {
      try {
        // Check if user has Google Tasks connection
        const { data: connection } = await supabaseAdmin
          .from('user_connections')
          .select('*')
          .eq('user_email', bundle.assigned_user_email)
          .eq('planner_email', bundle.planner_email)
          .eq('status', 'connected')
          .single();

        if (connection) {
          // TODO: Implement actual Google Tasks API checking
          console.log(`Checking feedback for bundle ${bundle.id} (user: ${bundle.assigned_user_email})`);
          
          // For now, just log that we would check this
          results.push({
            bundleId: bundle.id,
            userEmail: bundle.assigned_user_email,
            status: 'checked',
            hasConnection: true
          });
        } else {
          results.push({
            bundleId: bundle.id,
            userEmail: bundle.assigned_user_email,
            status: 'no_connection',
            hasConnection: false
          });
        }
      } catch (error) {
        console.error(`Error checking bundle ${bundle.id}:`, error);
        results.push({
          bundleId: bundle.id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('Daily feedback sync completed:', results);
    return res.status(200).json({ 
      ok: true, 
      message: 'Daily feedback sync completed',
      results: results.length,
      details: results
    });

  } catch (e) {
    console.error('Daily feedback sync error:', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
