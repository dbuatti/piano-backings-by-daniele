// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get('request_id');

    if (!requestId) {
      throw new Error('Missing request_id parameter.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth check — only the request owner or admin can download
    const authHeader = req.headers.get('Authorization');
    let isAllowed = false;
    let userEmail = null;

    if (authHeader && authHeader !== 'Bearer undefined') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (!userError && user) {
          userEmail = user.email;
          const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
          if (adminEmails.includes(user.email)) isAllowed = true;
        }
      } catch (_) { /* ignore */ }
    }

    // Fetch the request
    const { data: request, error: reqError } = await supabaseAdmin
      .from('backing_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      throw new Error(reqError?.message || 'Request not found.');
    }

    if (!isAllowed && userEmail && request.email?.toLowerCase() === userEmail.toLowerCase()) {
      isAllowed = true;
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!request.is_paid) {
      throw new Error('This request has not been paid yet.');
    }

    // Calculate cost breakdown
    const TIER_PRICES = { 'note-bash': 15.00, 'audition-ready': 30.00, 'full-song': 50.00 };
    const SERVICE_COSTS = { 'rush-order': 15.00, 'complex-songs': 10.00, 'additional-edits': 5.00, 'exclusive-ownership': 40.00 };

    const tier = request.track_type || 'audition-ready';
    const baseCost = TIER_PRICES[tier] || 30.00;
    const tierLabel = tier === 'note-bash' ? 'Note Bash (One-Pass)' : tier === 'full-song' ? 'Full Song (Comprehensive)' : 'Audition Ready Cut';

    let total = baseCost;
    const items = [{ desc: `${tierLabel} — ${request.song_title}${request.musical_or_artist ? ` by ${request.musical_or_artist}` : ''}`, amount: baseCost }];

    if (request.additional_services && Array.isArray(request.additional_services)) {
      request.additional_services.forEach((svc) => {
        const cost = SERVICE_COSTS[svc] || 0;
        if (cost > 0) {
          total += cost;
          items.push({
            desc: svc.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            amount: cost,
          });
        }
      });
    }

    const finalPrice = request.final_price ?? total;
    const invoiceNum = `PB-${requestId.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date(request.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    // PDF generation
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    let y = height - 50;

    // --- Header ---
    page.drawRectangle({ x: 0, y: y - 10, width, height: 100, color: rgb(0.11, 0.01, 0.34) });
    page.drawText('TAX INVOICE', { x: 40, y: y + 30, font: bold, size: 24, color: rgb(1, 1, 1) });
    page.drawText(`Invoice #${invoiceNum}`, { x: 40, y: y + 5, font, size: 12, color: rgb(0.8, 0.8, 1) });

    y -= 80;

    // --- From / To ---
    page.drawText('FROM', { x: 40, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    page.drawText('Piano Backings by Daniele', { x: 40, y, font: bold, size: 11 });
    y -= 14;
    page.drawText('ABN: —', { x: 40, y, font, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText('pianobackingsbydaniele@gmail.com', { x: 40, y, font, size: 10, color: rgb(0.4, 0.4, 0.4) });

    y -= 40;

    page.drawText('BILL TO', { x: 40, y, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    page.drawText(request.name || 'Valued Customer', { x: 40, y, font: bold, size: 11 });
    y -= 14;
    page.drawText(request.email, { x: 40, y, font, size: 10, color: rgb(0.4, 0.4, 0.4) });

    y -= 40;

    // --- Invoice meta ---
    page.drawText(`Invoice Date: ${dateStr}`, { x: 40, y, font, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText('Payment Method: Credit Card (Stripe)', { x: 40, y, font, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    if (request.stripe_session_id) {
      page.drawText(`Receipt: ${request.stripe_session_id}`, { x: 40, y, font, size: 9, color: rgb(0.6, 0.6, 0.6) });
      y -= 14;
    }

    y -= 30;

    // --- Table header ---
    const col1X = 40;
    const col2X = 400;
    const col3X = 500;
    const tableTop = y;
    const rowH = 22;

    page.drawRectangle({ x: col1X - 8, y: tableTop - 4, width: width - 64, height: rowH, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Description', { x: col1X, y: tableTop + 4, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Amount', { x: col3X, y: tableTop + 4, font: bold, size: 10, color: rgb(0.4, 0.4, 0.4) });
    y = tableTop - rowH;

    // --- Table rows ---
    items.forEach((item) => {
      const isLast = item === items[items.length - 1];
      page.drawText(item.desc.length > 60 ? item.desc.substring(0, 57) + '...' : item.desc, {
        x: col1X, y: y + 4, font, size: 10,
      });
      page.drawText(`$${item.amount.toFixed(2)}`, {
        x: col3X, y: y + 4, font, size: 10,
      });
      if (!isLast) {
        page.drawLine({ start: { x: col1X - 8, y: y - 2 }, end: { x: width - 40, y: y - 2 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 });
      }
      y -= rowH;
    });

    y -= 10;

    // --- Total ---
    page.drawRectangle({ x: col1X - 8, y: y - 4, width: width - 64, height: rowH + 8, color: rgb(0.11, 0.01, 0.34) });
    page.drawText('Total Paid (AUD)', { x: col1X, y: y + 8, font: bold, size: 14, color: rgb(1, 1, 1) });
    page.drawText(`$${finalPrice.toFixed(2)}`, { x: col3X, y: y + 8, font: bold, size: 14, color: rgb(1, 1, 1) });

    y -= 60;

    // --- Footer ---
    page.drawLine({ start: { x: 40, y: y + 10 }, end: { x: width - 40, y: y + 10 }, color: rgb(0.85, 0.85, 0.85), thickness: 0.5 });

    page.drawText('Thank you for your support!', { x: 40, y, font: bold, size: 11, color: rgb(0.11, 0.01, 0.34) });
    y -= 16;
    page.drawText('Piano Backings by Daniele — Custom backing tracks for auditions, performances, and practice.', {
      x: 40, y, font, size: 9, color: rgb(0.6, 0.6, 0.6),
    });
    y -= 14;
    page.drawText('pianobackingsbydaniele@gmail.com', { x: 40, y, font, size: 9, color: rgb(0.6, 0.6, 0.6) });

    const pdfBytes = await doc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNum}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error('[generate-invoice] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
