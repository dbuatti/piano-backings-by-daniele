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

    // Validate Gmail credentials
    if (!gmailAppPassword) {
      throw new Error('GMAIL_APP_PASSWORD not configured. Please add it to your Supabase project secrets.');
    }
    
    // Get pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'email')
      .eq('status', 'pending')
      .limit(10); // Process max 10 emails at a time
    
    if (fetchError) {
      throw new Error(`Failed to fetch pending emails: ${fetchError.message}`);
    }
    
    if (pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending emails to send'
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      );
    }
    
    // Process each email
    const results = [];
    for (const email of pendingEmails) {
      try {
        // Log email details (in a real implementation, you would send via SMTP)
        console.log('=== SENDING EMAIL ===');
        console.log('To:', email.recipient);
        console.log('From:', email.sender || gmailUser);
        console.log('Subject:', email.subject);
        console.log('Content:', email.content);
        console.log('=====================');
        
        // For now, we'll just mark as sent since we're using console logging
        // In a real implementation, you would use an SMTP library here
        
        // Update email status to "sent"
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id);
        
        if (updateError) {
          throw new Error(`Failed to update email status: ${updateError.message}`);
        }
        
        results.push({
          id: email.id,
          status: 'sent',
          recipient: email.recipient
        });
      } catch (emailError: any) {
        // Update email status to "failed"
        await supabase
          .from('notifications')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id);
        
        results.push({
          id: email.id,
          status: 'failed',
          error: emailError.message,
          recipient: email.recipient
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: `Processed ${pendingEmails.length} emails`,
        results
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