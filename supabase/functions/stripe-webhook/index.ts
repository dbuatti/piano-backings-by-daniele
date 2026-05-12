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
    const event = stripe.webhooks.constructEvent(body, signature!, stripeWebhookSecret);

    console.log(`[stripe-webhook] Processing event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const productId = session.metadata?.product_id;
      const requestIds = session.metadata?.request_ids;
      const userId = session.client_reference_id;
      const customerEmail = session.customer_details?.email;

      if (!productId && !requestIds) {
        console.log("[stripe-webhook] Ignoring session: No Piano Backings metadata found.");
        return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 1. Handle Shop Product Purchase
      if (productId) {
        const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', productId).single();
        if (product) {
          await supabaseAdmin.from('orders').insert({
            product_id: productId,
            customer_email: customerEmail,
            amount: session.amount_total! / 100,
            currency: session.currency!.toUpperCase(),
            status: 'completed',
            user_id: userId,
            checkout_session_id: session.id,
          });

          // Send Product Delivery Email
          try {
            await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: customerEmail,
                subject: `Your Purchase: "${product.title}" is Ready!`,
                html: `<p>Hi there,</p><p>Thank you for your purchase of <strong>${product.title}</strong>!</p><p>You can download your tracks from your dashboard.</p>`,
                senderEmail: 'pianobackingsbydaniele@gmail.com'
              })
            });
          } catch (e) { console.error("Email error:", e); }
        }
      }

      // 2. Handle Custom Request Payment
      if (requestIds) {
        const ids = requestIds.split(',');
        await supabaseAdmin.from('backing_requests').update({ is_paid: true, stripe_session_id: session.id }).in('id', ids);
        
        // Send Payment Confirmation Email
        try {
          await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customerEmail,
              subject: `Payment Confirmed - Piano Backings by Daniele`,
              html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                  <h2 style="color: #1C0357;">Payment Successful!</h2>
                  <p>Hi,</p>
                  <p>This email confirms that your payment of <strong>$${(session.amount_total! / 100).toFixed(2)} AUD</strong> has been received.</p>
                  <p>I'm now working on your custom backing track(s). You'll receive another notification as soon as they are ready for download.</p>
                  <p>Thank you for your support!</p>
                  <p>Warmly,<br>Daniele Buatti</p>
                </div>
              `,
              senderEmail: 'pianobackingsbydaniele@gmail.com'
            })
          });
        } catch (e) { console.error("Email error:", e); }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("[stripe-webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});