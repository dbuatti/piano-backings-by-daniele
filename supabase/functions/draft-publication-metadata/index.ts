// @ts-nocheck
// Drafts per-platform publishing metadata with Google Gemini and stores it on the
// publication row, flipping it to pending_approval. Called when a video is added
// to the publishing queue. Requires a GEMINI_API_KEY secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireEnv, requireSupabaseEnv } from '../_shared/env.ts';
import { shopSongUrlForTrack } from '../_shared/shop.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SITE = 'https://pianobackings.danielebuatti.com';

function buildPrompt({ song, show, dedication, key, title, productUrl }) {
  const firstName = (dedication || '').split(/\s+/)[0] || '';
  // The track's shop page appears only when the track is actually a shop
  // product; otherwise the description points at the custom-order form only.
  const shopLine = productUrl
    ? `"Get this track (instant download): ${productUrl}" and "Order a custom cut in your key: ${SITE}/form-page"`
    : `"Order yours (any song, your key): ${SITE}/form-page"`;
  return `You write YouTube metadata for solo piano backing tracks made by a small independent musician.

Song: ${song || 'unknown song'}
Show/film (optional): ${show || ''}
Prepared for: ${firstName || 'a client'}
Key: ${key || 'their chosen key'}
Working title: ${title || ''}

Return ONLY JSON (no markdown) with this shape:
{
  "title": string,       // e.g. "Song — Banner (from Show)". Use the working title as-is if good; keep it short and searchable.
  "description": string, // paragraphs separated by blank lines:
                         //  1. "Song — Banner (from Show)" + "Prepared for <firstName>." + "Key: X."
                         //  2. One line pitching custom piano backing tracks (auditions, performances, practice; arranged & recorded in the key you choose; delivered fast).
                         //  3. ${shopLine}
                         //  4. "Follow: https://www.youtube.com/@pianobackingsbydaniele and https://www.instagram.com/pianobackingsbydaniele/"
                         //  5. 3-4 hashtags like "#pianobackingtrack #backingtrack #auditioncut #musicaltheatre"
  "tags": string[],      // 5-8 lowercase tags: song, show, piano, piano backing track, backing track, audition, musical theatre, key (e.g. "key of C major")
  "hashtags": string[]   // 3-4 hashtags without the # symbol
}
No emojis. Write like a friendly professional, never hype.`;
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}';
  return JSON.parse(text.replace(/^```(json)?|```$/g, '').trim());
}

async function isAdmin(req, supabaseAdmin) {
  const authHeader = req.headers.get('Authorization') || '';
  const callerToken = authHeader.replace(/^Bearer\s+/i, '');
  const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (callerToken && callerToken === serviceKey) return true;
  if (!callerToken) return false;
  const { data } = await supabaseAdmin.auth.getUser(callerToken);
  return Boolean(data?.user && adminEmails.includes(data.user.email || ''));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('draft-publication-metadata');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    if (!(await isAdmin(req, supabaseAdmin))) {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    if (!body.asset_id) {
      return json({ error: 'asset_id is required.' }, 400);
    }
    const platform = String(body.platform || 'youtube').toLowerCase();

    // Accept either the server-only secret name or the VITE_-prefixed one (which
    // the browser bundle already carries), so the draft works regardless of how
    // the key was added. Still fails loudly if neither is set.
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY') || '';
    if (!apiKey) requireEnv(['GEMINI_API_KEY'], 'draft-publication-metadata');

    const { data: asset, error: assetErr } = await supabaseAdmin
      .from('content_assets')
      .select('*, backing_requests(song_title, musical_or_artist, name, song_key, key_for_track, different_key)')
      .eq('id', body.asset_id)
      .maybeSingle();
    if (assetErr || !asset) throw new Error(assetErr?.message || 'Asset not found.');

    const reqRow = asset.backing_requests || {};
    const key =
      String(reqRow.different_key ?? '') === 'Yes'
        ? (reqRow.key_for_track || reqRow.song_key) || null
        : reqRow.song_key || null;
    const fallbackTitle =
      asset.title ||
      String(reqRow.song_title || asset.song_title || '').trim() ||
      'Piano backing track';

    const drafted = await callGemini(apiKey, buildPrompt({
      song: String(reqRow.song_title || '').trim(),
      show: String(reqRow.musical_or_artist || '').trim(),
      dedication: String(reqRow.name || '').trim(),
      key: key || null,
      title: fallbackTitle,
      productUrl: await shopSongUrlForTrack(supabaseAdmin, {
        song_title: asset.song_title,
        show: asset.show,
      }),
    }));

    const metadata = {
      title: String(drafted.title || fallbackTitle).slice(0, 100),
      description: String(drafted.description || '').slice(0, 5000),
      tags: Array.isArray(drafted.tags) ? drafted.tags.slice(0, 10).map(String) : [],
      hashtags: Array.isArray(drafted.hashtags) ? drafted.hashtags.slice(0, 6).map(String) : [],
    };

    // Only not-yet-approved rows move to pending_approval — a scheduled
    // (uploaded, waiting on its slot) or pending row keeps its status; only
    // its metadata is refreshed so a re-draft never un-schedules a video.
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('publications')
      .select('id, status')
      .eq('asset_id', body.asset_id)
      .eq('platform', platform)
      .in('status', ['draft', 'pending_approval', 'scheduled', 'failed'])
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (!existing) {
      return json({ error: `No ${platform} publication exists for this asset.` }, 400);
    }

    const { data: pub, error: pubErr } = await supabaseAdmin
      .from('publications')
      .update({
        metadata,
        error: null,
        ...(['draft', 'failed'].includes(existing.status)
          ? { status: 'pending_approval' }
          : {}),
      })
      .eq('id', existing.id)
      .select('id')
      .maybeSingle();
    if (pubErr) throw pubErr;
    if (!pub) {
      return json({ error: `No ${platform} publication exists for this asset.` }, 400);
    }

    return json({ publication_id: pub.id, metadata });
  } catch (error) {
    console.error('[draft-publication-metadata] failed:', error?.message || error);
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});