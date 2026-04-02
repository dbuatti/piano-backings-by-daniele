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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const defaultSenderEmail = Deno.env.get('GMAIL_USER') || 'pianobackingsbydaniele@gmail.com';

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe keys not configured.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature!, stripeWebhookSecret);
    } catch (err: any) {
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const productId = session.metadata?.product_id;
      const userId = session.client_reference_id;
      const customerEmail = session.customer_details?.email;

      if (!productId || !customerEmail) throw new Error('Missing session data.');

      // Fetch product details
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) throw new Error('Product not found.');

      // 1. Create Order Record
      await supabaseAdmin.from('orders').insert({
        product_id: productId,
        customer_email: customerEmail,
        amount: session.amount_total! / 100,
        currency: session.currency!.toUpperCase(),
        status: 'completed',
        user_id: userId,
        checkout_session_id: session.id,
      });

      // 2. Handle Credits if it's a credit pack
      if (product.product_type === 'credit_pack' && userId) {
        const { data: existingCredits } = await supabaseAdmin
          .from('user_credits')
          .select('balance')
          .eq('user_id', userId)
          .eq('credit_type', product.track_type)
          .single();

        const newBalance = (existingCredits?.balance || 0) + (product.credit_amount || 0);

        await supabaseAdmin.from('user_credits').upsert({
          user_id: userId,
          credit_type: product.track_type,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,credit_type' });
        
        console.log(`Granted ${product.credit_amount} credits to user ${userId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});