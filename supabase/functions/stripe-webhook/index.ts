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
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeSecretKey || !stripeWebhookSecret) throw new Error('Stripe keys not configured.');

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature!, stripeWebhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const productId = session.metadata?.product_id;
      const requestIds = session.metadata?.request_ids;
      const userId = session.client_reference_id;

      if (productId) {
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
            
            // Calculate expiry: 6 months from now
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
        const ids = requestIds.split(',');
        await supabaseAdmin.from('backing_requests').update({ is_paid: true, stripe_session_id: session.id }).in('id', ids);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});