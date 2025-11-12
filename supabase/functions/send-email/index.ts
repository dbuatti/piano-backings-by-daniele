// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Send email function invoked");
    
    // Get environment variables
    const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
    const GMAIL_USER = Deno.env.get("GMAIL_USER"); // This will be used as the sender email

    console.log('Environment variables status:', {
      GMAIL_CLIENT_ID: GMAIL_CLIENT_ID ? 'SET' : 'NOT SET',
      GMAIL_CLIENT_SECRET: GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET',
      GMAIL_USER: GMAIL_USER ? 'SET' : 'NOT SET',
    });

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_USER) {
      const missingVars = [];
      if (!GMAIL_CLIENT_ID) missingVars.push('GMAIL_CLIENT_ID');
      if (!GMAIL_CLIENT_SECRET) missingVars.push('GMAIL_CLIENT_SECRET');
      if (!GMAIL_USER) missingVars.push('GMAIL_USER');
      
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Create a Supabase client with service role key (has full permissions)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body:", requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    let { to, subject, html, cc, bcc, replyTo, senderEmail } = requestBody;

    // Get the authenticated user (this will be the Supabase user, not the Gmail user)
    // We still check for a user token for logging purposes, but it's not required for operation
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", !!authHeader);
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        
        if (!userError && user) {
          console.log("Authenticated Supabase user (for logging):", user.email);
        }
      } catch (authError) {
        console.log("Could not parse auth header for logging, continuing with service role");
      }
    } else {
      console.log("No auth header provided, proceeding with service role access");
    }
    
    if (!to || !subject || !html || !senderEmail) {
      return new Response(JSON.stringify({ error: "Missing 'to', 'subject', 'html', or 'senderEmail' content" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalize 'to' field: if it's a string, split by comma into an array
    let recipientList: string[];
    if (typeof to === 'string') {
      recipientList = to.split(',').map((email: string) => email.trim()).filter(Boolean);
    } else if (Array.isArray(to)) {
      recipientList = to.map((email: string) => email.trim()).filter(Boolean);
    } else {
      recipientList = [];
    }

    if (recipientList.length === 0) {
      return new Response(JSON.stringify({ error: "No valid recipient email addresses provided." }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Function to refresh access token using refresh token
    const refreshAccessToken = async (emailToFetchTokenFor: string) => {
      console.log(`Attempting to refresh access token for ${emailToFetchTokenFor}`);
      
      // 1. Get the Supabase user ID for the sender email using the service role
      const { data: userData, error: userLookupError } = await supabaseAdmin.auth.admin.getUserByEmail(emailToFetchTokenFor);

      if (userLookupError || !userData?.user) {
        console.error(`Error looking up user by email ${emailToFetchTokenFor}:`, userLookupError?.message || 'User not found');
        throw new Error(`Supabase user not found for sender email "${emailToFetchTokenFor}". Please ensure this email is registered in Supabase and has completed Gmail OAuth.`);
      }
      
      const userIdToFetchTokenFor = userData.user.id;
      console.log(`Found Supabase user ID for sender email (${emailToFetchTokenFor}):`, userIdToFetchTokenFor);

      // 2. Get the stored refresh token for this user
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('gmail_tokens')
        .select('refresh_token, access_token, expires_at')
        .eq('user_id', userIdToFetchTokenFor)
        .single();
      
      if (tokenError || !tokenData) {
        console.error(`Error fetching Gmail token for user ${emailToFetchTokenFor} (ID: ${userIdToFetchTokenFor}):`, tokenError?.message || 'No token data');
        throw new Error(`No Gmail tokens found for user "${emailToFetchTokenFor}" (ID: ${userIdToFetchTokenFor}) in database. Please ensure this user has completed Gmail OAuth.`);
      }
      
      // Check if we have a refresh token
      if (!tokenData.refresh_token) {
        // If no refresh token, check if existing access token is still valid
        if (tokenData.expires_at && new Date(tokenData.expires_at) > new Date()) {
          console.log("Using existing access token (no refresh token available, but access token is still valid)");
          return tokenData.access_token;
        }
        throw new Error('No refresh token available and access token has expired. Please complete Gmail OAuth again.');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for token refresh

      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: GMAIL_CLIENT_ID!,
            client_secret: GMAIL_CLIENT_SECRET!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token'
          }),
          signal: controller.signal // Apply the abort signal
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token refresh error response:', response.status, errorText);
          throw new Error(`Failed to refresh access token: ${response.status} - ${errorText}`);
        }
        
        const tokenResponse = await response.json();
        console.log("Access token refreshed successfully");
        
        // Update the stored access token
        const { error: updateError } = await supabaseAdmin
          .from('gmail_tokens')
          .update({
            access_token: tokenResponse.access_token,
            expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          })
          .eq('user_id', userIdToFetchTokenFor); // Update using the correct user's ID
        
        if (updateError) {
          console.error('Error updating access token in DB:', updateError);
          // Don't throw here, as we still have the token
        }
        
        return tokenResponse.access_token;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Gmail token refresh timed out.');
        }
        throw error; // Re-throw other errors
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Get or refresh the access token for the specified senderEmail
    let accessToken;
    try {
      accessToken = await refreshAccessToken(senderEmail);
    } catch (refreshError) {
      console.error('Error refreshing access token:', refreshError);
      throw new Error(`Failed to refresh access token: ${refreshError.message}`);
    }
    
    // Create the email message in RFC 2822 format
    let message = `To: ${recipientList.join(', ')}\r\n`; // Join multiple recipients with comma
    message += `From: ${GMAIL_USER}\r\n`; // This will be pianobackingsbydaniele@gmail.com
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
    
    console.log("Sending email via Gmail API...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for Gmail API send

    try {
      // Send email via Gmail API
      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        }),
        signal: controller.signal // Apply the abort signal
      });
      
      if (!gmailResponse.ok) {
        const errorText = await gmailResponse.text();
        console.error('Gmail API error response:', errorText);
        
        // Check if this is a Gmail API not enabled error
        if (errorText.includes('Gmail API has not been used in project') || 
            errorText.includes('SERVICE_DISABLED')) {
          throw new Error(`Gmail API is not enabled for your Google Cloud project. Please visit https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=138848645565 to enable it, then wait a few minutes for the changes to propagate.`);
        }
        
        throw new Error(`Failed to send email: ${gmailResponse.status} - ${errorText}`);
      }
      
      const gmailData = await gmailResponse.json();
      console.log("Email sent successfully via Gmail API", gmailData);
      
      // Store a record in the notifications table for tracking
      await supabaseAdmin
        .from('notifications')
        .insert([
          {
            recipient: recipientList.join(', '), // Store all recipients
            sender: GMAIL_USER,
            subject: subject,
            content: html,
            status: 'sent',
            type: 'email'
          }
        ]);

      return new Response(
        JSON.stringify({ 
          message: `Email sent successfully to ${recipientList.join(', ')}`,
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
      if (error.name === 'AbortError') {
        throw new Error('Gmail API send timed out.');
      }
      throw error; // Re-throw other errors
    } finally {
      clearTimeout(timeoutId);
    }
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