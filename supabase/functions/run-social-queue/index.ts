// @ts-nocheck
// Scheduled teaser publishing. Runs every 15 minutes from pg_cron, alongside the
// YouTube queue, so a release goes out as one package:
//
//   1. Reconcile — ask TikTok what happened to posts still marked `publishing`,
//      so an auto-post ends up `published` / `failed` without a manual click.
//   2. Arm — a TikTok/Instagram row whose song's YouTube video is queued for a
//      future slot is moved onto that same slot (`scheduled`). Teasers stay put
//      until the video has a slot, so the social post trails its own release.
//   3. Post — publish the rows whose slot has arrived.
//
// OFF BY DEFAULT: publishing_settings.social_auto_post gates arming and posting.
// The cron invocation carries only the anon key, so that flag is the safety catch,
// and flipping it off in the admin stops the automation immediately.
//
// NOTE on TikTok: their Content Posting API has no scheduled-publish field and
// their guidelines expect each post to be user-initiated, so running this on a
// timer is a deliberate owner choice. Instagram places no such restriction.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getFreshSocialAccessToken, getSocialToken } from '../_shared/social.ts';
import { fetchTikTokPublishStatus, publishTikTokVideo } from '../_shared/tiktok.ts';
import { publishInstagramReel } from '../_shared/instagram.ts';
import { escapeHtml, safeLink, sendEmail } from '../_shared/email.ts';

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
// Frame used as the post cover: the recording opens on the card, so the first
// frame is title-bearing, but a moment in avoids any browser warm-up frame.
const COVER_TIMESTAMP_MS = 1500;
const BATCH_LIMIT = 5;
const MAX_ATTEMPTS = 3;
// Only these containers are playable on TikTok and Instagram.
const POSTABLE_MIME = /^(video\/(mp4|quicktime)|video\/x-m4v)$/i;

async function notifyAdmins(subject: string, bodyHtml: string) {
  for (const email of ADMIN_EMAILS) {
    try {
      await sendEmail({ to: email, subject, html: bodyHtml, replyTo: ADMIN_EMAILS[0] });
    } catch (err) {
      console.error(`[run-social-queue] email to ${email} failed:`, err?.message || err);
    }
  }
}

function captionFor(pub: Record<string, unknown>): string {
  const meta = (pub.metadata || {}) as Record<string, unknown>;
  const asset = (pub.content_assets || {}) as Record<string, unknown>;
  return String(meta.caption || meta.title || asset.title || asset.song_title || '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('run-social-queue');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Service role, a signed-in admin, or the cron's `scheduled` flag (anon key).
    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    let admin = false;
    if (callerToken && callerToken === supabaseServiceKey) {
      admin = true;
    } else if (callerToken) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      admin = !!user && ADMIN_EMAILS.includes(user.email || '');
    }
    const body = await req.json().catch(() => ({}));
    const isScheduled = body?.scheduled === true;
    if (!admin && !isScheduled) return json({ error: 'Forbidden' }, 403);

    // Admin-only test hooks: run the post pass for a single platform so the
    // pipeline can be exercised from the Publishing page.
    const onlyPlatform: 'tiktok' | 'instagram' | null =
      body?.only_platform === 'tiktok' || body?.only_platform === 'instagram'
        ? body.only_platform
        : null;
    if (onlyPlatform && !admin) return json({ error: 'Forbidden' }, 403);

    const { data: settings } = await supabaseAdmin
      .from('publishing_settings')
      .select('social_auto_post, social_offset_minutes, social_tiktok_privacy')
      .eq('id', 1)
      .maybeSingle();

    // The automation switch. An admin can force one pass (used to test), but the
    // cron only ever acts when the setting is on.
    const enabled = settings?.social_auto_post === true || (admin && body?.force === true);
    const offsetMs = (settings?.social_offset_minutes ?? 0) * 60_000;
    const tikTokPrivacy = settings?.social_tiktok_privacy || 'SELF_ONLY';
    const nowIso = new Date().toISOString();

    // Tracks the owner excluded from socials — their teasers never post.
    const noSocialIds = new Set<string>();
    try {
      const { data: noSocialRows } = await supabaseAdmin
        .from('backing_requests')
        .select('id')
        .eq('no_socials', true)
        .limit(1000);
      (noSocialRows ?? []).forEach((r) => noSocialIds.add(String(r.id)));
    } catch (e) {
      console.warn('[run-social-queue] no_socials lookup skipped:', e);
    }

    // --- 1) Reconcile posts that TikTok is still chewing on. ---
    const reconciled: Array<Record<string, unknown>> = [];
    try {
      const { data: pending } = await supabaseAdmin
        .from('publications')
        .select('id, platform_post_id')
        .eq('platform', 'tiktok')
        .eq('status', 'publishing')
        .not('platform_post_id', 'is', null)
        .limit(20);
      if (pending?.length) {
        const accessToken = await getFreshSocialAccessToken(supabaseAdmin, 'tiktok');
        for (const row of pending) {
          try {
            const st = await fetchTikTokPublishStatus(accessToken, row.platform_post_id);
            if (st.status === 'PUBLISH_COMPLETE') {
              await supabaseAdmin
                .from('publications')
                .update({ status: 'published', published_at: nowIso, error: null })
                .eq('id', row.id);
            } else if (st.status === 'FAILED') {
              await supabaseAdmin
                .from('publications')
                .update({ status: 'failed', error: st.fail_reason || 'TikTok rejected the post.' })
                .eq('id', row.id);
            }
            reconciled.push({ id: row.id, status: st.status });
          } catch (err) {
            reconciled.push({ id: row.id, error: err?.message || String(err) });
          }
        }
      }
    } catch (err) {
      console.error('[run-social-queue] tiktok reconcile failed:', err?.message || err);
    }

    if (!enabled) {
      return json({
        autoPost: false,
        note: 'Automatic teaser posting is off (Publishing cadence → Auto-post teasers).',
        reconciled,
      });
    }

    // --- 2) Arm teasers onto the slot of their song's YouTube video. ---
    let armed = 0;
    try {
      const { data: ytRows, error: ytErr } = await supabaseAdmin
        .from('publications')
        .select('asset_id, scheduled_for, metadata, content_assets!inner(request_id)')
        .eq('platform', 'youtube')
        .eq('status', 'scheduled')
        .gt('scheduled_for', nowIso)
        .limit(100);
      if (ytErr) throw ytErr;

      const byRequest = new Map<string, { slot: string; meta: Record<string, unknown> }>();
      const byAsset = new Map<string, { slot: string; meta: Record<string, unknown> }>();
      for (const r of ytRows ?? []) {
        if (!r.scheduled_for) continue;
        const slot = new Date(new Date(r.scheduled_for).getTime() + offsetMs).toISOString();
        const meta = (r.metadata || {}) as Record<string, unknown>;
        const requestId = (r as Record<string, unknown>).content_assets?.request_id;
        if (requestId) byRequest.set(String(requestId), { slot, meta });
        if (r.asset_id) byAsset.set(String(r.asset_id), { slot, meta });
      }

      if (byRequest.size || byAsset.size) {
        const { data: teasers, error: teaserErr } = await supabaseAdmin
          .from('publications')
          .select('id, asset_id, platform, metadata, content_assets!inner(request_id)')
          .in('platform', ['tiktok', 'instagram'])
          .in('status', ['draft', 'pending_approval'])
          .limit(200);
        if (teaserErr) throw teaserErr;

        for (const teaser of teasers ?? []) {
          const requestId = (teaser as Record<string, unknown>).content_assets?.request_id;
          const target =
            (requestId && byRequest.get(String(requestId))) ||
            byAsset.get(String(teaser.asset_id));
          if (!target) continue;
          if (requestId && noSocialIds.has(String(requestId))) continue;

          const meta = (teaser.metadata || {}) as Record<string, unknown>;
          const seeded = meta.title || meta.caption
            ? meta
            : { ...meta, title: target.meta.title ?? null, hashtags: target.meta.hashtags ?? [] };
          const { error: updErr } = await supabaseAdmin
            .from('publications')
            .update({ status: 'scheduled', scheduled_for: target.slot, error: null, metadata: seeded })
            .eq('id', teaser.id);
          if (!updErr) armed += 1;
        }
      }
    } catch (err) {
      console.error('[run-social-queue] arm pass failed:', err?.message || err);
    }

    // --- 3) Post the teasers whose slot has arrived. ---
    const posted: Array<Record<string, unknown>> = [];
    try {
      const dueQuery = supabaseAdmin
        .from('publications')
        .select('*, content_assets(*)')
        .in('platform', onlyPlatform ? [onlyPlatform] : ['tiktok', 'instagram'])
        .eq('status', 'scheduled')
        .lte('scheduled_for', nowIso);
      const { data: due, error: dueErr } = await dueQuery
        .order('scheduled_for', { ascending: true })
        .limit(onlyPlatform ? 20 : BATCH_LIMIT);
      if (dueErr) throw dueErr;

      for (const pub of due ?? []) {
        const asset = (pub.content_assets || {}) as Record<string, unknown>;
        const platform = pub.platform as 'tiktok' | 'instagram';

        if (asset.request_id && noSocialIds.has(String(asset.request_id))) {
          await supabaseAdmin
            .from('publications')
            .update({ status: 'skipped', error: 'Marked as not for socials.' })
            .eq('id', pub.id);
          posted.push({ id: pub.id, platform, status: 'skipped' });
          continue;
        }

        // Claim it so a concurrent run can't double-post.
        const { data: claimed } = await supabaseAdmin
          .from('publications')
          .update({ status: 'publishing', attempts: (pub.attempts ?? 0) + 1, updated_at: nowIso })
          .eq('id', pub.id)
          .eq('status', 'scheduled')
          .select('id')
          .maybeSingle();
        if (!claimed) continue;

        try {
          if (!asset.storage_path) throw new Error('Teaser has no source media.');
          // TikTok and Instagram can't decode the WebM some browsers fall back to.
          if (!POSTABLE_MIME.test(String(asset.mime_type || ''))) {
            throw new Error(
              `Recorded as ${asset.mime_type || 'an unknown format'}, which ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} cannot play. Re-record the teaser in Chrome or Safari.`
            );
          }
          const caption = captionFor(pub);
          if (!caption) throw new Error('Teaser has no caption.');

          const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from('content')
            .createSignedUrl(asset.storage_path, 3600);
          if (signErr || !signed?.signedUrl) {
            throw new Error(`Couldn't sign the teaser media URL: ${signErr?.message ?? 'no URL returned'}`);
          }

          if (platform === 'tiktok') {
            const accessToken = await getFreshSocialAccessToken(supabaseAdmin, 'tiktok');
            const bytesRes = await fetch(signed.signedUrl);
            if (!bytesRes.ok) throw new Error(`Couldn't fetch teaser media (${bytesRes.status}).`);
            const bytes = new Uint8Array(await bytesRes.arrayBuffer());

            const result = await publishTikTokVideo(accessToken, bytes, {
              caption,
              privacyLevel: tikTokPrivacy,
              mimeType: asset.mime_type,
              videoCoverTimestampMs: COVER_TIMESTAMP_MS,
            });
            const tokenRow = await getSocialToken(supabaseAdmin, 'tiktok');
            const completed = result.status === 'PUBLISH_COMPLETE';
            await supabaseAdmin
              .from('publications')
              .update({
                status: completed ? 'published' : 'publishing',
                platform_post_id: result.publishId,
                url: tokenRow?.display_name ? `https://www.tiktok.com/@${tokenRow.display_name}` : null,
                published_at: completed ? new Date().toISOString() : null,
                error: null,
                metadata: {
                  ...(pub.metadata || {}),
                  tiktok_post: {
                    privacyLevel: tikTokPrivacy,
                    videoCoverTimestampMs: COVER_TIMESTAMP_MS,
                    automated: true,
                    postedAt: new Date().toISOString(),
                  },
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', pub.id);
            posted.push({ id: pub.id, platform, status: result.status });
          } else {
            const accessToken = await getFreshSocialAccessToken(supabaseAdmin, 'instagram');
            const tokenRow = await getSocialToken(supabaseAdmin, 'instagram');
            const result = await publishInstagramReel(accessToken, tokenRow?.external_id, {
              videoUrl: signed.signedUrl,
              caption,
              mimeType: asset.mime_type,
            });
            await supabaseAdmin
              .from('publications')
              .update({
                status: 'published',
                platform_post_id: result.mediaId || result.containerId,
                published_at: new Date().toISOString(),
                error: null,
                metadata: {
                  ...(pub.metadata || {}),
                  instagram_post: { automated: true, postedAt: new Date().toISOString() },
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', pub.id);
            posted.push({ id: pub.id, platform, status: 'published' });
          }
        } catch (err) {
          const message = err?.message || String(err);
          const attempts = (pub.attempts ?? 0) + 1;
          const finalStatus = attempts >= MAX_ATTEMPTS ? 'failed' : 'scheduled';
          console.error(`[run-social-queue] ${platform} failed for ${pub.id} (attempt ${attempts}):`, message);
          await supabaseAdmin
            .from('publications')
            .update({ status: finalStatus, error: message, updated_at: new Date().toISOString() })
            .eq('id', pub.id);
          posted.push({ id: pub.id, platform, status: finalStatus, error: message });
          if (finalStatus === 'failed') {
            const song = String(asset.song_title || asset.title || 'a teaser');
            await notifyAdmins(
              `Teaser failed to post: ${song}`,
              `<p>The automatic ${platform} post failed after ${MAX_ATTEMPTS} attempts:</p>
               <p><strong>${escapeHtml(song)}</strong></p>
               <p>Error: ${escapeHtml(message)}</p>
               <p>Open the publishing board to retry: ${safeLink(ADMIN_URL)}</p>`
            );
          }
        }
      }
    } catch (err) {
      console.error('[run-social-queue] post pass failed:', err?.message || err);
    }

    return json({ autoPost: true, platform: onlyPlatform ?? 'all', reconciled, armed, posted });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
