/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface GmailToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
}

// Helper to encode email content to base64url
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
  
  // First, get the user_id from auth.users based on the email
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

export const sendGmailEmail = async (
  to: string,
  subject: string,
  htmlBody: string,
  gmailUserEmail: string, // The email address of the Gmail account used for sending
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

  // Check if token is expired or close to expiring (e.g., within 5 minutes)
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    console.log('Gmail access token expired or near expiry, refreshing...');
    const newAccessToken = await refreshGmailAccessToken(tokens.refresh_token, clientId, clientSecret);
    if (!newAccessToken) {
      console.error('Failed to refresh Gmail access token.');
      return false;
    }
    accessToken = newAccessToken;

    // Update the database with the new access token and expiry
    const supabase = getSupabaseServiceRoleClient();
    const { error: updateError } = await supabase
      .from('gmail_tokens')
      .update({
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // Assuming 1 hour expiry for new token
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', tokens.user_id); // Use the user_id from the fetched tokens

    if (updateError) {
      console.error('Error updating Gmail tokens in DB:', updateError);
      // Continue trying to send email with new token even if DB update failed
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