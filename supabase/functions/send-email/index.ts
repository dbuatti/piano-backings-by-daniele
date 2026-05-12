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
    const adminEmails = [ADMIN_EMAIL, 'pianobackingsbydaniele@gmail.com'];

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_USER) {
      throw new Error(`Missing required environment variables.`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, cc, replyTo, senderEmail } = await req.json();

    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user && (adminEmails.includes(user.email!) || user.email === senderEmail)) {
        isAuthorized = true;
      }
    } else if (adminEmails.includes(senderEmail)) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
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

    let message = `To: ${recipientList.join(', ')}\r\n`;
    message += `From: ${GMAIL_USER}\r\n`;
    message += `Subject: ${subject}\r\n`;
    if (cc) message += `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}\r\n`;
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});