// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireGoogleCreds, requireSupabaseEnv } from '../_shared/env.ts';
import { mintChannelAccessToken } from '../_shared/youtube.ts';

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
    const { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET } = requireGoogleCreds('get-youtube-token');
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('get-youtube-token');
    const YT_ACCOUNT_EMAIL =
      Deno.env.get('YT_ACCOUNT_EMAIL') || 'pianobackingsbydaniele@gmail.com';
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

    // --- Find the refresh token for the channel account and mint a token. ---
    const token = await mintChannelAccessToken(supabaseAdmin, {
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      accountEmail: YT_ACCOUNT_EMAIL,
      fallbackUserId: callerId,
    });

    return json({
      access_token: token.access_token,
      expires_in: token.expires_in,
      channel: token.channel,
      source: token.source,
    });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
