// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[create-stripe-checkout] Function invoked");
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://pianobackingsbydaniele.vercel.app';
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in Supabase secrets');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const requestData = await req.json();
    const { product_id, request_ids, amount, description, customer_email } = requestData;

    console.log("[create-stripe-checkout] Received data:", { 
      hasProductId: !!product_id, 
      hasRequestIds: !!request_ids, 
      amount, 
      customer_email 
    });

    let line_items = [];
    let metadata: Record<string, string> = {};

    // Case 1: Shop Product Purchase
    if (product_id) {
      console.log("[create-stripe-checkout] Handling Shop Product:", product_id);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        throw new Error(`Product not found: ${productError?.message || 'Unknown error'}`);
      }

      line_items = [{
        price_data: {
          currency: product.currency?.toLowerCase() || 'aud',
          product_data: {
            name: product.title,
            description: product.description || undefined,
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: 1,
      }];
      metadata = { product_id: product.id };
    } 
    // Case 2: Custom Backing Request Payment
    else if (request_ids && amount) {
      console.log("[create-stripe-checkout] Handling Custom Request(s):", request_ids);
      
      // Ensure request_ids is a string for metadata
      const idsString = Array.isArray(request_ids) ? request_ids.join(',') : request_ids;

      line_items = [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Custom Piano Backing Request',
            description: description || 'Professional piano accompaniment recorded to your specifications.',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
      metadata = { request_ids: idsString };
    } 
    else {
      console.error("[create-stripe-checkout] Missing required parameters", requestData);
      throw new Error('Invalid request: Either product_id or (request_ids and amount) must be provided.');
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
  } catch (error: any) {
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