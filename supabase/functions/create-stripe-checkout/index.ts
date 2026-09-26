// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'npm:stripe@16.2.0';
import { SHOP_SHEET_MUSIC_PRICE } from '../_shared/pricing.ts';
import { fulfilShopPurchase, type ShopLine } from '../_shared/shop-fulfilment.ts';

const MAX_CART_ITEMS = 20;
const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

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
    const siteUrl = Deno.env.get('SITE_URL') || 'https://pianobackings.danielebuatti.com';

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
    const { product_id, items, request_ids, amount, description, customer_email, promo_code, test_mode } = body;

    // Legacy single-product calls are treated as a one-item cart.
    const cartItems: { product_id: string; include_sheet_music?: boolean }[] | null =
      Array.isArray(items) ? items : product_id ? [{ product_id, include_sheet_music: false }] : null;

    console.log("[create-stripe-checkout] Received data:", {
      cartSize: cartItems?.length || 0,
      hasRequestIds: !!request_ids,
      amount,
      customer_email,
      hasPromoCode: !!promo_code,
      userId
    });

    let line_items = [];
    let metadata: Record<string, string> = {};
    let paymentAmount = 0;
    let shopLines: ShopLine[] = [];
    let currency = 'aud';

    if (cartItems) {
      if (cartItems.length === 0 || cartItems.length > MAX_CART_ITEMS) {
        throw new Error(`Your cart must contain between 1 and ${MAX_CART_ITEMS} items.`);
      }
      const ids = [...new Set(cartItems.map((i) => String(i.product_id)))];
      const { data: products, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .in('id', ids)
        .eq('is_active', true);

      if (productError) throw productError;
      if (!products || products.length !== ids.length) {
        throw new Error("One of the items in your cart is no longer available. Please remove it and try again.");
      }

      const byId = Object.fromEntries(products.map((p) => [p.id, p]));
      currency = (products[0].currency || 'aud').toLowerCase();

      for (const id of ids) {
        const product = byId[id];
        if ((product.currency || 'aud').toLowerCase() !== currency) {
          throw new Error("Items in different currencies can't be bought together.");
        }
        const wantsSheetMusic = cartItems.some((i) => String(i.product_id) === id && i.include_sheet_music)
          && product.product_type !== 'credit_pack';

        line_items.push({
          price_data: {
            currency,
            product_data: {
              name: product.title,
              description: product.description ? String(product.description).slice(0, 500) : undefined,
              metadata: { product_id: product.id, kind: 'track' },
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        });
        paymentAmount += Number(product.price);

        if (wantsSheetMusic) {
          line_items.push({
            price_data: {
              currency,
              product_data: {
                name: `Custom sheet music: ${product.title}`,
                description: 'Clean, engraved sheet music of this cut, prepared in Sibelius.',
                metadata: { product_id: product.id, kind: 'sheet_music' },
              },
              unit_amount: Math.round(SHOP_SHEET_MUSIC_PRICE * 100),
            },
            quantity: 1,
          });
          paymentAmount += SHOP_SHEET_MUSIC_PRICE;
        }

        shopLines.push({
          product,
          amount: Number(product.price) + (wantsSheetMusic ? SHOP_SHEET_MUSIC_PRICE : 0),
          includesSheetMusic: wantsSheetMusic,
        });
      }

      metadata = { cart: '1', product_ids: ids.join(',').slice(0, 500) };
    } else if (request_ids && amount) {
      console.log("[create-stripe-checkout] Handling Custom Request(s):", request_ids);
      paymentAmount = amount;
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

    paymentAmount = Math.round(paymentAmount * 100) / 100;

    // Admin-only test mode: charge $0.50 in total.
    if (test_mode && userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      console.log("[create-stripe-checkout] Test mode enabled — overriding amount to $0.50");
      paymentAmount = 0.50;
      line_items = [{ ...line_items[0], price_data: { ...line_items[0].price_data, unit_amount: 50 }, quantity: 1 }];
      shopLines = shopLines.map((l, i) => ({ ...l, amount: i === 0 ? 0.5 : 0 }));
    }

    // Apply promo code if provided
    let promoResult = null;
    let discounts = undefined;
    if (promo_code) {
      console.log("[create-stripe-checkout] Validating promo code:", promo_code);
      promoResult = await validatePromoCode(supabaseAdmin, promo_code, paymentAmount);

      if (promoResult.finalAmount < paymentAmount) {
        metadata.promo_code_id = promoResult.promoCodeId;
        metadata.original_amount = promoResult.originalAmount.toString();
        metadata.discount_amount = promoResult.discountAmount.toString();
        metadata.promo_code = promo_code.trim().toUpperCase();

        if (promoResult.finalAmount > 0) {
          // A single-use coupon spreads the discount across every line item.
          const coupon = await stripe.coupons.create({
            amount_off: Math.round(promoResult.discountAmount * 100),
            currency,
            duration: 'once',
            max_redemptions: 1,
            name: promo_code.trim().toUpperCase().slice(0, 40),
          });
          discounts = [{ coupon: coupon.id }];
        }
      }
    }

    // Handle free orders (100% off promo) — skip Stripe entirely
    const finalTotal = promoResult?.finalAmount ?? paymentAmount;
    if (finalTotal === 0) {
      console.log("[create-stripe-checkout] Free order — skipping Stripe");

      const customerEmail = customer_email || userEmail || 'unknown';
      const freeSessionId = `free_${crypto.randomUUID()}`;
      let orderIds: string[] = [];

      if (shopLines.length > 0) {
        orderIds = await fulfilShopPurchase(supabaseAdmin, {
          sessionId: freeSessionId,
          customerEmail,
          userId,
          currency,
          lines: shopLines.map((l) => ({ ...l, amount: 0 })),
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
          order_id: orderIds[0] || null,
          stripe_session_id: null,
          discount_amount: promoResult.discountAmount,
          original_amount: promoResult.originalAmount,
          final_amount: 0,
          metadata: { promo_code: promo_code.trim().toUpperCase(), product_ids: shopLines.map((l) => l.product.id) },
        });
      }

      const redirectUrl = shopLines.length > 0
        ? `${siteUrl}/purchase-confirmation?session_id=${freeSessionId}`
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
      ...(discounts ? { discounts } : {}),
      mode: 'payment',
      customer_email: customer_email || undefined,
      client_reference_id: userId || undefined,
      success_url: `${siteUrl}/purchase-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: shopLines.length > 0 ? `${siteUrl}/shop?checkout=cancelled` : `${siteUrl}/form-page`,
      metadata,
      payment_intent_data: {
        statement_descriptor: 'PIANO BACKINGS',
      },
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
