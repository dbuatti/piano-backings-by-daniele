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
          // Determine the user ID
          let finalUserId = userId;
          if (!finalUserId && customerEmail) {
            const { data: users } = await supabaseAdmin.rpc('get_users_by_email', { p_email: customerEmail });
            if (users && users.length > 0) {
              finalUserId = users[0].id;
            }
          }

          await supabaseAdmin.from('orders').insert({
            product_id: productId,
            customer_email: customerEmail,
            amount: session.amount_total! / 100,
            currency: session.currency!.toUpperCase(),
            status: 'completed',
            user_id: finalUserId,
            checkout_session_id: session.id,
          });

          // If it's a credit pack, update user_credits!
          if (product.product_type === 'credit_pack' && finalUserId) {
            const creditType = product.track_type || 'audition-ready';
            const creditAmount = product.credit_amount || 0;

            // Check if user already has credits of this type
            const { data: existingCredit } = await supabaseAdmin
              .from('user_credits')
              .select('*')
              .eq('user_id', finalUserId)
              .eq('credit_type', creditType)
              .maybeSingle();

            if (existingCredit) {
              await supabaseAdmin
                .from('user_credits')
                .update({
                  balance: existingCredit.balance + creditAmount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingCredit.id);
            } else {
              await supabaseAdmin
                .from('user_credits')
                .insert({
                  user_id: finalUserId,
                  credit_type: creditType,
                  balance: creditAmount,
                  updated_at: new Date().toISOString()
                });
            }
          }

          // Send Product Delivery Email
          try {
            const isCreditPack = product.product_type === 'credit_pack';
            const emailSubject = isCreditPack
              ? `Your Season Pack Credits are Ready!`
              : `Your Purchase: "${product.title}" is Ready!`;
            
            const emailHtml = isCreditPack
              ? `<p>Hi there,</p>
                 <p>Thank you for purchasing the <strong>${product.title}</strong>!</p>
                 <p>We have added <strong>${product.credit_amount} credits</strong> to your account.</p>
                 <p>You can redeem them anytime on the request form by toggling "Use Credit".</p>
                 <p>Enjoy your tracks!</p>`
              : `<p>Hi there,</p>
                 <p>Thank you for your purchase of <strong>${product.title}</strong>!</p>
                 <p>You can download your tracks from your dashboard.</p>`;

            await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: customerEmail,
                subject: emailSubject,
                html: emailHtml,
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