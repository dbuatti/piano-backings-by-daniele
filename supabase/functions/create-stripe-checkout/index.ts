// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[create-stripe-checkout] Function invoked");
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://pianobackingsbydaniele.vercel.app';
    
    if (!stripeSecretKey) {
      console.error("[create-stripe-checkout] STRIPE_SECRET_KEY is not set");
      throw new Error('Stripe key not configured.');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(), // Use fetch-based client for better Deno compatibility
    });

    const body = await req.json();
    const { product_id, request_ids, amount, description, customer_email } = body;

    console.log("[create-stripe-checkout] Received data:", { 
      hasProductId: !!product_id, 
      hasRequestIds: !!request_ids, 
      amount, 
      customer_email 
    });

    let line_items = [];
    let metadata: Record<string, string> = {};

    if (product_id) {
      console.log("[create-stripe-checkout] Handling Shop Product:", product_id);
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!, 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        console.error("[create-stripe-checkout] Product fetch error:", productError);
        throw new Error("Product not found");
      }

      line_items = [{
        price_data: {
          currency: product.currency?.toLowerCase() || 'aud',
          product_data: { 
            name: product.title, 
            description: product.description || undefined 
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: 1,
      }];
      metadata = { product_id: product.id };
    } else if (request_ids && amount) {
      console.log("[create-stripe-checkout] Handling Custom Request(s):", request_ids);
      line_items = [{
        price_data: {
          currency: 'aud',
          product_data: { 
            name: 'Custom Piano Backing Request', 
            description: description || 'Professional piano accompaniment.' 
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
      metadata = { 
        request_ids: Array.isArray(request_ids) ? request_ids.join(',') : request_ids 
      };
    } else {
      console.error("[create-stripe-checkout] Invalid parameters provided");
      throw new Error('Invalid request parameters.');
    }

    console.log("[create-stripe-checkout] Creating Stripe session...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: customer_email || undefined,
      success_url: `${siteUrl}/purchase-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/form-page`,
      metadata,
    });

    console.log("[create-stripe-checkout] Session created successfully:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("[create-stripe-checkout] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});