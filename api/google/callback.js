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

    if (err) {
      // Redirect to main app on OAuth error
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
    }
    if (!code) {
      // Redirect to main app on missing code
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
    }

    let userEmail = null;
    try {
      userEmail = JSON.parse(Buffer.from(String(state || ""), "base64url").toString("utf8"))?.userEmail || null;
    } catch {}
    if (!userEmail) {
      // Redirect to main app on missing userEmail
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
    }

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      // Redirect to main app on missing credentials
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
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
      // Redirect to main app on token exchange failure
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
    }

    const accessToken  = j.access_token || null;
    const refreshToken = j.refresh_token || null; // may be null on re-consent
    const tokenType    = j.token_type || "Bearer";
    const expiresIn    = Number(j.expires_in || 3600);
    const scope        = j.scope || "";
    const expUnix      = Math.floor(Date.now() / 1000) + expiresIn;
    const expiresAtIso = new Date(expUnix * 1000).toISOString();

    if (!scope.includes("https://www.googleapis.com/auth/tasks")) {
      // Redirect to main app on missing tasks scope
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
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
      google_tasklist_id: existing?.google_tasklist_id || null
    };

    const { error: upErr } = await supabaseAdmin
      .from("user_connections")
      .upsert(upsertRow, { onConflict: "user_email" });

    if (upErr) {
      // Redirect to main app on database error
      return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
    }

    // Redirect to the main app instead of returning JSON
    const redirectUrl = `https://www.plan2tasks.com/?view=users&user=${encodeURIComponent(userEmail)}`;
    console.log('OAuth callback success, redirecting to:', redirectUrl);
    return res.redirect(302, redirectUrl);
  } catch (e) {
    console.error("GET /api/google/callback error", e);
    // Redirect to main app on any error
    return res.redirect(302, 'https://www.plan2tasks.com/?view=users');
  }
}
