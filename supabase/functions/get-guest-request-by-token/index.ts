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
    console.log("get-guest-request-by-token function invoked");

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
    
    const { request_id, token } = requestBody;

    // Add logging for received parameters
    console.log("Received request_id:", request_id);
    console.log("Received token:", token);

    if (!request_id || !token) {
      return new Response(JSON.stringify({ error: "Missing 'request_id' or 'token' in request body" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch requests using the service role client, bypassing RLS
    // Now, it requires both the ID and the guest_access_token to match
    const { data, error } = await supabaseAdmin
      .from('backing_requests')
      .select('*')
      .eq('id', request_id)
      .eq('guest_access_token', token)
      .single(); // Expecting a single result

    if (error) {
      console.error('Supabase query error:', error); // Log the Supabase error
      // Return 404 if no data found, otherwise 500 for other errors
      if (error.code === 'PGRST116') { // PGRST116 is "no rows found"
        return new Response(JSON.stringify({ error: "Request not found or invalid token." }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`Failed to fetch request: ${error.message}`);
    }

    console.log(`Found request for ID: ${request_id}`);
    console.log('Supabase query data:', data); // Log the data returned by Supabase

    return new Response(
      JSON.stringify({ 
        request: data
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
    console.error("Error in get-guest-request-by-token function:", error);
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