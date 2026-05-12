// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error("[stripe-webhook] Missing Stripe configuration");
      throw new Error('Stripe keys not configured.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const stripe = new Stripe(stripeSecretKey, { 
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    // Use constructEvent instead of constructEventAsync to avoid Deno microtask issues
    const event = stripe.webhooks.constructEvent(body, signature!, stripeWebhookSecret);

    console.log(`[stripe-webhook] Processing event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const productId = session.metadata?.product_id;
      const requestIds = session.metadata?.request_ids;
      const userId = session.client_reference_id;

      // GUARD: If this session has NO metadata related to Piano Backings, ignore it.
      // This prevents this webhook from interfering with your other businesses.
      if (!productId && !requestIds) {
        console.log("[stripe-webhook] Ignoring session: No Piano Backings metadata found.");
        return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (productId) {
        console.log(`[stripe-webhook] Handling product purchase: ${productId}`);
        const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', productId).single();
        
        if (product) {
          await supabaseAdmin.from('orders').insert({
            product_id: productId,
            customer_email: session.customer_details?.email,
            amount: session.amount_total! / 100,
            currency: session.currency!.toUpperCase(),
            status: 'completed',
            user_id: userId,
            checkout_session_id: session.id,
          });

          if (product.product_type === 'credit_pack' && userId) {
            const { data: existingCredits } = await supabaseAdmin.from('user_credits').select('balance').eq('user_id', userId).eq('credit_type', product.track_type).single();
            const newBalance = (existingCredits?.balance || 0) + (product.credit_amount || 0);
            
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 6);

            await supabaseAdmin.from('user_credits').upsert({
              user_id: userId,
              credit_type: product.track_type,
              balance: newBalance,
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      if (requestIds) {
        console.log(`[stripe-webhook] Marking requests as paid: ${requestIds}`);
        const ids = requestIds.split(',');
        const { error: updateError } = await supabaseAdmin
          .from('backing_requests')
          .update({ 
            is_paid: true, 
            stripe_session_id: session.id 
          })
          .in('id', ids);
          
        if (updateError) {
          console.error("[stripe-webhook] Error updating requests:", updateError);
          throw updateError;
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("[stripe-webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, // Return 400 for webhook errors so Stripe retries if appropriate
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});