// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { code, amount } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code is required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const trimmedCode = code.trim().toUpperCase();

    const { data: promo, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .ilike('code', trimmedCode)
      .maybeSingle();

    if (error) throw error;

    if (!promo) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid promo code.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!promo.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promo code is no longer active.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promo code has reached its maximum number of uses.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const now = new Date().toISOString();

    if (promo.starts_at && now < promo.starts_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promo code is not yet available.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (promo.expires_at && now > promo.expires_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promo code has expired.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const purchaseAmount = amount || 0;

    if (promo.min_purchase_amount !== null && purchaseAmount < promo.min_purchase_amount) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Minimum purchase amount of $${promo.min_purchase_amount.toFixed(2)} is required for this promo code.`,
          minPurchaseAmount: promo.min_purchase_amount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = Math.round((purchaseAmount * promo.discount_value / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(promo.discount_value, purchaseAmount);
    }

    const finalAmount = Math.max(0, purchaseAmount - discountAmount);

    return new Response(
      JSON.stringify({
        valid: true,
        promoCode: {
          id: promo.id,
          code: promo.code,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          description: promo.description,
        },
        originalAmount: purchaseAmount,
        discountAmount,
        finalAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("[validate-promo-code] Error:", error.message);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
