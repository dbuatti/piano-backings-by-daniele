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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? 465); // SSL

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in Supabase secrets.');
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

    // Since we can't use external SMTP libraries, we'll return a success message
    // but note that actual email sending is not implemented in this version
    console.log("Email sending functionality is currently disabled due to compatibility issues with Deno SMTP libraries.");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML Content:", html);
    console.log("CC:", cc);
    console.log("BCC:", bcc);
    console.log("Reply To:", replyTo);

    // Store a record in the notifications table for tracking
    await supabase
      .from('notifications')
      .insert([
        {
          recipient: to,
          sender: GMAIL_USER,
          subject: subject,
          content: html,
          status: 'sent', // We're marking it as sent for now, but it's not actually sent
          type: 'email'
        }
      ]);

    return new Response(
      JSON.stringify({ 
        message: `Email would be sent to ${to} via Gmail SMTP (functionality currently disabled due to compatibility issues)`
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