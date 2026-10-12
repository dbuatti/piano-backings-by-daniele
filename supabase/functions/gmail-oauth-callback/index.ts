// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) throw new Error('Invalid or expired token');
    
    const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
    if (!adminEmails.includes(user.email!)) throw new Error('Unauthorized');
    
    const { code, redirectUri, intent } = await req.json();
    // 'youtube' stores the token for the YouTube channel (a Brand Account,
    // separate from the Gmail mailbox); anything else is the Gmail flow.
    const isYouTube = intent === 'youtube';

    if (!code || !redirectUri) {
      return new Response(JSON.stringify({ error: "Missing code or redirectUri" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    if (isYouTube) {
      if (!tokenData.refresh_token) {
        throw new Error(
          'Google did not return a refresh token. Remove the app from your Google account permissions and try again.'
        );
      }

      // Identify which channel this token can upload to.
      let channelId: string | null = null;
      let channelTitle: string | null = null;
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (channelRes.ok) {
        const channelJson = await channelRes.json();
        channelId = channelJson?.items?.[0]?.id ?? null;
        channelTitle = channelJson?.items?.[0]?.snippet?.title ?? null;
      }

      const { error: ytError } = await supabase
        .from('youtube_tokens')
        .upsert({
          user_id: user.id,
          refresh_token: tokenData.refresh_token,
          channel_id: channelId,
          channel_title: channelTitle,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (ytError) throw ytError;

      return new Response(
        JSON.stringify({ message: "YouTube channel connected", channel: channelTitle }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { error: insertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: user.id,
        refresh_token: tokenData.refresh_token || null,
        access_token: tokenData.access_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        token_type: tokenData.token_type
      }, { onConflict: 'user_id' });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: "Gmail OAuth completed successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});