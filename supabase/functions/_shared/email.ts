// @ts-nocheck
// Shared helpers for sending email through the send-email function from other
// edge functions. send-email only accepts the service-role key or a signed-in
// admin, so server-side callers must go through sendEmail() here.

export const SEND_EMAIL_URL = 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-email';
export const SENDER_EMAIL = 'pianobackingsbydaniele@gmail.com';

/** Escape customer-supplied text before putting it into email HTML. */
export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** An escaped http(s) link, or plain escaped text for anything else (e.g. javascript:). */
export const safeLink = (url: unknown) => {
  const value = String(url ?? '').trim();
  if (!/^https?:\/\//i.test(value)) return escapeHtml(value);
  const escaped = escapeHtml(value);
  return `<a href="${escaped}">${escaped}</a>`;
};

export const isValidEmail = (value: unknown) =>
  typeof value === 'string' && value.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(value);

export async function sendEmail(
  message: { to: string | string[]; subject: string; html: string; cc?: string | string[]; replyTo?: string },
) {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const response = await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ ...message, senderEmail: SENDER_EMAIL }),
  });
  if (!response.ok) {
    throw new Error(`send-email failed (${response.status}): ${await response.text()}`);
  }
}
