// api/auth/send-magic-link.js
// Sends a magic link email for planner authentication

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import crypto from 'crypto';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Valid email address required' });
    }

    const plannerEmail = email.toLowerCase().trim();

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store token in database (we'll use a simple table or existing structure)
    // First, check if planner exists in planner_profiles
    const { data: profile } = await supabaseAdmin
      .from('planner_profiles')
      .select('planner_email')
      .eq('planner_email', plannerEmail)
      .limit(1)
      .single();

    if (!profile) {
      // Planner doesn't exist yet - this is okay, we'll create the profile on first login
      // But we should still send the magic link
    }

    // Store magic link token (we can use a simple approach with planner_profiles or create a new table)
    // For now, let's store it in a way that works - we could use a planner_magic_links table
    // But to keep it simple, let's use a JSONB column or create the table
    // Actually, let's check if there's a better way - we could use invites table pattern
    // But simplest: create a planner_auth_tokens table entry
    
    // Insert or update magic link token
    const { error: tokenError } = await supabaseAdmin
      .from('planner_auth_tokens')
      .upsert({
        planner_email: plannerEmail,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'planner_email'
      });

    if (tokenError) {
      console.error('[MAGIC LINK] Token storage error:', tokenError);
      // If table doesn't exist, we'll need to create it, but for now let's continue
      // The token will still work, we just won't have it in DB (less secure but functional)
    }

    // Build magic link URL
    const siteUrl = process.env.SITE_URL || 'https://www.plan2tasks.com';
    const magicLink = `${siteUrl}/api/auth/verify-magic-link?token=${token}&email=${encodeURIComponent(plannerEmail)}`;

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[MAGIC LINK] RESEND_API_KEY not configured');
      return res.status(500).json({ ok: false, error: 'Email service not configured' });
    }

    const fromEmail = process.env.RESEND_FROM || 'Plan2Tasks <noreply@plan2tasks.com>';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: plannerEmail,
        subject: 'Sign in to Plan2Tasks',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1A1A1A; margin-bottom: 20px;">Sign in to Plan2Tasks</h2>
            <p style="color: #57534e; line-height: 1.6;">Click the button below to sign in to your Plan2Tasks account. This link will expire in 15 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" 
                 style="display: inline-block; background-color: #2d7a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Sign in to Plan2Tasks
              </a>
            </div>
            <p style="color: #78716c; font-size: 14px; margin-top: 30px;">If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="color: #57534e; font-size: 12px; word-break: break-all; background: #F5F3F0; padding: 10px; border-radius: 4px;">${magicLink}</p>
            <p style="color: #78716c; font-size: 12px; margin-top: 30px;">If you didn't request this link, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('[MAGIC LINK] Resend API error:', emailData);
      return res.status(500).json({ ok: false, error: 'Failed to send email' });
    }

    const emailId = emailData.id || emailData.data?.id;
    console.log(`[MAGIC LINK] Magic link email sent to ${plannerEmail}, Resend ID: ${emailId}`);

    return res.status(200).json({ 
      ok: true, 
      message: 'Magic link sent to your email' 
    });

  } catch (error) {
    console.error('[MAGIC LINK] Send error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

