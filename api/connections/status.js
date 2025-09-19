export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'userEmail parameter is required' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user connection
    const { data: connection, error } = await supabase
      .from('user_connections')
      .select('*')
      .eq('user_email', userEmail)
      .eq('planner_email', 'bartpaden@gmail.com')
      .single();

    if (error || !connection) {
      return res.json({
        ok: false,
        userEmail,
        canCallTasks: false,
        error: 'No connection found'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    const isExpired = now >= expiresAt;

    let canCallTasks = false;
    let googleError = null;

    if (isExpired && connection.refresh_token) {
      // Try to refresh token
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshResponse.ok) {
          // Update tokens in database
          const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
          
          await supabase
            .from('user_connections')
            .update({
              access_token: refreshData.access_token,
              expires_at: newExpiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id);

          canCallTasks = true;
        } else {
          googleError = `refresh_failed: ${refreshData.error}`;
        }
      } catch (refreshError) {
        googleError = `refresh_failed: ${refreshError.message}`;
      }
    } else if (!isExpired) {
      canCallTasks = true;
    }

    // Check if scope includes tasks
    const hasTasksScope = connection.scope && connection.scope.includes('https://www.googleapis.com/auth/tasks');

    return res.json({
      ok: true,
      userEmail,
      tableUsed: 'user_connections',
      hasAccessToken: !!connection.access_token,
      hasRefreshToken: !!connection.refresh_token,
      provider: connection.provider,
      google_scope: connection.scope,
      google_token_type: 'Bearer',
      google_token_expiry: Math.floor(expiresAt.getTime() / 1000),
      google_expires_at: connection.expires_at,
      google_tasklist_id: connection.google_tasklist_id,
      canCallTasks: canCallTasks && hasTasksScope,
      googleError
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
}
