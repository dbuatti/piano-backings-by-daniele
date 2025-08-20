// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { Resend } from 'https://esm.sh/resend@1.1.0'; // Import Resend

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY'); // Get Resend API key from secrets

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY must be set in Supabase secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey); // Initialize Resend client

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
    
    const { to, subject, template, requestData } = await req.json();
    
    if (!to || !subject || !template) {
      throw new Error('Missing required fields: to, subject, or template');
    }
    
    let emailContent = template;
    if (requestData) {
      Object.keys(requestData).forEach(key => {
        const placeholder = `{{${key}}}`;
        emailContent = emailContent.replace(new RegExp(placeholder, 'g'), requestData[key]);
      });
    }
    
    // Send email using Resend
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'onboarding@resend.dev', // IMPORTANT: Use 'onboarding@resend.dev' for testing with free tier
      to: [to],
      subject: subject,
      html: emailContent, // Use html for rich content, or text for plain text
    });

    if (resendError) {
      console.error('Resend email error:', resendError);
      throw new Error(`Failed to send email via Resend: ${resendError.message}`);
    }

    console.log('Resend email sent successfully:', resendData);

    // Store a record in the notifications table for tracking
    await supabase
      .from('notifications')
      .insert([
        {
          recipient: to,
          sender: 'Resend', // Update sender to reflect Resend
          subject: subject,
          content: emailContent,
          status: 'sent',
          type: 'email'
        }
      ]);

    return new Response(
      JSON.stringify({ 
        message: `Email successfully sent to ${to} via Resend`
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