// @ts-nocheck
// Google review follow-up, sent once per customer 3 days after delivery:
// - custom tracks: backing_requests completed (delivered_at set by trigger, see 0032)
// - shop purchases: paid track orders (delivered instantly at purchase)
// Runs daily from pg_cron (migration 0032). It only emails customers who are due and
// records each one in review_requests, so extra calls do nothing. ?dryRun=1 lists
// who would be emailed without sending.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendEmail, isValidEmail } from '../_shared/email.ts';
import { reviewFollowupEmail } from '../_shared/review.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY = 24 * 60 * 60 * 1000;
const DELAY_DAYS = 3;
const WINDOW_DAYS = 14; // don't reach back further than this (e.g. after downtime)
const MAX_PER_RUN = 25;
const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const dueBefore = new Date(Date.now() - DELAY_DAYS * DAY).toISOString();
    const notBefore = new Date(Date.now() - WINDOW_DAYS * DAY).toISOString();

    const [requests, orders] = await Promise.all([
      supabase
        .from('backing_requests')
        .select('email, name, song_title, delivered_at')
        .eq('status', 'completed')
        .gte('delivered_at', notBefore)
        .lte('delivered_at', dueBefore),
      supabase
        .from('orders')
        .select('customer_email, user_id, created_at, products ( title, product_type )')
        .in('status', ['completed', 'paid'])
        .gte('created_at', notBefore)
        .lte('created_at', dueBefore),
    ]);
    if (requests.error) throw requests.error;
    if (orders.error) throw orders.error;

    // One email per customer, about their most recent delivery.
    const due = new Map<string, { email: string; name: string | null; song: string | null; userId?: string | null; at: string }>();
    const consider = (email: string | null, name: string | null, song: string | null, at: string, userId?: string | null) => {
      const key = (email || '').trim().toLowerCase();
      if (!isValidEmail(key) || ADMIN_EMAILS.includes(key)) return;
      const existing = due.get(key);
      if (!existing || existing.at < at) due.set(key, { email: key, name: name || existing?.name || null, song, userId, at });
    };
    for (const r of requests.data || []) consider(r.email, r.name, r.song_title, r.delivered_at);
    for (const o of orders.data || []) {
      if (o.products?.product_type === 'credit_pack') continue; // nothing to listen to yet
      consider(o.customer_email, null, o.products?.title || null, o.created_at, o.user_id);
    }

    // Skip anyone already asked, automatically or from the admin tool.
    const emails = [...due.keys()];
    const { data: asked, error: askedError } = emails.length
      ? await supabase.from('review_requests').select('email').in('email', emails)
      : { data: [], error: null };
    if (askedError) throw askedError;
    const alreadyAsked = new Set((asked || []).map((a) => a.email));
    const toSend = [...due.values()].filter((d) => !alreadyAsked.has(d.email)).slice(0, MAX_PER_RUN);

    if (dryRun) return json({ dryRun: true, wouldEmail: toSend.map(({ email, song, at }) => ({ email, song, deliveredAt: at })) });

    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];
    for (const person of toSend) {
      try {
        let name = person.name;
        if (!name && person.userId) {
          const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', person.userId).maybeSingle();
          name = profile?.first_name || null;
        }
        const { subject, html } = reviewFollowupEmail({ name, song: person.song });
        await sendEmail({ to: person.email, subject, html });
        await supabase.from('review_requests').upsert({ email: person.email, last_sent_at: new Date().toISOString(), source: 'auto' });
        sent.push(person.email);
      } catch (error) {
        console.error('review follow-up failed for', person.email, error.message);
        failed.push({ email: person.email, error: error.message });
      }
    }

    console.log(`review follow-ups: sent ${sent.length}, failed ${failed.length}`);
    return json({ sent: sent.length, failed });
  } catch (error) {
    console.error('send-review-followups failed:', error.message);
    return json({ error: error.message }, 500);
  }
});
