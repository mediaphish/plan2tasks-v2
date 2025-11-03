// api/connections/monitor.js
// Daily cron job to check all Google connections and email users when re-authorization is needed

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { sendReauthEmail } from '../../lib/email-utils.js';

export const config = {
  runtime: 'nodejs',
  // Run daily at 9 AM UTC (morning in most timezones)
  schedule: '0 9 * * *'
};

export default async function handler(req, res) {
  try {
    console.log('Starting daily connection monitoring...');

    // Get all users with Google connections
    const { data: connections, error: connError } = await supabaseAdmin
      .from('user_connections')
      .select('user_email, planner_email, google_access_token, google_refresh_token, google_expires_at')
      .eq('provider', 'google')
      .not('google_refresh_token', 'is', null);

    if (connError) {
      console.error('Error fetching connections:', connError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch connections' });
    }

    const results = [];
    const reauthNeeded = [];

    for (const connection of connections) {
      try {
        // Test the connection by making a simple API call
        const testResponse = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
          headers: {
            'Authorization': `Bearer ${connection.google_access_token}`
          }
        });

        if (testResponse.status === 401 || testResponse.status === 403) {
          // Token is expired, need re-authorization
          console.log(`Connection expired for ${connection.user_email}`);
          reauthNeeded.push({
            userEmail: connection.user_email,
            plannerEmail: connection.planner_email,
            reason: 'token_expired'
          });
        } else if (testResponse.ok) {
          console.log(`Connection healthy for ${connection.user_email}`);
        }

        results.push({
          userEmail: connection.user_email,
          status: testResponse.ok ? 'healthy' : 'expired',
          httpStatus: testResponse.status
        });

      } catch (error) {
        console.error(`Error testing connection for ${connection.user_email}:`, error);
        results.push({
          userEmail: connection.user_email,
          status: 'error',
          error: error.message
        });
      }
    }

    // Send re-authorization emails using shared utility
    for (const user of reauthNeeded) {
      await sendReauthEmail(user.userEmail, user.plannerEmail, false);
    }

    console.log(`Connection monitoring completed. ${reauthNeeded.length} users need re-authorization.`);
    
    return res.status(200).json({
      ok: true,
      message: 'Connection monitoring completed',
      totalConnections: connections.length,
      healthyConnections: results.filter(r => r.status === 'healthy').length,
      expiredConnections: reauthNeeded.length,
      results: results
    });

  } catch (error) {
    console.error('Connection monitoring error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

// sendReauthEmail function moved to lib/email-utils.js for shared use



