// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Mints a YouTube-upload access token from the Google refresh token we already
// store for the channel account (see gmail-oauth-callback). This lets the
// title-card tool publish without a browser OAuth popup, always as the
// pianobackingsbydaniele channel. Reuses GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID');
    const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET');
    const YT_ACCOUNT_EMAIL =
      Deno.env.get('YT_ACCOUNT_EMAIL') || 'pianobackingsbydaniele@gmail.com';

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Authorise: service-role calls or signed-in admins only. ---
    const authHeader = req.headers.get('Authorization') || '';
    const callerToken = authHeader.replace(/^Bearer\s+/i, '');
    const adminEmails = [
      'daniele.buatti@gmail.com',
      'pianobackingsbydaniele@gmail.com',
    ];
    let callerId: string | null = null;
    let isAuthorized = false;
    if (callerToken && callerToken === supabaseServiceKey) {
      isAuthorized = true;
    } else if (callerToken) {
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(callerToken);
      if (user && adminEmails.includes(user.email || '')) {
        isAuthorized = true;
        callerId = user.id;
      }
    }
    if (!isAuthorized) {
      return json({ error: 'Forbidden' }, 403);
    }

    // --- Find the refresh token for the channel account. ---
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const channelUser =
      usersData.users.find((u) => u.email === YT_ACCOUNT_EMAIL) ||
      (callerId ? usersData.users.find((u) => u.id === callerId) : null);
    if (!channelUser) {
      throw new Error(`No account found for ${YT_ACCOUNT_EMAIL}.`);
    }

    const { data: tokenData } = await supabaseAdmin
      .from('gmail_tokens')
      .select('refresh_token')
      .eq('user_id', channelUser.id)
      .maybeSingle();

    if (!tokenData?.refresh_token) {
      throw new Error(
        `No stored Google refresh token for ${YT_ACCOUNT_EMAIL}. Reconnect the account in Admin → Settings.`
      );
    }

    // --- Exchange the refresh token for a fresh access token. ---
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(
        tokenJson.error_description ||
          tokenJson.error ||
          `Token refresh failed (${tokenRes.status})`
      );
    }

    // --- Confirm the token actually has YouTube access and identify the channel. ---
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
    );
    if (!channelRes.ok) {
      // Usually means the stored token predates the youtube.upload scope.
      throw new Error(
        'The stored Google token lacks YouTube upload access — reconnect the account to enable silent uploads.'
      );
    }
    const channelJson = await channelRes.json();
    const channel = channelJson?.items?.[0]?.snippet?.title ?? null;

    return json({
      access_token: tokenJson.access_token,
      expires_in: tokenJson.expires_in ?? 3600,
      channel,
    });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
