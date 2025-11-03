// lib/email-utils.js
// Shared utility for sending re-authorization emails to users
import { supabaseAdmin } from './supabase-admin.js';

/**
 * Send re-authorization email to a user
 * @param {string} userEmail - User's email address
 * @param {string} plannerEmail - Planner's email address
 * @param {boolean} bypassRateLimit - If true, skip rate limiting (for manual triggers)
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendReauthEmail(userEmail, plannerEmail, bypassRateLimit = false) {
  try {
    // Check rate limiting (24 hours for automatic, 1 hour for manual)
    if (!bypassRateLimit) {
      const rateLimitHours = 24;
      const canSend = await checkRateLimit(userEmail, rateLimitHours);
      if (!canSend.allowed) {
        console.log(`Rate limit blocked email to ${userEmail}: ${canSend.reason}`);
        return { sent: false, reason: canSend.reason };
      }
    } else {
      // Manual trigger: 1 hour rate limit
      const canSend = await checkRateLimit(userEmail, 1);
      if (!canSend.allowed) {
        console.log(`Manual rate limit blocked email to ${userEmail}: ${canSend.reason}`);
        return { sent: false, reason: canSend.reason };
      }
    }

    // Build re-authorization URL
    const reauthUrl = `https://www.plan2tasks.com/api/google/start?userEmail=${encodeURIComponent(userEmail)}`;
    
    // Email content
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

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return { sent: false, reason: 'Email service not configured' };
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Plan2Tasks <noreply@plan2tasks.com>',
        ...emailContent
      })
    });

    if (emailResponse.ok) {
      // Update last_reauth_email_sent_at in database
      await updateLastEmailSent(userEmail, plannerEmail);
      console.log(`Re-authorization email sent to ${userEmail}`);
      return { sent: true };
    } else {
      const errorText = await emailResponse.text();
      console.error(`Failed to send email to ${userEmail}:`, errorText);
      return { sent: false, reason: `Email service error: ${errorText}` };
    }

  } catch (error) {
    console.error(`Error sending reauth email to ${userEmail}:`, error);
    return { sent: false, reason: error.message };
  }
}

/**
 * Check if we can send an email based on rate limiting
 * @param {string} userEmail - User's email address
 * @param {number} hoursLimit - Hours to wait before allowing another email
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function checkRateLimit(userEmail, hoursLimit) {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from('user_connections')
      .select('last_reauth_email_sent_at')
      .eq('user_email', userEmail.toLowerCase().trim())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found, which is OK
      console.error('Rate limit check error:', error);
      // On error, allow the email (fail open)
      return { allowed: true };
    }

    if (!data || !data.last_reauth_email_sent_at) {
      // No previous email sent, allow it
      return { allowed: true };
    }

    const lastSent = new Date(data.last_reauth_email_sent_at);
    const now = new Date();
    const hoursSinceLastEmail = (now - lastSent) / (1000 * 60 * 60);

    if (hoursSinceLastEmail >= hoursLimit) {
      return { allowed: true };
    } else {
      const remainingHours = Math.ceil(hoursLimit - hoursSinceLastEmail);
      return { 
        allowed: false, 
        reason: `Email sent ${remainingHours} hour(s) ago. Please wait before sending another.` 
      };
    }
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the email (fail open)
    return { allowed: true };
  }
}

/**
 * Update the last_reauth_email_sent_at timestamp in database
 * @param {string} userEmail - User's email address
 * @param {string} plannerEmail - Planner's email address
 */
async function updateLastEmailSent(userEmail, plannerEmail) {
  try {
    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    // Try to update existing connection
    const { error: updateError } = await sb
      .from('user_connections')
      .update({ last_reauth_email_sent_at: now })
      .eq('user_email', userEmail.toLowerCase().trim());

    // If update fails (no row exists), try to insert (best effort)
    if (updateError && updateError.code === 'PGRST116') {
      // No connection exists, but we still sent the email - that's OK
      console.log(`No connection record found for ${userEmail}, email still sent`);
    } else if (updateError) {
      console.error('Failed to update last_reauth_email_sent_at:', updateError);
      // Don't fail the email send if tracking fails
    }
  } catch (error) {
    console.error('Error updating last_reauth_email_sent_at:', error);
    // Don't fail the email send if tracking fails
  }
}

