// @ts-ignore
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); // New secret for webhook verification

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in Supabase secrets.');
    }
    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured in Supabase secrets. Webhook verification will fail.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'No Stripe signature header found.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received Stripe event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const productId = session.metadata?.product_id;
      const customerEmail = session.customer_details?.email;
      const amountTotal = session.amount_total;
      const currency = session.currency;
      const paymentIntentId = session.payment_intent as string;

      if (!productId || !customerEmail || amountTotal === null || currency === null) {
        console.error('Missing essential data in checkout.session.completed event:', { productId, customerEmail, amountTotal, currency });
        return new Response(JSON.stringify({ error: 'Missing essential data in checkout session.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch product details to ensure it exists and get its price
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, price')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('Product not found for order creation:', productId, productError);
        return new Response(JSON.stringify({ error: `Product not found for order creation: ${productId}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create an order record in your Supabase 'orders' table
      const { data: order, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert({
          product_id: productId,
          customer_email: customerEmail,
          amount: amountTotal / 100, // Convert cents back to dollars
          currency: currency.toUpperCase(),
          status: 'completed', // Mark as completed on successful checkout
          payment_intent_id: paymentIntentId,
        })
        .select();

      if (insertError) {
        console.error('Error inserting order into database:', insertError);
        throw new Error(`Failed to insert order: ${insertError.message}`);
      }

      console.log('Order created successfully:', order);

      // TODO: Implement digital product delivery here (e.g., send download link via email)
      // For now, we'll just log it.
      console.log(`Digital product delivery for order ${order[0].id} for product ${productId} to ${customerEmail}`);

    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});