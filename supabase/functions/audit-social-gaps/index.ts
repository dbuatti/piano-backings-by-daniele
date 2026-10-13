// @ts-nocheck
// On-demand release audit. Finds delivered backing tracks that are missing from
// the pipeline — not on YouTube, or not in the shop — and emails the owner a
// digest so the gaps get closed. Admin / service-role only; it only reads and
// sends a notification, never posts anything.
//
// "Delivered" mirrors the release board: an audio file exists under
// tracks/<request-id>/ in the `tracks` bucket.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendEmail } from '../_shared/email.ts';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { slugify } from '../_shared/shop.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
const ADMIN_URL = 'https://pianobackings.danielebuatti.com/admin?section=publishing';
const SITE = 'https://pianobackings.danielebuatti.com';
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i;

async function isAdmin(req, supabaseAdmin) {
  const authHeader = req.headers.get('Authorization') || '';
  const callerToken = authHeader.replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (callerToken && callerToken === serviceKey) return true;
  if (!callerToken) return false;
  const { data } = await supabaseAdmin.auth.getUser(callerToken);
  return Boolean(data?.user && ADMIN_EMAILS.includes(data.user.email || ''));
}

// Request ids that have at least one audio file under tracks/<id>/.
async function deliveredRequestIds(supabaseAdmin) {
  const ids = [];
  const { data: folders, error } = await supabaseAdmin.storage.from('tracks').list('tracks/', { limit: 400 });
  if (error) throw error;
  for (const folder of folders || []) {
    if (folder.id !== null) continue;
    const { data: files } = await supabaseAdmin.storage.from('tracks').list(`tracks/${folder.name}/`, { limit: 100 });
    if ((files || []).some((f) => f.id !== null && AUDIO_EXT.test(f.name))) ids.push(folder.name);
  }
  return ids;
}

const hasShopListing = (products, song, show) => {
  const titleSlug = slugify(song);
  if (!titleSlug) return false;
  const showSlug = slugify(show);
  return products.some(
    (p) =>
      (p.product_type || 'track') === 'track' &&
      slugify(p.title) === titleSlug &&
      (!showSlug || !slugify(p.artist_name) || slugify(p.artist_name) === showSlug)
  );
};

const escape = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, serviceKey } = requireSupabaseEnv('audit-social-gaps');
    const supabaseAdmin = createClient(url, serviceKey);
    if (!(await isAdmin(req, supabaseAdmin))) {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const shouldEmail = body.email !== false;

    const ids = await deliveredRequestIds(supabaseAdmin);
    if (!ids.length) {
      return json({ delivered: 0, gaps: { not_on_youtube: [], no_shop: [] } });
    }

    const columns = 'id, song_title, musical_or_artist, song_key, different_key, key_for_track, no_socials, additional_services';
    let reqRows = null;
    let reqErr = null;
    ({ data: reqRows, error: reqErr } = await supabaseAdmin.from('backing_requests').select(columns).in('id', ids));
    if (reqErr) {
      // no_socials arrives with migration 0039; retry without it rather than fail.
      const withoutFlag = columns.replace(', no_socials', '');
      ({ data: reqRows, error: reqErr } = await supabaseAdmin.from('backing_requests').select(withoutFlag).in('id', ids));
    }
    if (reqErr) throw reqErr;

    const [productsRes, pubsRes] = await Promise.all([
      supabaseAdmin.from('products').select('title, artist_name, product_type').eq('is_active', true),
      supabaseAdmin.from('publications').select('status, platform, content_assets!inner(request_id)'),
    ]);
    const products = productsRes.data || [];
    const ytByRequest = new Set();
    for (const p of pubsRes.data || []) {
      const rid = p.content_assets?.request_id;
      if (rid && p.platform === 'youtube') ytByRequest.add(String(rid));
    }

    const notOnYouTube = [];
    const noShop = [];
    for (const row of reqRows || []) {
      const song = String(row.song_title || '').trim() || 'Untitled';
      const show = String(row.musical_or_artist || '').trim();
      const services = Array.isArray(row.additional_services) ? row.additional_services : [];
      const exclusive = services.some(
        (s) => String(s).trim().toLowerCase().replace(/\s+/g, '-') === 'exclusive-ownership'
      );
      const allowed = !row.no_socials && !exclusive;
      if (allowed && !ytByRequest.has(String(row.id))) notOnYouTube.push({ song, show });
      if (!hasShopListing(products, song, show)) noShop.push({ song, show });
    }

    if (shouldEmail && (notOnYouTube.length || noShop.length)) {
      const html = `
        <h2>Release pipeline audit</h2>
        <p>${escape(String(ids.length))} delivered tracks checked.</p>
        ${notOnYouTube.length ? `<h3>Not on YouTube (${notOnYouTube.length})</h3><ul>${notOnYouTube.map((t) => `<li>${escape(t.song)}${t.show ? ` <span style="color:#888">(${escape(t.show)})</span>` : ''}</li>`).join('')}</ul>` : ''}
        ${noShop.length ? `<h3>No active shop listing (${noShop.length})</h3><ul>${noShop.map((t) => `<li>${escape(t.song)}${t.show ? ` <span style="color:#888">(${escape(t.show)})</span>` : ''}</li>`).join('')}</ul>` : ''}
        <p><a href="${ADMIN_URL}">Open the release board</a> — queue the missing videos and add the missing shop listings. TikTok and Instagram posting arrives once those integrations are approved.</p>
        <p style="color:#888;font-size:12px">Sent by the Piano Backings publishing pipeline · ${SITE}</p>`;
      try {
        await sendEmail({
          to: ADMIN_EMAILS,
          subject: `Release audit: ${notOnYouTube.length} not on YouTube · ${noShop.length} missing from the shop`,
          html,
          replyTo: ADMIN_EMAILS[0],
        });
      } catch (err) {
        console.error('[audit-social-gaps] email failed:', err?.message || err);
      }
    }

    return json({
      delivered: ids.length,
      not_on_youtube: notOnYouTube,
      no_shop: noShop,
      emailed: shouldEmail,
    });
  } catch (error) {
    console.error('[audit-social-gaps] failed:', error?.message || error);
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
