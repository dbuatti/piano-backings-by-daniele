// @ts-nocheck
// Regenerates a request's Order Summary.txt in its existing Dropbox folder.
// Used by the admin "Regenerate Summary" button (e.g. to backfill the richer
// format, or to push payment details onto older orders).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildOrderSummary } from '../_shared/order-summary.ts';
import { writeOrderSummary } from '../_shared/dropbox.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Admin-only.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader === 'Bearer undefined') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { requestId } = await req.json();
    if (!requestId) throw new Error('Missing requestId.');

    const { data: row, error } = await supabaseAdmin
      .from('backing_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('Request not found.');

    // Pull the promo/discount (if any) so the regenerated file matches the invoice.
    let payment = null;
    if (row.stripe_session_id) {
      const { data: redemption } = await supabaseAdmin
        .from('promo_code_redemptions')
        .select('discount_amount, original_amount, metadata')
        .eq('stripe_session_id', row.stripe_session_id)
        .maybeSingle();
      if (redemption) {
        payment = {
          amountPaid: row.final_price ?? row.cost,
          method: 'Credit Card (Stripe)',
          receiptId: row.stripe_session_id,
          paidAt: row.paid_at || row.updated_at,
          promoCode: redemption.metadata?.promo_code || null,
          discountAmount: redemption.discount_amount,
          originalAmount: redemption.original_amount,
        };
      }
    }

    const summary = buildOrderSummary(row, { payment, creditNote: row.internal_notes });
    const result = await writeOrderSummary(supabaseAdmin, requestId, summary);

    return new Response(JSON.stringify({ ok: result.ok, path: result.path, error: result.error }), {
      status: result.ok ? 200 : 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[regenerate-order-summary] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});