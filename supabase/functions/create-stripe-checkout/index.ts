// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'npm:stripe@16.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function validatePromoCode(supabaseAdmin, code: string, amount: number) {
  const trimmedCode = code.trim().toUpperCase();

  const { data: promo, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .ilike('code', trimmedCode)
    .maybeSingle();

  if (error) throw error;
  if (!promo) throw new Error('Invalid promo code.');
  if (!promo.is_active) throw new Error('This promo code is no longer active.');
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    throw new Error('This promo code has reached its maximum number of uses.');
  }

  const now = new Date().toISOString();
  if (promo.starts_at && now < promo.starts_at) throw new Error('This promo code is not yet available.');
  if (promo.expires_at && now > promo.expires_at) throw new Error('This promo code has expired.');

  if (promo.min_purchase_amount !== null && amount < promo.min_purchase_amount) {
    throw new Error(`Minimum purchase amount of $${promo.min_purchase_amount.toFixed(2)} is required for this promo code.`);
  }

  let discountAmount = 0;
  if (promo.discount_type === 'percentage') {
    discountAmount = Math.round((amount * promo.discount_value / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(promo.discount_value, amount);
  }

  const finalAmount = Math.max(0, amount - discountAmount);

  return {
    promoCodeId: promo.id,
    discountAmount,
    originalAmount: amount,
    finalAmount,
  };
}

Deno.serve(async (req) => {
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
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader !== 'Bearer undefined') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (!userError && user) {
          userId = user.id;
          userEmail = user.email;
          console.log("[create-stripe-checkout] Authenticated user ID:", userId);
        }
      } catch (authErr) {
        console.error("[create-stripe-checkout] Auth error:", authErr.message);
      }
    }

    const body = await req.json();
    const { product_id, request_ids, amount, description, customer_email, promo_code } = body;

    console.log("[create-stripe-checkout] Received data:", {
      hasProductId: !!product_id,
      hasRequestIds: !!request_ids,
      amount,
      customer_email,
      hasPromoCode: !!promo_code,
      userId
    });

    let line_items = [];
    let metadata: Record<string, string> = {};
    let paymentAmount = amount || 0;

    if (product_id) {
      console.log("[create-stripe-checkout] Handling Shop Product:", product_id);
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        console.error("[create-stripe-checkout] Product fetch error:", productError);
        throw new Error("Product not found");
      }

      paymentAmount = product.price;
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

    // Apply promo code if provided
    let promoResult = null;
    if (promo_code) {
      console.log("[create-stripe-checkout] Validating promo code:", promo_code);
      promoResult = await validatePromoCode(supabaseAdmin, promo_code, paymentAmount);

      if (promoResult.finalAmount < paymentAmount) {
        line_items[0].price_data.unit_amount = Math.round(promoResult.finalAmount * 100);

        metadata.promo_code_id = promoResult.promoCodeId;
        metadata.original_amount = promoResult.originalAmount.toString();
        metadata.discount_amount = promoResult.discountAmount.toString();
        metadata.promo_code = promo_code.trim().toUpperCase();
      }
    }

    // Handle free orders (100% off promo) — skip Stripe entirely
    const finalTotal = promoResult?.finalAmount ?? paymentAmount;
    if (finalTotal === 0) {
      console.log("[create-stripe-checkout] Free order — skipping Stripe");

      const customerEmail = customer_email || userEmail || 'unknown';

      if (product_id) {
        await supabaseAdmin.from('orders').insert({
          product_id,
          customer_email: customerEmail,
          amount: 0,
          currency: 'AUD',
          status: 'completed',
          user_id: userId,
          checkout_session_id: null,
        });
      }
      if (request_ids) {
        const ids = typeof request_ids === 'string' ? request_ids.split(',') : request_ids;
        await supabaseAdmin.from('backing_requests').update({ is_paid: true }).in('id', ids);
      }

      // Record promo code redemption
      if (promoResult) {
        await supabaseAdmin.rpc('increment_promo_code_use', { p_id: promoResult.promoCodeId });
        await supabaseAdmin.from('promo_code_redemptions').insert({
          promo_code_id: promoResult.promoCodeId,
          user_id: userId || null,
          email: customerEmail,
          order_id: null,
          stripe_session_id: null,
          discount_amount: promoResult.discountAmount,
          original_amount: promoResult.originalAmount,
          final_amount: 0,
          metadata: { promo_code: promo_code.trim().toUpperCase(), product_id: product_id || null },
        });
      }

      const redirectUrl = product_id
        ? `${siteUrl}/purchase-confirmation?free=true`
        : `${siteUrl}/user-dashboard`;

      return new Response(
        JSON.stringify({ url: redirectUrl, free: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log("[create-stripe-checkout] Creating Stripe session...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: customer_email || undefined,
      client_reference_id: userId || undefined,
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
