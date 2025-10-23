// /api/contact/send.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store contact form submission in database
    const { error } = await supabaseAdmin
      .from('contact_submissions')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save contact form' });
    }

    // Send email notification to you
    const emailBody = `
New contact form submission from Plan2Tasks website:

Name: ${name}
Email: ${email}
Message: ${message}

Submitted at: ${new Date().toLocaleString()}
    `.trim();

    // You can add email sending logic here if you have an email service
    // For now, we'll just log it
    console.log('Contact form submission:', { name, email, message });

    return res.json({ 
      ok: true, 
      message: 'Thank you for your message. We\'ll get back to you soon!' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to process contact form' });
  }
}
