// @ts-nocheck
// Posts one TikTok teaser via Direct Post, using choices the owner made in the
// compose dialog (privacy, interactions, commercial-content disclosure). The
// dialog already enforced TikTok's UX rules; this re-validates the essentials
// server-side — privacy must be explicitly provided and permitted, and the video
// must fit the creator's max length.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getFreshSocialAccessToken, getSocialToken } from '../_shared/social.ts';
import { publishTikTokVideo, queryTikTokCreatorInfo } from '../_shared/tiktok.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Frame used as the post's cover. The recording fades the card in over 1.1s, so
// the first frame is flat pink with no text on it.
const COVER_TIMESTAMP_MS = 1500;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('post-tiktok-teaser');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!callerToken) return json({ error: 'Forbidden' }, 403);
    if (callerToken !== supabaseServiceKey) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) return json({ error: 'Forbidden' }, 403);
    }

    const {
      publicationId,
      caption,
      privacyLevel,
      disableComment,
      disableDuet,
      disableStitch,
      brandOrganic,
      brandContent,
    } = await req.json();

    if (!publicationId) return json({ error: 'publicationId is required' }, 400);
    if (!privacyLevel) return json({ error: 'Select a privacy level before posting.' }, 400);
    if (String(caption ?? '').trim() === '') return json({ error: 'Add a caption before posting.' }, 400);
    if (brandContent && privacyLevel === 'SELF_ONLY') {
      return json({ error: 'Branded content cannot be posted privately.' }, 400);
    }

    const { data: pub, error: pubErr } = await supabaseAdmin
      .from('publications')
      .select('*, content_assets(*)')
      .eq('id', publicationId)
      .eq('platform', 'tiktok')
      .maybeSingle();
    if (pubErr) throw pubErr;
    if (!pub) return json({ error: 'Teaser not found.' }, 404);

    const asset = pub.content_assets;
    if (!asset?.storage_path) return json({ error: 'Teaser has no source media.' }, 400);

    // Claim the row so a concurrent run can't double-post.
    await supabaseAdmin
      .from('publications')
      .update({ status: 'publishing', attempts: (pub.attempts || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', pub.id);

    try {
      const accessToken = await getFreshSocialAccessToken(supabaseAdmin, 'tiktok');

      // Re-check the creator's live settings (guideline §1) and enforce limits.
      const creator = await queryTikTokCreatorInfo(accessToken);
      const allowed = creator.privacy_level_options ?? [];
      if (allowed.length && !allowed.includes(privacyLevel)) {
        throw new Error(`Privacy "${privacyLevel}" is not available for this account.`);
      }
      const maxSec = creator.max_video_post_duration_sec ?? 600;
      if (asset.duration_seconds && asset.duration_seconds > maxSec) {
        throw new Error(`This teaser is ${asset.duration_seconds}s, over the ${maxSec}s TikTok allows.`);
      }

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from('content')
        .createSignedUrl(asset.storage_path, 3600);
      if (signErr || !signed?.signedUrl) {
        throw new Error(`Couldn't sign the teaser media URL: ${signErr?.message ?? 'no URL returned'}`);
      }
      const bytesRes = await fetch(signed.signedUrl);
      if (!bytesRes.ok) throw new Error(`Couldn't fetch teaser media (${bytesRes.status}).`);
      const bytes = new Uint8Array(await bytesRes.arrayBuffer());

      const posted = await publishTikTokVideo(accessToken, bytes, {
        caption,
        privacyLevel,
        disableComment,
        disableDuet,
        disableStitch,
        brandOrganic,
        brandContent,
        mimeType: asset.mime_type,
        // Use the card itself as the cover: the first ~1.1s is the pink fade-in,
        // and TikTok defaults the cover to the very first frame.
        videoCoverTimestampMs: COVER_TIMESTAMP_MS,
      });

      const row = await getSocialToken(supabaseAdmin, 'tiktok');
      const completed = posted.status === 'PUBLISH_COMPLETE';
      await supabaseAdmin
        .from('publications')
        .update({
          status: completed ? 'published' : 'publishing',
          platform_post_id: posted.publishId,
          url: row?.display_name ? `https://www.tiktok.com/@${row.display_name}` : null,
          published_at: completed ? new Date().toISOString() : null,
          error: null,
          metadata: {
            ...(pub.metadata || {}),
            // Keep the caption the owner actually posted with, so a re-draft or
            // a retry never reverts to the machine's first suggestion.
            caption: String(caption).trim(),
            tiktok_post: {
              privacyLevel,
              videoCoverTimestampMs: COVER_TIMESTAMP_MS,
              disableComment: !!disableComment,
              disableDuet: !!disableDuet,
              disableStitch: !!disableStitch,
              brandOrganic: !!brandOrganic,
              brandContent: !!brandContent,
              postedAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', pub.id);

      return json({ ok: true, publishId: posted.publishId, status: posted.status });
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`[post-tiktok-teaser] failed for ${pub.id}:`, message);
      await supabaseAdmin
        .from('publications')
        .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
        .eq('id', pub.id);
      return json({ error: message }, 500);
    }
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
