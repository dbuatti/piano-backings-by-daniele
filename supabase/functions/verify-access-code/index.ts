/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, requestId, code } = await req.json();

    if (!email || !requestId || !code) {
      return new Response(JSON.stringify({ error: 'Missing email, requestId, or code' }), {
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

    // 1. Find and validate the verification code
    const { data: verificationData, error: fetchError } = await supabaseClient
      .from('verification_codes')
      .select('*')
      .eq('request_id', requestId)
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString()) // Ensure not expired
      .single();

    if (fetchError || !verificationData) {
      console.error('Verification code fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Invalid or expired verification code.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Delete the used verification code
    const { error: deleteError } = await supabaseClient
      .from('verification_codes')
      .delete()
      .eq('id', verificationData.id);

    if (deleteError) {
      console.warn('Failed to delete used verification code:', deleteError);
    }

    // 3. Generate a temporary access token
    const tempAccessToken = crypto.randomUUID();
    const tempTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes access

    const { error: insertTempTokenError } = await supabaseClient
      .from('temp_access_tokens')
      .insert({ token: tempAccessToken, request_id: requestId, email, expires_at: tempTokenExpiresAt });

    if (insertTempTokenError) {
      console.error('Error inserting temporary access token:', insertTempTokenError);
      return new Response(JSON.stringify({ error: 'Failed to grant temporary access.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Return the temporary access token to the client
    return new Response(JSON.stringify({ tempAccessToken }), {
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