// api/connections/monitor.js
// Daily cron job to check all Google connections and email users when re-authorization is needed

import { supabaseAdmin } from '../../lib/supabase-admin.js';

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

    // Send re-authorization emails
    for (const user of reauthNeeded) {
      await sendReauthEmail(user.userEmail, user.plannerEmail);
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

async function sendReauthEmail(userEmail, plannerEmail) {
  try {
    const reauthUrl = `https://www.plan2tasks.com/api/google/start?userEmail=${encodeURIComponent(userEmail)}`;
    
    const emailContent = {
      to: userEmail,
      subject: 'Plan2Tasks - Google Connection Update Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Google Tasks Connection Update Required</h2>
          <p>Hello,</p>
          <p>Your Google Tasks connection with Plan2Tasks needs to be updated. This is a normal security process that happens periodically.</p>
          <p><strong>What you need to do:</strong></p>
          <ol>
            <li>Click the button below to re-authorize your Google account</li>
            <li>Sign in to your Google account when prompted</li>
            <li>Grant permission for Plan2Tasks to access your Google Tasks</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reauthUrl}" 
               style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Re-authorize Google Tasks
            </a>
          </div>
          <p><strong>Why is this needed?</strong></p>
          <p>Google requires periodic re-authorization for security. This ensures your tasks remain secure and your planner can continue to send you tasks.</p>
          <p>If you have any questions, please contact your planner or reply to this email.</p>
          <p>Best regards,<br>The Plan2Tasks Team</p>
        </div>
      `
    };

    // Send email via Resend (you'll need to set up Resend API)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailContent)
    });

    if (emailResponse.ok) {
      console.log(`Re-authorization email sent to ${userEmail}`);
    } else {
      console.error(`Failed to send email to ${userEmail}:`, await emailResponse.text());
    }

  } catch (error) {
    console.error(`Error sending reauth email to ${userEmail}:`, error);
  }
}
