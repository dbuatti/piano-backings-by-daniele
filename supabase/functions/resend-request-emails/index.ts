// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEND_EMAIL_URL = 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email';

async function sendEmail(to, subject, html) {
  await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html, senderEmail: 'pianobackingsbydaniele@gmail.com' }),
  });
}

function buildInvoiceHtml(request) {
  const TIER_PRICES = { 'note-bash': 15.00, 'audition-ready': 30.00, 'full-song': 50.00 };
  const SERVICE_COSTS = { 'rush-order': 15.00, 'complex-songs': 10.00, 'additional-edits': 5.00, 'exclusive-ownership': 40.00 };

  const tier = request.track_type || 'audition-ready';
  const baseCost = TIER_PRICES[tier] || 30.00;
  const tierLabel = tier === 'note-bash' ? 'Note Bash (One-Pass)' : tier === 'full-song' ? 'Full Song (Comprehensive)' : 'Audition Ready Cut';

  let total = baseCost;
  let invoiceItemsHtml = `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${request.song_title || 'Untitled'}${request.musical_or_artist ? ` — ${request.musical_or_artist}` : ''}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${tierLabel}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${baseCost.toFixed(2)}</td>
    </tr>`;

  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((svc) => {
      const cost = SERVICE_COSTS[svc] || 0;
      if (cost > 0) {
        total += cost;
        invoiceItemsHtml += `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; padding-left: 24px; color: #6b7280; font-size: 13px;">+ ${svc.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"></td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 13px;">+$${cost.toFixed(2)}</td>
          </tr>`;
      }
    });
  }

  const finalAmount = request.final_price ?? total;
  const invoiceNum = `PB-${request.id.substring(0, 8).toUpperCase()}`;
  const dateStr = new Date(request.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
      <div style="background: linear-gradient(135deg, #1C0357, #D1AAF2); padding: 32px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">TAX INVOICE</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">Invoice #${invoiceNum}</p>
      </div>

      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; margin-bottom: 24px;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">FROM</h3>
              <p style="margin: 0; font-weight: bold;">Piano Backings by Daniele</p>
              <p style="margin: 2px 0; font-size: 13px;">ABN: —</p>
              <p style="margin: 2px 0; font-size: 13px;">pianobackingsbydaniele@gmail.com</p>
            </td>
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">BILL TO</h3>
              <p style="margin: 0; font-weight: bold;">${request.name || 'Valued Customer'}</p>
              <p style="margin: 2px 0; font-size: 13px;">${request.email}</p>
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
            <td style="font-weight: bold;">${dateStr}</td>
            <td style="font-weight: bold;">Credit Card (Stripe)</td>
            <td style="font-weight: bold; font-size: 12px;">${request.stripe_session_id ? request.stripe_session_id.substring(0, 12) + '...' : 'Free Order'}</td>
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
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #1C0357; color: #1C0357;">$${finalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
          <p style="margin: 0 0 4px 0;">View your order: <a href="https://pianobackingsbydaniele.com/track/${request.id}" style="color: #1C0357;">pianobackingsbydaniele.com/track/${request.id}</a></p>
        </div>

        <div style="margin-top: 24px; padding: 16px; background-color: #f3e8ff; border-radius: 6px; font-size: 12px; color: #1C0357;">
          <p style="margin: 0;"><strong>Piano Backings by Daniele</strong> — Custom backing tracks for auditions, performances, and practice.</p>
          <p style="margin: 4px 0 0 0;">Questions? Reply to this email or contact pianobackingsbydaniele@gmail.com</p>
        </div>
      </div>
    </div>
  `;
}

function buildOrderConfirmationHtml(request) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1C0357, #D1AAF2); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Request Received!</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${request.name || 'there'},</p>
        <p>Thank you for submitting your custom backing track request for <strong>"${request.song_title}"</strong>${request.musical_or_artist ? ` from <strong>${request.musical_or_artist}</strong>` : ''}.</p>
        <div style="background-color: #f0ebfb; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1C0357;">Order Summary</h3>
          <p style="margin: 5px 0;"><strong>Song:</strong> ${request.song_title}</p>
          <p style="margin: 5px 0;"><strong>Artist/Musical:</strong> ${request.musical_or_artist}</p>
          <p style="margin: 5px 0;"><strong>Track ID:</strong> ${request.id}</p>
        </div>
        <p>You'll receive another email as soon as your track is ready for download. In the meantime, you can track the status on your dashboard.</p>
        <p>Warmly,<br>Daniele Buatti</p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Admin-only check
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;
    if (authHeader && authHeader !== 'Bearer undefined') {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
      if (user && adminEmails.includes(user.email)) isAdmin = true;
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { request_id, email_type, test_email } = await req.json();
    if (!request_id) throw new Error('Missing request_id');

    const { data: request, error } = await supabaseAdmin
      .from('backing_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (error || !request) throw new Error(error?.message || 'Request not found');

    const results = [];

    // Order confirmation email
    if (!email_type || email_type === 'order_confirmation') {
      await sendEmail(
        request.email,
        `Request Received: "${request.song_title}"`,
        buildOrderConfirmationHtml(request)
      );
      results.push('order_confirmation');
      console.log(`[resend-emails] Order confirmation sent to ${request.email}`);
    }

    // Invoice email (only if paid)
    if ((!email_type || email_type === 'invoice') && request.is_paid) {
      await sendEmail(
        request.email,
        `Tax Invoice #PB-${request.id.substring(0, 8).toUpperCase()} - Piano Backings by Daniele`,
        buildInvoiceHtml(request)
      );
      results.push('invoice');
      console.log(`[resend-emails] Invoice sent to ${request.email}`);
    }

    return new Response(JSON.stringify({ sent: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[resend-emails] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
