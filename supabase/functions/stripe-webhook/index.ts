// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'npm:stripe@16.2.0';

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
      const promoCodeId = session.metadata?.promo_code_id;
      const originalAmount = session.metadata?.original_amount;
      const discountAmount = session.metadata?.discount_amount;
      const promoCode = session.metadata?.promo_code;

      if (!productId && !requestIds) {
        console.log("[stripe-webhook] Ignoring session: No Piano Backings metadata found.");
        return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let orderId = null;

      // 1. Handle Shop Product Purchase
      if (productId) {
        const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', productId).single();
        if (product) {
          let finalUserId = userId;
          if (!finalUserId && customerEmail) {
            const { data: users } = await supabaseAdmin.rpc('get_users_by_email', { p_email: customerEmail });
            if (users && users.length > 0) {
              finalUserId = users[0].id;
            }
          }

          const { data: order } = await supabaseAdmin.from('orders').insert({
            product_id: productId,
            customer_email: customerEmail,
            amount: session.amount_total! / 100,
            currency: session.currency!.toUpperCase(),
            status: 'completed',
            user_id: finalUserId,
            checkout_session_id: session.id,
          }).select().single();

          orderId = order?.id || null;

          if (product.product_type === 'credit_pack' && finalUserId) {
            const creditType = product.track_type || 'audition-ready';
            const creditAmount = product.credit_amount || 0;

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
        const paidAmount = (session.amount_total! / 100).toFixed(2);
        const invoiceNumber = `PB-${ids[0].substring(0, 8).toUpperCase()}`;
        const paymentDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
        const customerName = session.customer_details?.name || 'Valued Customer';

        // Fetch request details for the invoice
        const { data: paidRequests } = await supabaseAdmin
          .from('backing_requests')
          .select('song_title, musical_or_artist, track_type, additional_services, final_price, cost')
          .in('id', ids);

        await supabaseAdmin.from('backing_requests').update({ is_paid: true, stripe_session_id: session.id }).in('id', ids);

        let invoiceItemsHtml = '';
        let invoiceTotal = 0;

        if (paidRequests && paidRequests.length > 0) {
          const TIER_PRICES = { 'note-bash': 15.00, 'audition-ready': 30.00, 'full-song': 50.00 };
          const SERVICE_COSTS = { 'rush-order': 15.00, 'complex-songs': 10.00, 'additional-edits': 5.00, 'exclusive-ownership': 40.00 };

          paidRequests.forEach((req, i) => {
            const tier = req.track_type || 'audition-ready';
            const baseCost = TIER_PRICES[tier] || 30.00;
            const tierLabel = tier === 'note-bash' ? 'Note Bash (One-Pass)' : tier === 'full-song' ? 'Full Song (Comprehensive)' : 'Audition Ready Cut';
            let subtotal = baseCost;

            invoiceItemsHtml += `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${req.song_title || 'Untitled'}${req.musical_or_artist ? ` — ${req.musical_or_artist}` : ''}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${tierLabel}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${baseCost.toFixed(2)}</td>
              </tr>`;

            if (req.additional_services && Array.isArray(req.additional_services)) {
              req.additional_services.forEach((svc: string) => {
                const svcCost = SERVICE_COSTS[svc] || 0;
                if (svcCost > 0) {
                  subtotal += svcCost;
                  invoiceItemsHtml += `
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; padding-left: 24px; color: #6b7280; font-size: 13px;">+ ${svc.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"></td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 13px;">+$${svcCost.toFixed(2)}</td>
                    </tr>`;
                }
              });
            }

            invoiceTotal += subtotal;
          });
        } else {
          invoiceTotal = parseFloat(paidAmount);
          invoiceItemsHtml = `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;" colspan="2">Custom Backing Track Request</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${paidAmount}</td>
            </tr>`;
        }

        try {
          await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customerEmail,
              subject: `Tax Invoice #${invoiceNumber} - Piano Backings by Daniele`,
              html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
                  <div style="background: linear-gradient(135deg, #1C0357, #D1AAF2); padding: 32px 24px; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px;">TAX INVOICE</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">Invoice #${invoiceNumber}</p>
                  </div>

                  <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <table style="width: 100%; margin-bottom: 24px;">
                      <tr>
                        <td style="vertical-align: top; width: 50%;">
                          <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">FROM</h3>
                          <p style="margin: 0; font-weight: bold;">Piano Backings by Daniele</p>
                          <p style="margin: 2px 0; font-size: 13px;">ABN: 49 833 619 500</p>
                          <p style="margin: 2px 0; font-size: 13px;">pianobackingsbydaniele@gmail.com</p>
                        </td>
                        <td style="vertical-align: top;">
                          <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">BILL TO</h3>
                          <p style="margin: 0; font-weight: bold;">${customerName}</p>
                          <p style="margin: 2px 0; font-size: 13px;">${customerEmail}</p>
                        </td>
                      </tr>
                    </table>

                    <table style="width: 100%; margin-bottom: 24px;">
                      <tr>
                        <td style="font-size: 13px; color: #6b7280;">Invoice Date</td>
                        <td style="font-size: 13px; color: #6b7280;">Payment Method</td>
                        <td style="font-size: 13px; color: #6b7280;">Receipt ID</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold;">${paymentDate}</td>
                        <td style="font-weight: bold;">Credit Card (Stripe)</td>
                        <td style="font-weight: bold; font-size: 12px;">${session.id.substring(0, 12)}...</td>
                      </tr>
                    </table>

                    <table style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
                          <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Type</th>
                          <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${invoiceItemsHtml}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #1C0357;">Total Paid (AUD)</td>
                          <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #1C0357; color: #1C0357;">$${paidAmount}</td>
                        </tr>
                        ${discountAmount && parseFloat(discountAmount) > 0 ? `
                        <tr>
                          <td colspan="2" style="padding: 4px 12px; text-align: right; font-size: 13px; color: #6b7280;">Discount Applied (${promoCode || ''})</td>
                          <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #dc2626;">-$${parseFloat(discountAmount).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding: 8px 12px; text-align: right; font-weight: bold; font-size: 14px; border-top: 1px solid #e5e7eb;">Original Amount</td>
                          <td style="padding: 8px 12px; text-align: right; font-weight: bold; font-size: 14px; border-top: 1px solid #e5e7eb;">$${parseFloat(originalAmount || '0').toFixed(2)}</td>
                        </tr>` : ''}
                      </tfoot>
                    </table>

                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
                      <p style="margin: 0 0 4px 0;">Your tracks are now being prepared. You'll receive a notification when they are ready for download.</p>
                      <p style="margin: 0;">View your order anytime: <a href="https://pianobackingsbydaniele.vercel.app/track/${ids[0]}" style="color: #1C0357;">pianobackingsbydaniele.vercel.app/track/${ids[0]}</a></p>
                    </div>

                    <div style="margin-top: 24px; padding: 16px; background-color: #f3e8ff; border-radius: 6px; font-size: 12px; color: #1C0357;">
                      <p style="margin: 0;"><strong>Piano Backings by Daniele</strong> — Custom backing tracks for auditions, performances, and practice.</p>
                      <p style="margin: 4px 0 0 0;">Questions? Reply to this email or contact pianobackingsbydaniele@gmail.com</p>
                    </div>
                  </div>
                </div>
              `,
              senderEmail: 'pianobackingsbydaniele@gmail.com'
            })
          });
        } catch (e) { console.error("Email error:", e); }
      }

      // 3. Record Promo Code Redemption (if promo was applied)
      if (promoCodeId && customerEmail && originalAmount && discountAmount) {
        console.log("[stripe-webhook] Recording promo code redemption:", {
          promoCodeId,
          customerEmail,
          originalAmount,
          discountAmount,
        });

        await supabaseAdmin.rpc('increment_promo_code_use', { p_id: promoCodeId });

        // Record the redemption
        await supabaseAdmin.from('promo_code_redemptions').insert({
          promo_code_id: promoCodeId,
          user_id: userId || null,
          email: customerEmail,
          order_id: orderId || null,
          stripe_session_id: session.id,
          discount_amount: parseFloat(discountAmount),
          original_amount: parseFloat(originalAmount),
          final_amount: session.amount_total! / 100,
          metadata: {
            promo_code: promoCode || null,
            product_id: productId || null,
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("[stripe-webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
