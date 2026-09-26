// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Used by the purchase confirmation page. The checkout session id (from Stripe's
// redirect, or a random id for free orders) acts as the proof of purchase, so guests
// can download what they just bought without an account.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 20) {
      return json({ error: 'Missing or invalid sessionId' }, 400);
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, product_id, status, includes_sheet_music, sheet_music_url, products(id, title, product_type)')
      .eq('checkout_session_id', sessionId);
    if (error) throw error;

    if (orders && orders.length > 0) {
      const productIds = orders.map((o) => o.product_id).filter(Boolean);
      const { data: files } = await supabaseAdmin
        .from('product_files')
        .select('product_id, track_urls, master_download_link')
        .in('product_id', productIds);
      const byProduct = Object.fromEntries((files || []).map((f) => [f.product_id, f]));
      const paid = (o) => o.status === 'completed' || o.status === 'paid';

      return json({
        type: 'shop',
        orders: orders.map((o) => ({
          ...o,
          products: o.products && {
            ...o.products,
            track_urls: paid(o) ? byProduct[o.product_id]?.track_urls || [] : [],
            master_download_link: paid(o) ? byProduct[o.product_id]?.master_download_link || null : null,
          },
        })),
      });
    }

    const { data: requests, error: requestError } = await supabaseAdmin
      .from('backing_requests')
      .select('song_title')
      .eq('stripe_session_id', sessionId);
    if (requestError) throw requestError;
    if (requests && requests.length > 0) return json({ type: 'custom', requests });

    return json({ error: 'Order not found.' }, 404);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
