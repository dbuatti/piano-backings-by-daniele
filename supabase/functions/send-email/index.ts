// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    // @ts-ignore
    const gmailUser = Deno.env.get('GMAIL_USER');
    // @ts-ignore
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    
    if (!gmailUser || !gmailAppPassword) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in Supabase secrets.');
    }
    
    // Create a Supabase client with service role key
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
    
    // Check if user is admin
    if (user.email !== 'daniele.buatti@gmail.com') {
      throw new Error('Unauthorized: Only admin can send emails');
    }
    
    // Get the request data
    const { to, subject, template, requestData } = await req.json();
    
    if (!to || !subject || !template) {
      throw new Error('Missing required fields: to, subject, or template');
    }
    
    // Replace template variables
    let emailContent = template;
    if (requestData) {
      Object.keys(requestData).forEach(key => {
        const placeholder = `{{${key}}}`;
        emailContent = emailContent.replace(new RegExp(placeholder, 'g'), requestData[key]);
      });
    }
    
    // Setup SMTP client
    const client = new SmtpClient();
    await client.connect({
      hostname: "smtp.gmail.com",
      port: 587, // Use port 587 for STARTTLS
      username: gmailUser,
      password: gmailAppPassword,
    });

    // Send the email
    await client.send({
      from: gmailUser,
      to: to,
      subject: subject,
      content: emailContent,
    });

    await client.close();
    
    // Store a record in the notifications table for tracking
    await supabase
      .from('notifications')
      .insert([
        {
          recipient: to,
          sender: gmailUser,
          subject: subject,
          content: emailContent,
          status: 'sent', // Mark as sent directly
          type: 'email'
        }
      ]);

    return new Response(
      JSON.stringify({ 
        message: `Email successfully sent to ${to}`
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
    console.error("Error sending email:", error);
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