// @ts-nocheck
// Self-serve recovery: "I lost my download link".
//
// Looks up requests by the email address on file and emails the token links for
// them. The address in the request is only ever used for the lookup — the email
// always goes to the address stored on the row, so this can't be used to send
// links to an arbitrary inbox or to discover whether an address has an order
// (the response is identical either way).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { escapeHtml, isValidEmail, sendEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = Deno.env.get('SITE_URL') || 'https://pianobackings.danielebuatti.com';

// Per-instance throttle. Edge instances are short-lived, so this is a speed bump
// against a stuck retry loop or a script, not a hard guarantee.
const lastSentAt = new Map<string, number>();
const COOLDOWN_MS = 60_000;
const MAX_ORDERS_PER_EMAIL = 10;

// PostgREST passes the value straight into ILIKE, where % and _ are wildcards.
// Escape them so an address like john_doe@example.com is matched literally.
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

const genericOk = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json().catch(() => ({ email: null }));
    const lookupEmail = typeof email === 'string' ? email.trim() : '';

    if (!isValidEmail(lookupEmail)) return genericOk();

    const key = lookupEmail.toLowerCase();
    const now = Date.now();
    const previous = lastSentAt.get(key) || 0;
    if (now - previous < COOLDOWN_MS) return genericOk();
    lastSentAt.set(key, now);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: requests, error } = await supabaseAdmin
      .from('backing_requests')
      .select('id, email, song_title, musical_or_artist, guest_access_token, created_at, status')
      .ilike('email', escapeLike(lookupEmail))
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(MAX_ORDERS_PER_EMAIL);

    if (error) throw error;
    if (!requests || requests.length === 0) return genericOk();

    const rows: string[] = [];
    for (const request of requests) {
      let token = request.guest_access_token;
      // Older rows may predate the guest token; mint one so the link is login-free.
      if (!token) {
        token = crypto.randomUUID();
        const { error: updateError } = await supabaseAdmin
          .from('backing_requests')
          .update({ guest_access_token: token })
          .eq('id', request.id);
        if (updateError) {
          console.error('[send-track-link] Could not mint token:', updateError.message);
          continue;
        }
      }

      const link = `${SITE_URL}/track/${request.id}?token=${token}`;
      const title = escapeHtml(request.song_title || 'Your track');
      const artist = request.musical_or_artist ? ` — ${escapeHtml(request.musical_or_artist)}` : '';
      rows.push(`
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #1C0357;">${title}${artist}</p>
            <a href="${link}" style="color: #F538BC; font-weight: bold; text-decoration: none;">Open your track page →</a>
          </td>
        </tr>`);
    }

    if (rows.length === 0) return genericOk();

    await sendEmail({
      to: requests[0].email || lookupEmail,
      subject: 'Your Piano Backings download link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hi there,</p>
          <p>You asked for your download link again. Here ${rows.length === 1 ? 'it is' : 'they are'}:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
            ${rows.join('')}
          </table>
          <p style="font-size: 14px; color: #666;">
            Each link is unique to its order and works without logging in — no password, no account.
          </p>
          <p>If you didn't ask for this, you can ignore this email.</p>
          <p>Warmly,<br>Daniele Buatti<br>Piano Backings by Daniele</p>
        </div>
      `,
    });

    return genericOk();
  } catch (error) {
    console.error('[send-track-link] Error:', error?.message || error);
    // Never leak whether the address matched an order.
    return genericOk();
  }
});
