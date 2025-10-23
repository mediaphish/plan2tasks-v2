    // Send email notification using Resend
    const emailBody = `
New contact form submission from Plan2Tasks website:

Name: ${name}
Email: ${email}
Message: ${message}

Submitted at: ${new Date().toLocaleString()}
    `.trim();

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Plan2Tasks <noreply@plan2tasks.com>',
          to: ['bartpaden@gmail.com'],
          subject: 'New Contact Form Submission - Plan2Tasks',
          text: emailBody
        })
      });

      if (!resendResponse.ok) {
        console.error('Resend email failed:', await resendResponse.text());
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    } `
New contact form submission from Plan2Tasks website:

Name: ${name}
Email: ${email}
Message: ${message}

Submitted at: ${new Date().toLocaleString()}
    `.trim();

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Plan2Tasks <noreply@plan2tasks.com>',
          to: ['bartpaden@gmail.com'],
          subject: 'New Contact Form Submission - Plan2Tasks',
          text: emailBody
        })
      });

      if (!resendResponse.ok) {
        console.error('Resend email failed:', await resendResponse.text());
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    return res.json({ 
      ok: true, 
      message: 'Thank you for your message. We\'ll get back to you soon!' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to process contact form' });
  }
}
