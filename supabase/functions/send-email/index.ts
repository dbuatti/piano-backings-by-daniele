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
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || 'daniele.buatti@gmail.com';
    // Both admin logins may send, whatever ADMIN_EMAIL is set to (matches the site's
    // ADMIN_EMAILS). Previously an ADMIN_EMAIL secret could lock out daniele.buatti@gmail.com.
    const adminEmails = [...new Set([ADMIN_EMAIL, 'daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'])];
    const BCC_EMAIL = Deno.env.get("BCC_EMAIL") || 'pianobackingsbydaniele@gmail.com';

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_USER) {
      throw new Error(`Missing required environment variables.`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    // Header values must be single-line: a CR/LF in (say) a song title in the subject
    // would otherwise let the sender add headers such as Bcc.
    const oneLine = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
    const oneLineList = (value: unknown) =>
      Array.isArray(value) ? value.map(oneLine) : value ? oneLine(value) : value;
    const to = oneLineList(body.to);
    const cc = oneLineList(body.cc);
    const subject = oneLine(body.subject);
    const replyTo = body.replyTo ? oneLine(body.replyTo) : undefined;
    const senderEmail = oneLine(body.senderEmail);
    const html = body.html;

    // Only other edge functions (service-role key) and signed-in admins may send.
    // Anonymous calls used to be accepted whenever senderEmail named an admin inbox,
    // which let anyone send arbitrary mail from that Gmail account.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let isAuthorized = false;

    if (token && token === supabaseServiceKey) {
      isAuthorized = true;
    } else if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user && (adminEmails.includes(user.email!) || user.email === senderEmail)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!to || !subject || !html || !senderEmail) {
      return new Response(JSON.stringify({ error: "Missing to, subject, html or senderEmail" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const refreshAccessToken = async (email: string) => {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const userFound = usersData.users.find(u => u.email === email);
      if (!userFound) throw new Error(`User not found for ${email}`);

      const { data: tokenData } = await supabaseAdmin
        .from('gmail_tokens')
        .select('*')
        .eq('user_id', userFound.id)
        .single();
      
      if (!tokenData?.refresh_token) throw new Error('No refresh token available');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GMAIL_CLIENT_ID,
          client_secret: GMAIL_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token'
        })
      });
      
      const tokenResponse = await response.json();
      await supabaseAdmin.from('gmail_tokens').update({
        access_token: tokenResponse.access_token,
        expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      }).eq('user_id', userFound.id);
      
      return tokenResponse.access_token;
    };

    const accessToken = await refreshAccessToken(senderEmail);
    const recipientList = Array.isArray(to) ? to : to.split(',').map((e: string) => e.trim());
    const ccList = cc ? (Array.isArray(cc) ? cc : cc.split(',').map((e: string) => e.trim())) : [];

    const encodeHeaderValue = (value: string) => {
      if (/^[\x00-\x7F]*$/.test(value)) return value;
      return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
    };

    // Avoid sending a second copy to an address that's already a direct To/Cc recipient
    // (previously pianobackingsbydaniele@gmail.com could appear in `to` AND get BCC'd,
    // landing twice in the same inbox and looking like a duplicate request).
    const alreadyRecipient = [...recipientList, ...ccList]
      .some((e: string) => e.toLowerCase() === BCC_EMAIL.toLowerCase());

    let message = `To: ${recipientList.join(', ')}\r\n`;
    message += `From: ${GMAIL_USER}\r\n`;
    message += `Subject: ${encodeHeaderValue(subject)}\r\n`;
    if (!alreadyRecipient) message += `Bcc: ${BCC_EMAIL}\r\n`;
    if (cc) message += `Cc: ${ccList.join(', ')}\r\n`;
    if (replyTo) message += `Reply-To: ${replyTo}\r\n`;
    message += 'MIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n' + html;
    
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!gmailResponse.ok) throw new Error(await gmailResponse.text());

    await supabaseAdmin.from('notifications').insert([{
      recipient: recipientList.join(', '),
      sender: GMAIL_USER,
      subject,
      content: html,
      status: 'sent',
      type: 'email'
    }]);

    return new Response(
      JSON.stringify({ message: `Email sent successfully` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    // Log it so the reason shows in Supabase → Edge Functions → send-email → Logs.
    console.error('send-email failed:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});