// @ts-nocheck
// Builds the plain-text "Order Summary.txt" that lives in the client's Dropbox
// folder. Keep this in sync with the invoice (generate-invoice) and the pricing
// table (_shared/pricing.ts) — every number here comes from those, never from
// the browser.
import { TIER_PRICES, SERVICE_COSTS, serviceLabel } from './pricing.ts';

const TIER_LABELS: Record<string, string> = {
  'note-bash': 'Note Bash (One-Pass)',
  'audition-ready': 'Audition Ready Cut',
  'full-song': 'Full Song (Comprehensive)',
};

export const tierLabel = (tier?: string | null): string =>
  TIER_LABELS[tier || 'audition-ready'] || TIER_LABELS['audition-ready'];

const money = (value: unknown): string => `$${(Number(value) || 0).toFixed(2)}`;

const LABEL_WIDTH = 20;

/** `Label ............ value` — dots keep the eye on the value column. */
const line = (label: string, value: unknown): string => {
  const text = value === null || value === undefined || value === '' ? '-' : String(value);
  const dots = '.'.repeat(Math.max(3, LABEL_WIDTH - label.length));
  return `${label} ${dots} ${text}`;
};

const section = (title: string): string => `\n${title}\n${'-'.repeat(Math.max(12, title.length))}`;

const list = (items: string[]): string =>
  items.length ? items.map((item) => `  * ${item}`).join('\n') : '  * None';

const dateLabel = (value?: string | null): string => {
  if (!value) return 'Standard (3–5 business days)';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const stampLabel = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
};

export interface OrderSummaryPayment {
  /** What the customer actually paid. Defaults to the request's own total. */
  amountPaid?: number | null;
  method?: string | null;
  /** Stripe checkout session / receipt id. */
  receiptId?: string | null;
  paidAt?: string | null;
  promoCode?: string | null;
  discountAmount?: number | null;
  originalAmount?: number | null;
}

export interface OrderSummaryOptions {
  payment?: OrderSummaryPayment | null;
  /** Extra note appended under the payment block (e.g. credit redemption). */
  creditNote?: string | null;
  generatedAt?: Date;
}

/** Turn a backing_requests row (snake_case) into the Order Summary text. */
export function buildOrderSummary(row: any, options: OrderSummaryOptions = {}): string {
  const generatedAt = options.generatedAt || new Date();
  const tier = row.track_type || 'audition-ready';
  const services: string[] = Array.isArray(row.additional_services) ? row.additional_services : [];

  // ---- money -------------------------------------------------------------
  const baseCost = TIER_PRICES[tier] ?? TIER_PRICES['audition-ready'];
  const addOnLines = services.map((id) => ({ id, label: serviceLabel(id), cost: SERVICE_COSTS[id] || 0 }));
  const addOnTotal = addOnLines.reduce((sum, item) => sum + item.cost, 0);
  const quotedTotal = Number(row.cost) || Math.round((baseCost + addOnTotal) / 5) * 5;
  const finalPrice = row.final_price != null && Number(row.final_price) > 0 ? Number(row.final_price) : null;

  const payment = options.payment || {};
  const isPaid = !!row.is_paid;
  const amountPaid = isPaid
    ? Number(payment.amountPaid ?? finalPrice ?? quotedTotal)
    : 0;
  const discount = Number(payment.discountAmount) || 0;
  const originalAmount = Number(payment.originalAmount) || 0;

  // ---- materials ---------------------------------------------------------
  const sheetMusic: any[] = Array.isArray(row.sheet_music_urls) ? row.sheet_music_urls : [];
  const voiceMemos: any[] = Array.isArray(row.voice_memo_urls) ? row.voice_memo_urls : [];
  const tracks: any[] = Array.isArray(row.track_urls) ? row.track_urls : [];

  const status = row.status ? String(row.status).replace('-', ' ').toUpperCase() : 'PENDING';
  const account = row.user_id ? `Account (user ${row.user_id})` : 'Guest checkout';

  const out: string[] = [];

  out.push('ORDER SUMMARY');
  out.push('=============');
  out.push('Piano Backings by Daniele - custom piano backing tracks');
  out.push('ABN 49 833 619 500  ·  pianobackingsbydaniele@gmail.com');
  out.push(line('Request ID', row.id));
  out.push(line('Order date', stampLabel(row.created_at)));
  out.push(line('Status', status));
  out.push(line('Summary generated', stampLabel(generatedAt.toISOString())));

  out.push(section('CLIENT INFORMATION'));
  out.push(line('Name', row.name || 'N/A'));
  out.push(line('Email', row.email));
  out.push(line('Account', account));
  if (row.guest_access_token) {
    out.push(line('Guest order link', `/track/${row.id}?token=${row.guest_access_token}`));
  }

  out.push(section('SONG DETAILS'));
  out.push(line('Title', row.song_title));
  out.push(line('Musical/Artist', row.musical_or_artist));
  out.push(line('Tier', `${tierLabel(tier).toUpperCase()} (${tier})`));
  out.push(line('Tier price', money(baseCost)));
  if (quotedTotal && quotedTotal !== baseCost + addOnTotal) {
    // Server-side rounding (nearest $5) can move the total off the sum of parts.
    out.push(line('Quoted total', `${money(quotedTotal)} AUD`));
  }
  out.push(line('Key', row.song_key || 'N/A'));
  out.push(
    line(
      'Transposition',
      row.different_key === 'Yes'
        ? `Yes - to ${row.key_for_track || 'N/A'}`
        : row.different_key || 'No',
    ),
  );
  out.push(line('Due date', dateLabel(row.delivery_date)));
  if (row.category) out.push(line('Category', row.category));
  out.push(line('Delivered', row.delivered_at ? stampLabel(row.delivered_at) : 'Not yet'));

  out.push(section('REQUIREMENTS & ADD-ONS'));
  out.push('Services:');
  out.push(
    addOnLines.length
      ? addOnLines.map((item) => `  * ${item.label} - ${money(item.cost)}`).join('\n')
      : '  * None',
  );
  out.push(line('Add-ons total', money(addOnTotal)));
  out.push(line('YouTube', row.youtube_link || 'None'));
  out.push(line('Additional links', row.additional_links || 'None'));

  out.push('Sheet music:');
  out.push(list(sheetMusic.map((file, i) => `${file?.caption || `File ${i + 1}`}${file?.url ? ` - ${file.url}` : ''}`)));
  if (voiceMemos.length || row.voice_memo) {
    out.push('Voice memos:');
    out.push(
      list(
        voiceMemos.length
          ? voiceMemos.map((file, i) => `${file?.caption || `Memo ${i + 1}`}${file?.url ? ` - ${file.url}` : ''}`)
          : [String(row.voice_memo)],
      ),
    );
  }

  out.push(section('SPECIAL REQUESTS / NOTES'));
  out.push(row.special_requests || 'No special requests.');

  out.push(section('PAYMENT'));
  out.push(line('Payment status', isPaid ? 'PAID IN FULL' : 'UNPAID - awaiting payment'));
  if (isPaid) {
    out.push(line('Amount paid', `${money(amountPaid)} AUD`));
    out.push(line('Payment method', payment.method || 'Credit Card (Stripe)'));
    out.push(line('Paid on', stampLabel(payment.paidAt || row.paid_at)));
    if (payment.receiptId || row.stripe_session_id) {
      out.push(line('Receipt / session', payment.receiptId || row.stripe_session_id));
    }
    if (discount > 0) {
      if (payment.promoCode) out.push(line('Promo code', payment.promoCode));
      if (originalAmount > 0) out.push(line('Original amount', `${money(originalAmount)} AUD`));
      out.push(line('Discount', `-${money(discount)} AUD`));
    }
    if (finalPrice && finalPrice !== amountPaid) out.push(line('Agreed final price', `${money(finalPrice)} AUD`));
  } else {
    out.push(line('Amount due', `${money(finalPrice ?? quotedTotal)} AUD`));
    if (!finalPrice) out.push(line('Quoted total', `${money(quotedTotal)} AUD`));
  }
  if (options.creditNote) {
    // `internal_notes` doubles as a general admin note field, so only surface it
    // when it is the credit note written at request creation.
    out.push(line('Credit / note', options.creditNote));
  }

  out.push(section('FILES & LINKS'));
  out.push(line('Dropbox folder', row.dropbox_folder_id || 'Not created'));
  if (row.notion_page_id) out.push(line('Notion page', row.notion_page_id));
  out.push('Delivered tracks:');
  out.push(list(tracks.map((track, i) => `${track?.caption || `Track ${i + 1}`}${track?.url ? ` - ${track.url}` : ''}`)));

  out.push('');
  out.push('-');
  out.push('Generated automatically by Piano Backings by Daniele.');
  out.push('Questions? Reply to your confirmation email or contact pianobackingsbydaniele@gmail.com');

  return out.join('\n');
}