// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const gmailUser = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com';
    // @ts-ignore
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD') || '';
    
    // Create a Supabase client with service role key (has full permissions)
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
    const { to, from, subject, template, requestData } = await req.json();
    
    // Validate required fields
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
    
    // Validate Gmail credentials
    if (!gmailAppPassword) {
      throw new Error('GMAIL_APP_PASSWORD not configured. Please add it to your Supabase project secrets.');
    }
    
    // Create email message in RFC 2822 format
    const message = [
      `To: ${to}`,
      `From: ${from || gmailUser}`,
      `Subject: ${subject}`,
      '',
      emailContent
    ].join('\r\n');
    
    // Log the email for debugging (this will appear in Supabase function logs)
    console.log('=== EMAIL TO BE SENT ===');
    console.log(message);
    console.log('========================');
    
    // For now, we'll just return success since we're logging the email
    // In a real implementation, you would send it via SMTP
    
    return new Response(
      JSON.stringify({ 
        message: 'Email sent successfully (simulated)',
        details: {
          to: to,
          from: from || gmailUser,
          subject: subject
        }
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
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});