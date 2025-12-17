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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      throw new Error('Invalid JSON in request body');
    }
    
    const { sessionId } = requestBody;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing 'sessionId' in request body" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch the order using the service role client, bypassing RLS
    // We join the products table here to get product details
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, products(id, title, description, track_urls, vocal_ranges, sheet_music_url, key_signature, show_sheet_music_url, show_key_signature, master_download_link)') // ADDED master_download_link
      .eq('checkout_session_id', sessionId)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      if (error.code === 'PGRST116') { // PGRST116 is "no rows found"
        return new Response(JSON.stringify({ error: "Order not found." }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        order: order
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
    console.error("Error in get-order-by-session-id function:", error);
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