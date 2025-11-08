/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Inlined Gmail Utility Functions ---
interface GmailToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
}

const encodeBase64Url = (str: string) => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const getSupabaseServiceRoleClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for elevated privileges
    {
      auth: {
        persistSession: false,
      },
    }
  );
};

const getGmailTokens = async (gmailUserEmail: string): Promise<GmailToken | null> => {
  const supabase = getSupabaseServiceRoleClient();
  
  const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserByEmail(gmailUserEmail);

  if (authUserError || !authUserData?.user) {
    console.error('Error fetching auth user by email for Gmail tokens:', authUserError);
    return null;
  }
  const gmailUserId = authUserData.user.id;

  const { data, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', gmailUserId)
    .single();

  if (error) {
    console.error('Error fetching Gmail tokens:', error);
    return null;
  }
  return data as GmailToken;
};

const refreshGmailAccessToken = async (refreshToken: string, clientId: string, clientSecret: string): Promise<string | null> => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error refreshing Gmail access token:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  return data.access_token;
};

const sendGmailEmail = async (
  to: string,
  subject: string,
  htmlBody: string,
  gmailUserEmail: string,
  clientId: string,
  clientSecret: string
): Promise<boolean> => {
  let tokens = await getGmailTokens(gmailUserEmail);

  if (!tokens) {
    console.error('No Gmail tokens found for the specified user email:', gmailUserEmail);
    return false;
  }

  let accessToken = tokens.access_token;
  const expiresAt = new Date(tokens.expires_at).getTime();

  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    console.log('Gmail access token expired or near expiry, refreshing...');
    const newAccessToken = await refreshGmailAccessToken(tokens.refresh_token, clientId, clientSecret);
    if (!newAccessToken) {
      console.error('Failed to refresh Gmail access token.');
      return false;
    }
    accessToken = newAccessToken;

    const supabase = getSupabaseServiceRoleClient();
    const { error: updateError } = await supabase
      .from('gmail_tokens')
      .update({
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', tokens.user_id);

    if (updateError) {
      console.error('Error updating Gmail tokens in DB:', updateError);
    }
  }

  const emailContent =
    `To: ${to}\r\n` +
    `Subject: =?utf-8?B?${encodeBase64Url(subject)}?=\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `MIME-Version: 1.0\r\n` +
    `\r\n` +
    `${htmlBody}`;

  const raw = encodeBase64Url(emailContent);

  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error sending email via Gmail API:', response.status, errorText);
    return false;
  }

  return true;
};
// --- End Inlined Gmail Utility Functions ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, requestId } = await req.json();

    if (!email || !requestId) {
      return new Response(JSON.stringify({ error: 'Missing email or requestId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // 1. Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

    // 2. Store the code in the database
    const { error: insertError } = await supabaseClient
      .from('verification_codes')
      .insert({ request_id: requestId, email, code, expires_at: expiresAt });

    if (insertError) {
      console.error('Error inserting verification code:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store verification code.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Send email with the code using Gmail API
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID');
    const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET');

    if (!GMAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error('Gmail API environment variables (GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET) are not set.');
    }

    const emailHtml = `
      <p>Hello,</p>
      <p>Your verification code for accessing your track (ID: ${requestId.substring(0, 8)}) is:</p>
      <h2 style="font-size: 24px; font-weight: bold; color: #1C0357;">${code}</h2>
      <p>This code is valid for 5 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Warmly,</p>
      <p>Daniele Buatti</p>
    `;

    const emailSent = await sendGmailEmail(
      email,
      `Your Verification Code for Track Access`,
      emailHtml,
      GMAIL_USER, // Pass the email of the sender
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET
    );

    if (!emailSent) {
      throw new Error('Failed to send verification email via Gmail API.');
    }

    return new Response(JSON.stringify({ message: 'Verification code sent.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});