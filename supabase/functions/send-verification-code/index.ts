/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'; // UPDATED Supabase client version
import { sendGmailEmail } from '../_shared/gmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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