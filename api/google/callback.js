// api/google/callback.js
// Exchanges the auth code for tokens and upserts into public.user_connections.

import { supabaseAdmin } from "../../lib/supabase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const err = url.searchParams.get("error");

    if (err) return res.status(400).json({ ok: false, error: err });
    if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

    let userEmail = null;
    try {
      userEmail = JSON.parse(Buffer.from(String(state || ""), "base64url").toString("utf8"))?.userEmail || null;
    } catch {}
    if (!userEmail) return res.status(400).json({ ok: false, error: "Missing userEmail in state" });

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({ ok: false, error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" });
    }

    const redirectUri = `https://${req.headers.host}/api/google/callback`; // <— locked path

    const form = new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });

    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(400).json({
        ok: false,
        error: j?.error || `http_${r.status}`,
        error_description: j?.error_description || null
      });
    }

    const accessToken  = j.access_token || null;
    const refreshToken = j.refresh_token || null; // may be null on re-consent
    const tokenType    = j.token_type || "Bearer";
    const expiresIn    = Number(j.expires_in || 3600);
    const scope        = j.scope || "";
    const expUnix      = Math.floor(Date.now() / 1000) + expiresIn;
    const expiresAtIso = new Date(expUnix * 1000).toISOString();

    // Log the received scope for debugging
    console.log(`[GOOGLE_OAUTH] Token exchange successful for ${userEmail}`);
    console.log(`[GOOGLE_OAUTH] Received scopes: ${scope}`);

    if (!scope.includes("https://www.googleapis.com/auth/tasks")) {
      console.error(`[GOOGLE_OAUTH] Missing Tasks scope for ${userEmail}`);
      console.error(`[GOOGLE_OAUTH] Received scopes: ${scope}`);
      
      // Return user-friendly error page instead of JSON
      res.setHeader('Content-Type', 'text/html');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authorization Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
              .info { background: #eef; border: 1px solid #ccf; padding: 15px; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Authorization Incomplete</h1>
            <div class="error">
              <p><strong>Error:</strong> Google Tasks permission was not granted.</p>
              <p>You need to grant access to Google Tasks for Plan2Tasks to work.</p>
            </div>
            <div class="info">
              <p><strong>What happened:</strong></p>
              <p>Google only granted these permissions: ${scope || 'none'}</p>
              <p>Plan2Tasks requires access to Google Tasks to create and manage your tasks.</p>
              <p><strong>Next steps:</strong></p>
              <ol>
                <li>Close this window</li>
                <li>Try the authorization again</li>
                <li>Make sure you check the box for "Google Tasks" when prompted</li>
              </ol>
            </div>
            <script>
              if (window.opener) {
                setTimeout(() => {
                  window.close();
                  window.opener.location.href = 'https://www.plan2tasks.com/?view=users';
                }, 5000);
              } else {
                setTimeout(() => {
                  window.location.href = 'https://www.plan2tasks.com/?view=users';
                }, 5000);
              }
            </script>
          </body>
        </html>
      `);
    }

    const { data: existing } = await supabaseAdmin
      .from("user_connections")
      .select("*")
      .eq("user_email", userEmail)
      .maybeSingle();

    const upsertRow = {
      user_email: userEmail,
      provider: "google",
      google_access_token: accessToken,
      google_refresh_token: refreshToken || existing?.google_refresh_token || null,
      google_scope: scope,
      google_token_type: tokenType,
      google_token_expiry: expUnix,
      google_expires_at: expiresAtIso,
      google_tasklist_id: existing?.google_tasklist_id || null,
      // Preserve existing planner_email and status if they exist
      ...(existing?.planner_email && { planner_email: existing.planner_email }),
      ...(existing?.status && { status: existing.status })
    };

    const { error: upErr } = await supabaseAdmin
      .from("user_connections")
      .upsert(upsertRow, { onConflict: "user_email" });

    if (upErr) {
      return res.status(500).json({ ok: false, error: "Database error (upsert)" });
    }

    // Return HTML that closes popup and redirects parent
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Complete</title>
        </head>
        <body>
          <script>
            // Close the popup window and redirect parent
            if (window.opener) {
              window.opener.location.href = 'https://www.plan2tasks.com/?view=users';
              window.close();
            } else {
              // If not in popup, redirect directly
              window.location.href = 'https://www.plan2tasks.com/?view=users';
            }
          </script>
          <p>Authorization complete. Closing window...</p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error("GET /api/google/callback error", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
