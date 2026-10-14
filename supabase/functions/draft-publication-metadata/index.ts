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

function buildPrompt({ platform, song, show, dedication, key, title, productUrl }) {
  const firstName = (dedication || '').split(/\s+/)[0] || '';
  // The track's shop page appears only when the track is actually a shop
  // product; otherwise the description points at the custom-order form only.
  const shopLine = productUrl
    ? `"Get this track (instant download): ${productUrl}" and "Order a custom cut in your key: ${SITE}/form-page"`
    : `"Order yours (any song, your key): ${SITE}/form-page"`;

  const facts = `Song: ${song || 'unknown song'}
Show/film (optional): ${show || ''}
Prepared for: ${firstName || 'a client'}
Key: ${key || 'their chosen key'}
Working title: ${title || ''}`;

  // TikTok and Instagram are fed a *caption*, not a description: no headings, no
  // paragraph of marketing copy, and the hashtags live inside the text. That is
  // the difference between a post that reads like a person and one that reads
  // like a feed import.
  if (platform === 'tiktok') {
    return `You write TikTok captions for solo piano backing tracks, made one at a time by a small independent musician.

${facts}

The clip is the opening of a piano backing track that an auditioning singer performs over.

Write a caption a performer scrolling TikTok would actually stop for.
- The hook has to land in the first ~40 characters: TikTok hides everything after that behind "more".
- Two to four short lines. Line breaks are good. No paragraphs.
- Name the song, and the show if there is one, and make it obvious this is a piano backing track to audition or rehearse with.
- One short plain sentence that it can be made in any key.
- Finish with one easy invitation — comment the key they want, or link in bio for the full track. Never beg.
- Four to six hashtags, at the very end. Mix broad ones (#pianobackingtrack, #auditioncut, #musicaltheatre) with the song or show when it is well known.
- At most two tasteful emojis, or none. Never a wall of them, never ALL CAPS, never "🔥🔥🔥".

Return ONLY JSON (no markdown) with this shape:
{
  "title": string,      // short working title, e.g. "Song — Audition Cut (from Show)"
  "caption": string,    // the whole caption, hashtags included, with real line breaks
  "hashtags": string[]  // the hashtags alone, without the # symbol
}`;
  }

  if (platform === 'instagram') {
    return `You write Instagram Reels captions for solo piano backing tracks, made one at a time by a small independent musician.

${facts}

The clip is the opening of a piano backing track that an auditioning singer performs over.

Write a caption for a Reel.
- A hook as the first line, short enough to survive the two-line preview.
- Then three to five short lines, with a blank line between thoughts.
- Name the song, and the show if there is one, and make it obvious this is a piano backing track to audition or rehearse with.
- One short plain sentence that it can be made in any key.
- Invite a save or a share, and point at ordering a custom cut: ${SITE}/form-page
- Then a blank line and a block of eight to twelve hashtags — broad ones (#pianobackingtrack, #auditioncut, #musicaltheatre, #pianomusic, #singersofinstagram) plus the song or show when well known.
- At most two tasteful emojis, or none. Never a wall of them.

Return ONLY JSON (no markdown) with this shape:
{
  "title": string,      // short working title, e.g. "Song — Audition Cut (from Show)"
  "caption": string,    // the whole caption, hashtags included, with real line breaks
  "hashtags": string[]  // the hashtags alone, without the # symbol
}`;
  }

  return `You write YouTube metadata for solo piano backing tracks made by a small independent musician.

${facts}

Return ONLY JSON (no markdown) with this shape:
{
  "title": string,       // e.g. "Song — Audition Cut (from Show)". Use the working title as-is if good; keep it short and searchable.
  "description": string, // four short paragraphs separated by blank lines:
                         //   1. "Song — Audition Cut" and what it is; who it is for.
                         //  2. Something true about the track: the key, the feel, what a singer can do with it.
                         //  3. ${shopLine}
                         //  4. A short subscribe invitation. No hashtags in the description.
  "tags": string[],      // 8-12 search terms, no #: song title, show, "piano backing track", "audition cut", the key ("c major backing track"), "musical theatre audition"
  "hashtags": string[]   // 3-4 without the # symbol, used for the Shorts caption
}
No emojis. Write like a friendly professional, never hype.`;
}

// Google retires model names over time, and access varies by key age (a newer
// key can lose access to an older model). Try an ordered list and use the first
// one that answers, so a retired/overloaded name doesn't take the pipeline down.
// Override the whole list with the GEMINI_MODEL secret if needed.
function geminiModels() {
  const override = Deno.env.get('GEMINI_MODEL');
  return [
    ...new Set(
      [override, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-2.5-flash'].filter(Boolean)
    ),
  ];
}

async function callGemini(apiKey, prompt) {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
  });
  const deadline = Date.now() + 50000; // stay well under the function's wall-clock limit
  let lastError;
  for (const model of geminiModels()) {
    if (Date.now() > deadline) break;
    // 503 means the model exists but is briefly overloaded, so retry the same
    // name a couple of times before falling through to the next candidate.
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (Date.now() > deadline) break;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(5000, Math.min(20000, deadline - Date.now())));
      let res;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal }
        );
      } catch (err) {
        clearTimeout(timer);
        lastError = new Error(
          err?.name === 'AbortError' ? `Gemini request timed out on ${model}` : `Gemini request failed on ${model}: ${err?.message || err}`
        );
        break;
      }
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}';
        return JSON.parse(text.replace(/^```(json)?|```$/g, '').trim());
      }

      const detail = (await res.text()).slice(0, 200);
      lastError = new Error(`Gemini request failed (${res.status}) on ${model}: ${detail}`);
      console.error(`[draft-publication-metadata] model ${model} failed (attempt ${attempt}): ${res.status} ${detail}`);

      if (res.status === 503 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 700 * attempt));
        continue;
      }
      // 404 = retired/unavailable, 503 = overloaded — try the next name. Anything
      // else (bad key, malformed request) won't be fixed by another model.
      if ([404, 503].includes(res.status)) break;
      throw lastError;
    }
  }
  throw lastError || new Error('Gemini request failed.');
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
      platform,
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
      tags: Array.isArray(drafted.tags) ? drafted.tags.slice(0, 12).map(String) : [],
      hashtags: Array.isArray(drafted.hashtags) ? drafted.hashtags.slice(0, 12).map(String) : [],
      // TikTok and Instagram post a caption. run-social-queue and the composer
      // both read `metadata.caption` first, then fall back to the title.
      ...(drafted.caption ? { caption: String(drafted.caption).slice(0, 2200) } : {}),
    };

    // Only not-yet-approved rows move to pending_approval — a scheduled
    // (uploaded, waiting on its slot) or pending row keeps its status; only
    // its metadata is refreshed so a re-draft never un-schedules a video.
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('publications')
      .select('id, status, metadata')
      .eq('asset_id', body.asset_id)
      .eq('platform', platform)
      .in('status', ['draft', 'pending_approval', 'scheduled', 'failed'])
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (!existing) {
      return json({ error: `No ${platform} publication exists for this asset.` }, 400);
    }

    // Merge over the existing jsonb rather than replacing it: a re-draft is about
    // the title/description/tags, and wholesale replacement used to discard keys
    // the draft doesn't know about (tiktok_post audit, manual captions, privacy).
    const mergedMetadata = {
      ...((existing.metadata as Record<string, unknown> | null) || {}),
      ...metadata,
    };

    const { data: pub, error: pubErr } = await supabaseAdmin
      .from('publications')
      .update({
        metadata: mergedMetadata,
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

    return json({ publication_id: pub.id, metadata: mergedMetadata });
  } catch (error) {
    console.error('[draft-publication-metadata] failed:', error?.message || error);
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});