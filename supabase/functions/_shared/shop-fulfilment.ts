// @ts-nocheck
// Creates order rows, grants credit-pack credits and sends emails for a completed
// shop checkout. Shared by stripe-webhook (paid carts) and create-stripe-checkout
// (orders made free by a promo code).

const SEND_EMAIL_URL = 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email';
const SENDER_EMAIL = 'pianobackingsbydaniele@gmail.com';
export const ADMIN_NOTIFY_EMAIL = 'pianobackingsbydaniele@gmail.com';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://pianobackings.danielebuatti.com';

export interface ShopLine {
  product: { id: string; title: string; product_type?: string; track_type?: string; credit_amount?: number };
  amount: number; // what the customer paid for this product, incl. any sheet music add-on
  includesSheetMusic: boolean;
}

const escapeHtml = (value: string) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, senderEmail: SENDER_EMAIL }),
    });
  } catch (e) {
    console.error('[shop-fulfilment] Email error:', e);
  }
}

async function grantCredits(supabaseAdmin, userId: string, creditType: string, amount: number) {
  const { data: existing } = await supabaseAdmin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('user_credits')
      .update({ balance: existing.balance + amount, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin
      .from('user_credits')
      .insert({ user_id: userId, credit_type: creditType, balance: amount, updated_at: new Date().toISOString() });
  }
}

/**
 * Idempotent: if orders already exist for this checkout session (Stripe retries
 * webhooks), nothing is created again and the existing order ids are returned.
 */
export async function fulfilShopPurchase(supabaseAdmin, {
  sessionId,
  customerEmail,
  userId,
  currency,
  lines,
}: {
  sessionId: string;
  customerEmail: string;
  userId: string | null;
  currency: string;
  lines: ShopLine[];
}): Promise<string[]> {
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('checkout_session_id', sessionId);
  if (existing && existing.length > 0) {
    console.log('[shop-fulfilment] Session already fulfilled:', sessionId);
    return existing.map((o) => o.id);
  }

  let finalUserId = userId;
  if (!finalUserId && customerEmail) {
    const { data: users } = await supabaseAdmin.rpc('get_users_by_email', { p_email: customerEmail });
    if (users && users.length > 0) finalUserId = users[0].id;
  }

  const productIds = lines.filter((l) => l.includesSheetMusic).map((l) => l.product.id);
  const readySheetMusic: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: sheets } = await supabaseAdmin
      .from('product_sheet_music')
      .select('product_id, url')
      .in('product_id', productIds);
    (sheets || []).forEach((s) => { readySheetMusic[s.product_id] = s.url; });
  }

  const now = new Date().toISOString();
  const rows = lines.map((line) => {
    const readyUrl = line.includesSheetMusic ? readySheetMusic[line.product.id] || null : null;
    return {
      product_id: line.product.id,
      customer_email: customerEmail,
      amount: Math.round(line.amount * 100) / 100,
      currency: currency.toUpperCase(),
      status: 'completed',
      user_id: finalUserId,
      checkout_session_id: sessionId,
      includes_sheet_music: line.includesSheetMusic,
      sheet_music_url: readyUrl,
      sheet_music_delivered_at: readyUrl ? now : null,
    };
  });

  const { data: orders, error } = await supabaseAdmin.from('orders').insert(rows).select('id, product_id');
  if (error) throw error;

  for (const line of lines) {
    if (line.product.product_type === 'credit_pack' && finalUserId) {
      await grantCredits(supabaseAdmin, finalUserId, line.product.track_type || 'audition-ready', line.product.credit_amount || 0);
    }
  }

  // Customer email
  const creditPacks = lines.filter((l) => l.product.product_type === 'credit_pack');
  const tracks = lines.filter((l) => l.product.product_type !== 'credit_pack');
  const pendingSheetMusic = lines.filter((l) => l.includesSheetMusic && !readySheetMusic[l.product.id]);
  const readySheets = lines.filter((l) => l.includesSheetMusic && readySheetMusic[l.product.id]);

  const itemList = lines.map((l) =>
    `<li><strong>${escapeHtml(l.product.title)}</strong>${l.includesSheetMusic ? ' + custom sheet music' : ''}</li>`
  ).join('');

  let html = `<p>Hi there,</p><p>Thank you for your purchase!</p><ul>${itemList}</ul>`;
  if (tracks.length > 0) {
    html += `<p>Your tracks are ready to download from <a href="${SITE_URL}/user-dashboard">your dashboard</a>.</p>`;
  }
  if (creditPacks.length > 0) {
    html += creditPacks.map((l) =>
      `<p>We've added <strong>${l.product.credit_amount || 0} credits</strong> from the ${escapeHtml(l.product.title)} to your account. Redeem them on the request form by toggling "Use Credit".</p>`
    ).join('');
  }
  if (readySheets.length > 0) {
    html += `<p>Your sheet music is ready to download from your dashboard too.</p>`;
  }
  if (pendingSheetMusic.length > 0) {
    html += `<p>I'll prepare your custom sheet music and email it to you within 3–5 business days. It will also appear in your dashboard.</p>`;
  }
  html += `<p>Enjoy!<br/>Daniele</p>`;

  const subject = lines.length === 1
    ? (creditPacks.length === 1 ? 'Your Season Pack Credits are Ready!' : `Your Purchase: "${lines[0].product.title}" is Ready!`)
    : `Your Piano Backings order (${lines.length} items)`;

  if (customerEmail) await sendEmail(customerEmail, subject, html);

  // Let Daniele know there's sheet music to engrave.
  if (pendingSheetMusic.length > 0) {
    const list = pendingSheetMusic.map((l) => `<li>${escapeHtml(l.product.title)}</li>`).join('');
    await sendEmail(
      ADMIN_NOTIFY_EMAIL,
      `Sheet music to prepare (${pendingSheetMusic.length}) — ${customerEmail}`,
      `<p><strong>${escapeHtml(customerEmail)}</strong> bought custom sheet music for:</p><ul>${list}</ul>
       <p>Deliver it from <a href="${SITE_URL}/admin?section=clients&sub=orders">Admin → Clients → Orders</a>.</p>`
    );
  }

  return (orders || []).map((o) => o.id);
}
