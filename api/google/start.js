export default async function handler(req, res) {
  const { userEmail } = req.query;

  // Validate userEmail parameter
  if (!userEmail) {
    return res.status(400).json({ 
      ok: false, 
      error: "start_failed", 
      detail: "Missing userEmail parameter" 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ 
      ok: false, 
      error: "start_failed", 
      detail: "Invalid email format" 
    });
  }

  try {
    // Build state as base64url-encoded JSON
    const state = Buffer.from(JSON.stringify({ userEmail })).toString('base64url');

    // Google OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://www.plan2tasks.com/api/google/callback";
    
    if (!clientId) {
      return res.status(500).json({ 
        ok: false, 
        error: "start_failed", 
        detail: "GOOGLE_CLIENT_ID not configured" 
      });
    }

    // Required scopes including Tasks scope
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/tasks'
    ].join(' ');

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');

    // Return HTML that opens OAuth in new window
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorizing...</title>
        </head>
        <body>
          <script>
            // Open OAuth in new window
            const oauthWindow = window.open('${authUrl.toString()}', '_blank', 'width=500,height=600');
            
            // Listen for the OAuth window to close
            const checkClosed = setInterval(() => {
              if (oauthWindow.closed) {
                clearInterval(checkClosed);
                // Redirect to main app
                window.location.href = 'https://www.plan2tasks.com/?view=users';
              }
            }, 1000);
          </script>
          <p>Opening authorization window...</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Google OAuth start error:', error);
    res.status(500).json({ 
      ok: false, 
      error: "start_failed", 
      detail: error.message 
    });
  }
}
