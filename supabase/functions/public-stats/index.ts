// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Public, unauthenticated endpoint: returns only safe aggregate counts for
// landing-page social proof. Never returns individual request/client data.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { count: tracksDelivered } = await supabaseAdmin
      .from('backing_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { data: paidEmails } = await supabaseAdmin
      .from('backing_requests')
      .select('email')
      .eq('is_paid', true);

    const uniqueClients = new Set((paidEmails || []).map((r) => r.email)).size;

    return new Response(
      JSON.stringify({
        tracksDelivered: tracksDelivered || 0,
        performersHelped: uniqueClients,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
