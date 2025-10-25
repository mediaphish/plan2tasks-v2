// /api/monitoring/errors.js
// Error tracking and logging endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      error, 
      message, 
      stack, 
      url, 
      userAgent, 
      userId, 
      timestamp = new Date().toISOString() 
    } = req.body;

    // Log error details
    console.error('Client Error:', {
      error: error || message,
      stack,
      url,
      userAgent,
      userId,
      timestamp,
      severity: 'error'
    });

    // In production, you would send this to an error tracking service like:
    // - Sentry
    // - LogRocket
    // - Bugsnag
    // - Rollbar

    return res.json({ 
      ok: true, 
      message: 'Error logged successfully' 
    });

  } catch (error) {
    console.error('Error logging failed:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to log error' 
    });
  }
}
