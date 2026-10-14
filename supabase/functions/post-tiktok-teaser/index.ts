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
// Frame used as the post's cover. Teasers are recorded with fade = 0, so frame 0
// already carries the card text; asking for a moment in just dodges any browser
// warm-up frame and matches the automated path (run-social-queue).
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
        // Cover from the card, not the first frame TikTok would pick by default.
        videoCoverTimestampMs: COVER_TIMESTAMP_MS,
      });

      const row = await getSocialToken(supabaseAdmin, 'tiktok');
      const completed = posted.status === 'PUBLISH_COMPLETE';
      // TikTok answers with SEND_TO_USER_INBOX when it will not post the video
      // itself — for an unaudited app it drops it in the creator's drafts instead.
      // Treating that like "still processing" left the row stuck on `publishing`
      // for good (the reconciler has the same three terminal states), so call it
      // out with the one thing that fixes it. Mirrors run-social-queue.
      const toInbox = posted.status === 'SEND_TO_USER_INBOX';
      const rejected = posted.status === 'FAILED';
      const nextStatus = completed ? 'published' : toInbox || rejected ? 'failed' : 'publishing';
      const outcomeError = completed
        ? null
        : toInbox
          ? 'TikTok saved this to your drafts inbox instead of posting it — that is what an unaudited app does. Post the draft in TikTok by hand, or finish the Content Posting audit to let it post directly.'
          : rejected
            ? 'TikTok rejected the post.'
            : null;
      await supabaseAdmin
        .from('publications')
        .update({
          status: nextStatus,
          platform_post_id: posted.publishId,
          url: row?.display_name ? `https://www.tiktok.com/@${row.display_name}` : null,
          published_at: completed ? new Date().toISOString() : null,
          error: outcomeError,
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

      return json({ ok: completed, publishId: posted.publishId, status: posted.status, inbox: toInbox });
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
