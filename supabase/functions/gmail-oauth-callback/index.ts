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

// Redeploy trigger comment added on 2023-10-27

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
    const GMAIL_REDIRECT_URI = Deno.env.get("GMAIL_REDIRECT_URI") || "http://localhost:8080/gmail-oauth-callback";

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in Supabase secrets.');
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
      throw new Error('Unauthorized: Only admin can complete Gmail OAuth');
    }
    
    const { code } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), { status: 400 });
    }

    // Exchange authorization code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: GMAIL_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Store the refresh token in Supabase (we don't need to store the access token since we can refresh it)
    const { error: insertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: user.id,
        // We only store the refresh token since access tokens expire quickly
        refresh_token: tokenData.refresh_token,
        // We also store the access token for immediate use, but we'll refresh it when needed
        access_token: tokenData.access_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        token_type: tokenData.token_type
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Error storing tokens:', insertError);
      throw new Error('Failed to store tokens');
    }

    return new Response(
      JSON.stringify({ 
        message: "Gmail OAuth completed successfully"
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
    console.error("Error in Gmail OAuth callback:", error);
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