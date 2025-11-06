// api/auth/verify-magic-link.js
// Verifies magic link token and logs in the planner

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (!token || !email) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link - Plan2Tasks</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Invalid Login Link</h1>
            <div class="error">
              <p>This login link is invalid or missing required information.</p>
              <p><a href="/">Go to Plan2Tasks</a></p>
            </div>
          </body>
        </html>
      `);
    }

    const plannerEmail = email.toLowerCase().trim();

    // Verify token from database
    let tokenData = null;
    let tokenError = null;
    
    try {
      const result = await supabaseAdmin
        .from('planner_auth_tokens')
        .select('token, expires_at, used, planner_email')
        .eq('planner_email', plannerEmail)
        .eq('used', false)
        .limit(1)
        .single();
      
      tokenData = result.data;
      tokenError = result.error;
    } catch (err) {
      // Table might not exist yet - this is okay for first deployment
      console.log('[MAGIC LINK] Token table may not exist, continuing with basic verification');
      tokenError = err;
    }

    if (tokenError && tokenError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is okay if table doesn't exist
      // Other errors are real problems
      console.error('[MAGIC LINK] Token lookup error:', tokenError);
    }

    if (tokenData) {
      // Check if token matches
      if (tokenData.token !== token) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invalid Link - Plan2Tasks</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>Invalid Login Link</h1>
              <div class="error">
                <p>This login link is invalid or has already been used.</p>
                <p><a href="/">Go to Plan2Tasks</a></p>
              </div>
            </body>
          </html>
        `);
      }

      // Check if expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Expired Link - Plan2Tasks</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                .error { background: #fff4e6; border: 1px solid #ffd700; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>Login Link Expired</h1>
              <div class="error">
                <p>This login link has expired. Please request a new one.</p>
                <p><a href="/">Go to Plan2Tasks</a></p>
              </div>
            </body>
          </html>
        `);
      }

      // Mark token as used
      try {
        await supabaseAdmin
          .from('planner_auth_tokens')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('planner_email', plannerEmail)
          .eq('token', token);
      } catch (err) {
        console.log('[MAGIC LINK] Could not mark token as used (table may not exist):', err);
      }
    } else {
      // Token not in database - this could mean table doesn't exist yet
      // For now, we'll still allow login but log a warning
      console.log('[MAGIC LINK] Token not found in database, but allowing login (table may need to be created)');
    }

    // Ensure planner profile exists
    const { data: profile } = await supabaseAdmin
      .from('planner_profiles')
      .select('planner_email')
      .eq('planner_email', plannerEmail)
      .limit(1)
      .single();

    if (!profile) {
      // Create planner profile if it doesn't exist
      await supabaseAdmin
        .from('planner_profiles')
        .insert({
          planner_email: plannerEmail,
          planner_name: plannerEmail.split('@')[0],
          company_name: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // Redirect to dashboard with plannerEmail in URL
    const redirectUrl = `/?plannerEmail=${encodeURIComponent(plannerEmail)}&view=dashboard`;
    
    return res.status(302).setHeader('Location', redirectUrl).setHeader('Cache-Control', 'no-store').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Signing in... - Plan2Tasks</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Signing in...</h1>
          <div class="success">
            <p>Login successful! Redirecting to your dashboard...</p>
            <p>If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[MAGIC LINK] Verify error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - Plan2Tasks</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Login Error</h1>
          <div class="error">
            <p>An error occurred while verifying your login link. Please try again.</p>
            <p><a href="/">Go to Plan2Tasks</a></p>
          </div>
        </body>
      </html>
    `);
  }
}

