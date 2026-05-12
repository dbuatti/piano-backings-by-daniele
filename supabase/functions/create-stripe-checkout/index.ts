// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'npm:stripe@^16.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://pianobackingsbydaniele.vercel.app';
    
    if (!stripeSecretKey) throw new Error('Stripe key not configured.');

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
    const { product_id, request_ids, amount, description, customer_email } = await req.json();

    let line_items = [];
    let metadata: Record<string, string> = {};

    if (product_id) {
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', product_id).single();
      if (!product) throw new Error("Product not found");

      line_items = [{
        price_data: {
          currency: product.currency?.toLowerCase() || 'aud',
          product_data: { name: product.title, description: product.description || undefined },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: 1,
      }];
      metadata = { product_id: product.id };
    } else if (request_ids && amount) {
      line_items = [{
        price_data: {
          currency: 'aud',
          product_data: { name: 'Custom Piano Backing Request', description: description || 'Professional piano accompaniment.' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
      metadata = { request_ids: Array.isArray(request_ids) ? request_ids.join(',') : request_ids };
    } else {
      throw new Error('Invalid request parameters.');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: customer_email || undefined,
      success_url: `${siteUrl}/purchase-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/form-page`,
      metadata,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});