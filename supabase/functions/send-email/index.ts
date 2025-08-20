// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Declare Deno global to resolve TypeScript errors
declare global {
  namespace Deno {
    namespace env {
      function get(key: string): string | undefined;
    }
  }
}

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to refresh access token
async function refreshAccessToken(refreshToken: string) {
  const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
  const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh access token: ${errorText}`);
  }
  
  const tokenData = await response.json();
  return tokenData.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
    const GMAIL_USER = Deno.env.get("GMAIL_USER"); // This will be used as the sender email

    // Log environment variable status for debugging
    console.log('Environment variables status:', {
      GMAIL_CLIENT_ID: GMAIL_CLIENT_ID ? 'SET' : 'NOT SET',
      GMAIL_CLIENT_SECRET: GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET',
      GMAIL_USER: GMAIL_USER ? 'SET' : 'NOT SET'
    });

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_USER) {
      throw new Error(`Missing required environment variables:
        GMAIL_CLIENT_ID: ${GMAIL_CLIENT_ID ? 'SET' : 'NOT SET'}
        GMAIL_CLIENT_SECRET: ${GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET'}
        GMAIL_USER: ${GMAIL_USER ? 'SET' : 'NOT SET'}`);
    }

    // Create a Supabase client with service role key (has full permissions)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }
    
    // Check if user is admin (daniele.buatti@gmail.com)
    if (user.email !== 'daniele.buatti@gmail.com') {
      throw new Error('Unauthorized: Only admin can send emails');
    }
    
    const { to, subject, html, cc, bcc, replyTo } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or html content" }), { status: 400 });
    }

    // Retrieve stored tokens for the user
    const { data: tokens, error: tokensError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (tokensError || !tokens) {
      throw new Error('No Gmail tokens found for user. Please complete OAuth first.');
    }
    
    let accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    
    // Check if access token is expired
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    if (now >= expiresAt) {
      // Refresh the access token
      try {
        accessToken = await refreshAccessToken(refreshToken);
        
        // Update the stored access token
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: accessToken,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } catch (refreshError) {
        console.error('Error refreshing access token:', refreshError);
        throw new Error('Failed to refresh access token');
      }
    }
    
    // Create the email message in RFC 2822 format
    let message = `To: ${Array.isArray(to) ? to.join(', ') : to}\r\n`;
    message += `From: ${GMAIL_USER}\r\n`;
    message += `Subject: ${subject}\r\n`;
    
    if (cc) {
      message += `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}\r\n`;
    }
    
    if (replyTo) {
      message += `Reply-To: ${replyTo}\r\n`;
    }
    
    // Add MIME headers for HTML content
    message += 'MIME-Version: 1.0\r\n';
    message += 'Content-Type: text/html; charset=utf-8\r\n';
    message += '\r\n';
    message += html;
    
    // Base64 encode the message
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send email via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });
    
    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('Gmail API error:', errorText);
      throw new Error(`Failed to send email: ${gmailResponse.status} - ${errorText}`);
    }
    
    const gmailData = await gmailResponse.json();
    
    // Store a record in the notifications table for tracking
    await supabase
      .from('notifications')
      .insert([
        {
          recipient: to,
          sender: GMAIL_USER,
          subject: subject,
          content: html,
          status: 'sent',
          type: 'email'
        }
      ]);

    return new Response(
      JSON.stringify({ 
        message: `Email sent successfully to ${to}`,
        gmailData: gmailData
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});