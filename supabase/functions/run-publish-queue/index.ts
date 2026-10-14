// @ts-nocheck
// Processes the publishing queue. Triggered by pg_cron (anon JWT) and safely
// callable by admins / service role. Idempotent: each publication is claimed
// (status -> publishing) before upload so concurrent runs can't double-post.
//
// Responsibilities:
//   0. Hands-off booking (opt-in): give a reviewed-but-unscheduled video the next
//      free cadence slot, so a release never waits for someone to press a button.
//   1. Upload `approved` rows now as private videos scheduled via YouTube's
//      native `status.publishAt` — YouTube promotes them to public at the slot.
//   2. Confirm with YouTube that uploaded rows whose slot passed are actually
//      public, then label them `published` and email the owner.
//   3. Reclaim long-published source videos from the `content` bucket after a
//      retention window so storage doesn't accumulate forever.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { mintChannelAccessToken, uploadVideoToYouTube } from '../_shared/youtube.ts';
import { escapeHtml, safeLink, sendEmail } from '../_shared/email.ts';
import { requireGoogleCreds, requireSupabaseEnv } from '../_shared/env.ts';
import { defaultYouTubeDescription, shopSongUrlForTrack } from '../_shared/shop.ts';
import { allocatePublishingSlots, slotSettingsFrom } from '../_shared/schedule.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MAX_ATTEMPTS = 3;
const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
const ADMIN_URL = 'https://pianobackings.danielebuatti.com/admin?section=publishing';

// Best-effort notifications: never let an email failure take the queue down.
async function notifyAdmins(subject: string, bodyHtml: string) {
  for (const email of ADMIN_EMAILS) {
    try {
      await sendEmail({ to: email, subject, html: bodyHtml, replyTo: ADMIN_EMAILS[0] });
    } catch (err) {
      console.error(`[run-publish-queue] email to ${email} failed:`, err?.message || err);
    }
  }
}

function publishEmailSubject(title: string) {
  return `Now live on YouTube: ${title}`;
}

function failureEmailSubject(title: string) {
  return `Publishing failed: ${title}`;
}

function titleOf(pub: Record<string, unknown>): string {
  const asset = (pub.content_assets || {}) as Record<string, unknown>;
  const meta = (pub.metadata || {}) as Record<string, unknown>;
  return String(meta.title || asset.title || asset.song_title || 'Untitled video');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('run-publish-queue');
    const { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET } = requireGoogleCreds('run-publish-queue');
    const YT_ACCOUNT_EMAIL =
      Deno.env.get('YT_ACCOUNT_EMAIL') || 'pianobackingsbydaniele@gmail.com';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const nowIso = new Date().toISOString();
    const results: Array<Record<string, unknown>> = [];

    // Requests the owner marked "never post to socials" — any of their rows are
    // skipped outright, even if an approval already slipped through. Tolerated
    // pre-migration (column absent) so publishing keeps working either way.
    const noSocialIds = new Set<string>();
    try {
      const { data: noSocialRows, error: noSocialErr } = await supabaseAdmin
        .from('backing_requests')
        .select('id')
        .eq('no_socials', true)
        .limit(1000);
      if (noSocialErr) throw noSocialErr;
      (noSocialRows ?? []).forEach((r) => noSocialIds.add(String(r.id)));
    } catch (e) {
      console.warn('no_socials lookup skipped:', e);
    }

    // 0) Hands-off booking. A video that has been reviewed and queued — the file
    //    is recorded and the copy is written — is given the next free cadence
    //    slot by itself rather than waiting for someone to press "Book slots".
    //    Gated by publishing_settings.auto_book, which is off by default, so the
    //    normal flow (a human approves, then a human books) is unchanged.
    let autoBooked = 0;
    const autoBookSkipped: string[] = [];
    try {
      const { data: settingsRow, error: settingsErr } = await supabaseAdmin
        .from('publishing_settings')
        .select('auto_book, schedule_mode, interval_days, weekly_dow, weekly_time, timezone')
        .eq('id', 1)
        .maybeSingle();
      if (settingsErr) throw settingsErr;

      if (settingsRow?.auto_book) {
        const { data: candidates, error: candErr } = await supabaseAdmin
          .from('publications')
          .select('id, status, metadata, content_assets(storage_path, request_id)')
          .eq('platform', 'youtube')
          .in('status', ['draft', 'pending_approval', 'approved'])
          .is('scheduled_for', null)
          .order('created_at', { ascending: true })
          .limit(50);
        if (candErr) throw candErr;

        // Only rows that are genuinely ready: a recorded file and drafted copy.
        // A video going out without a description looks broken on the channel,
        // and a row with no file has nothing to upload.
        const ready = (candidates ?? []).filter((row) => {
          const asset = (row.content_assets || {}) as Record<string, unknown>;
          const meta = (row.metadata || {}) as Record<string, unknown>;
          const hasCopy = !!String(meta.description || '').trim();
          const noSocial = asset.request_id && noSocialIds.has(String(asset.request_id));
          if (!asset.storage_path || !hasCopy || noSocial) {
            autoBookSkipped.push(String(meta.title || asset.request_id || row.id));
            return false;
          }
          return true;
        });

        if (ready.length) {
          // Start after everything already booked so two runs never collide.
          const { data: bookedRows } = await supabaseAdmin
            .from('publications')
            .select('scheduled_for')
            .eq('platform', 'youtube')
            .in('status', ['approved', 'scheduled', 'publishing'])
            .not('scheduled_for', 'is', null)
            .gte('scheduled_for', nowIso)
            .limit(500);
          const existing = (bookedRows ?? [])
            .map((r) => r.scheduled_for)
            .filter((s): s is string => !!s)
            .map((s) => new Date(s));

          const slots = allocatePublishingSlots(slotSettingsFrom(settingsRow), ready.length, existing);
          for (let i = 0; i < ready.length; i++) {
            const row = ready[i];
            const { data: booked } = await supabaseAdmin
              .from('publications')
              .update({
                status: 'approved',
                approved_at: nowIso,
                scheduled_for: slots[i].toISOString(),
                error: null,
                attempts: 0,
              })
              .eq('id', row.id)
              .eq('status', row.status)
              .is('scheduled_for', null)
              .select('id')
              .maybeSingle();
            if (booked) {
              autoBooked += 1;
              results.push({ id: row.id, status: 'auto-booked', scheduled_for: slots[i].toISOString() });
            }
          }
        }
      }
    } catch (err) {
      // A booking hiccup must never stop uploads, confirmation or retention.
      console.error('[run-publish-queue] auto-book pass failed:', err?.message || err);
    }

    // 1) Upload approved rows immediately, scheduling them through publishAt.
    const { data: toUpload, error: uploadErr } = await supabaseAdmin
      .from('publications')
      .select('id, asset_id, platform, metadata, scheduled_for, attempts, content_assets(storage_path, mime_type, title, song_title, show, key, request_id)')
      .eq('platform', 'youtube')
      .eq('status', 'approved')
      .not('scheduled_for', 'is', null)
      .order('scheduled_for', { ascending: true })
      .limit(5);

    if (uploadErr) throw uploadErr;

    for (const pub of toUpload ?? []) {
      const asset = (pub.content_assets || {}) as Record<string, unknown>;

      // Never upload a track the owner excluded from socials.
      if (asset.request_id && noSocialIds.has(String(asset.request_id))) {
        await supabaseAdmin
          .from('publications')
          .update({ status: 'skipped', scheduled_for: null, error: 'Marked as not for socials.' })
          .eq('id', pub.id);
        results.push({ id: pub.id, status: 'skipped', error: 'Marked as not for socials.' });
        continue;
      }

      // Claim it — only one worker wins the transition from approved -> publishing.
      const { data: claimed } = await supabaseAdmin
        .from('publications')
        .update({ status: 'publishing', attempts: (pub.attempts ?? 0) + 1 })
        .eq('id', pub.id)
        .eq('status', 'approved')
        .select('id')
        .maybeSingle();
      if (!claimed) continue;

      try {
        if (!asset.storage_path) throw new Error('Asset is missing a storage path.');

        const { data: file, error: dlErr } = await supabaseAdmin.storage
          .from('content')
          .download(asset.storage_path);
        if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message || 'no file'}`);

        const bytes = new Uint8Array(await file.arrayBuffer());
        const token = await mintChannelAccessToken(supabaseAdmin, {
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          accountEmail: YT_ACCOUNT_EMAIL,
        });

        const meta = pub.metadata || {};
        const fallbackTitle = asset.title || asset.song_title || 'Piano backing track';
        // Never upload without a description: fall back to a deterministic one
        // (with the track's shop page when it's a shop product).
        const description =
          meta.description && String(meta.description).trim()
            ? meta.description
            : defaultYouTubeDescription(
                asset,
                await shopSongUrlForTrack(supabaseAdmin, {
                  song_title: asset.song_title,
                  show: asset.show,
                })
              );
        const publishAt =
          pub.scheduled_for && new Date(pub.scheduled_for).getTime() > Date.now()
            ? pub.scheduled_for
            : undefined;
        const videoId = await uploadVideoToYouTube(token.access_token, bytes, {
          title: meta.title || fallbackTitle,
          description,
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          privacy: publishAt ? 'private' : meta.privacy || 'unlisted',
          publishAt,
          mimeType: asset.mime_type || 'video/webm',
        });

        await supabaseAdmin
          .from('publications')
          .update({
            status: 'scheduled',
            platform_post_id: videoId,
            url: `https://youtu.be/${videoId}`,
            error: null,
          })
          .eq('id', pub.id);

        results.push({ id: pub.id, status: 'scheduled', url: `https://youtu.be/${videoId}` });
      } catch (err) {
        const attempts = (pub.attempts ?? 0) + 1;
        const finalStatus = attempts >= MAX_ATTEMPTS ? 'failed' : 'approved';
        await supabaseAdmin
          .from('publications')
          .update({ status: finalStatus, error: String(err?.message || err) })
          .eq('id', pub.id);
        results.push({ id: pub.id, status: finalStatus, error: String(err?.message || err) });
        if (finalStatus === 'failed') {
          const title = titleOf(pub);
          await notifyAdmins(
            failureEmailSubject(title),
            `<p>A video failed to publish after ${MAX_ATTEMPTS} attempts:</p>
             <p><strong>${escapeHtml(title)}</strong></p>
             <p>Error: ${escapeHtml(String(err?.message || err))}</p>
             <p>Open the publishing queue to retry: ${safeLink(ADMIN_URL)}</p>`
          );
        }
      }
    }

    // 2) For uploaded rows whose slot has passed, confirm with YouTube that the
    // video actually became public before labelling it published. One videos.list
    // call covers all due ids; rows YouTube still reports as private stay
    // `scheduled` and get re-checked on the next run.
    const { data: due, error: dueErr } = await supabaseAdmin
      .from('publications')
      .select('id, platform_post_id, url, scheduled_for, metadata, content_assets(title, song_title)')
      .eq('platform', 'youtube')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso)
      .not('platform_post_id', 'is', null)
      // videos.list accepts at most 50 ids per call; the next run picks up the rest.
      .limit(50);

    if (dueErr) throw dueErr;

    // Set to true when YouTube's Videos API can't confirm status (e.g. an
    // upload-only channel token without read scope). Confirmation then falls
    // back to the schedule: a video whose slot passed a grace period ago is
    // taken as live, since YouTube publishes at `publishAt` on its own.
    let confirmationDegraded = false;

    if ((due ?? []).length) {
      let publicIds: Set<string> | null = null;
      try {
        const token = await mintChannelAccessToken(supabaseAdmin, {
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          accountEmail: YT_ACCOUNT_EMAIL,
        });
        const ids = due.map((p) => p.platform_post_id);
        const listRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${ids.join(',')}&part=status`,
          { headers: { Authorization: `Bearer ${token.access_token}` } }
        );
        if (listRes.ok) {
          const list = await listRes.json();
          publicIds = new Set<string>();
          for (const item of list.items ?? []) {
            const privacy = item?.status?.privacyStatus;
            if (privacy === 'public' || privacy === 'unlisted') publicIds.add(item.id);
          }
        } else {
          confirmationDegraded = true;
          console.warn(`[run-publish-queue] videos.list ${listRes.status} — confirming by schedule instead.`);
        }
      } catch (e) {
        // Never let a confirmation failure block uploads, retention or the run.
        confirmationDegraded = true;
        console.warn('[run-publish-queue] confirmation via videos.list failed:', e?.message || e);
      }

      const graceMs = Number(Deno.env.get('PUBLISH_CONFIRM_GRACE_MINUTES') || 60) * 60_000;
      for (const row of due ?? []) {
        const confirmed = publicIds ? publicIds.has(row.platform_post_id) : false;
        const slotPassed =
          !!row.scheduled_for && new Date(row.scheduled_for).getTime() <= Date.now() - graceMs;
        // Promote when YouTube confirms it, or when its slot has clearly passed
        // and we simply can't ask YouTube today.
        if (!confirmed && !(publicIds === null && slotPassed)) continue;
        // Compare-and-set: two overlapping runs used to both promote the row and
        // both email. Only the run that actually moved it announces it.
        const { data: promoted } = await supabaseAdmin
          .from('publications')
          .update({ status: 'published', published_at: nowIso })
          .eq('id', row.id)
          .eq('status', 'scheduled')
          .select('id')
          .maybeSingle();
        if (!promoted) continue;
        results.push({ id: row.id, status: 'published', url: row.url });
        const title = titleOf(row);
        await notifyAdmins(
          publishEmailSubject(title),
          `<p>This week's video is live on YouTube:</p>
           <p><strong>${escapeHtml(title)}</strong></p>
           <p>Watch: ${safeLink(row.url || '')}</p>
           <p>Manage the queue: ${safeLink(ADMIN_URL)}</p>`
        );
      }
    }

    // 3) Storage retention: once a full-length video has been published for a
    // while, its webm in the `content` bucket is just a source record — delete
    // it (keeping the row, URL and small preview) to stop storage from growing.
    const retentionDays = Number(Deno.env.get('CONTENT_RETENTION_DAYS') || 30);
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
    const { data: stalePubs, error: staleErr } = await supabaseAdmin
      .from('publications')
      .select('id, asset_id, content_assets(storage_path)')
      .eq('status', 'published')
      .lt('published_at', cutoff)
      .not('published_at', 'is', null);

    if (staleErr) throw staleErr;
    // An asset can back more than one row, so don't retire a source that any
    // non-terminal publication still points at.
    const staleAssetIds = [...new Set((stalePubs ?? []).map((p) => p.asset_id).filter(Boolean))];
    const busyAssetIds = new Set<string>();
    if (staleAssetIds.length) {
      try {
        const { data: liveRows } = await supabaseAdmin
          .from('publications')
          .select('asset_id')
          .in('asset_id', staleAssetIds)
          .not('status', 'in', '(published,failed,skipped)');
        (liveRows ?? []).forEach((r) => r.asset_id && busyAssetIds.add(String(r.asset_id)));
      } catch (e) {
        console.warn('[run-publish-queue] retention in-use check skipped:', e?.message || e);
      }
    }
    const cleaned = new Set<string>();
    for (const pub of stalePubs ?? []) {
      const path = pub?.content_assets?.storage_path;
      if (!path || cleaned.has(pub.asset_id) || busyAssetIds.has(String(pub.asset_id))) continue;
      cleaned.add(pub.asset_id);
      try {
        // remove() reports failures in `error` rather than throwing; nulling the
        // pointer on a failed delete would orphan the object with no way to find it.
        const { error: removeErr } = await supabaseAdmin.storage.from('content').remove([path]);
        if (removeErr) throw removeErr;
        await supabaseAdmin
          .from('content_assets')
          .update({ storage_path: null })
          .eq('id', pub.asset_id);
        results.push({ id: pub.asset_id, status: 'source-retired' });
      } catch (err) {
        console.error(`[run-publish-queue] cleanup of ${path} failed:`, err?.message || err);
      }
    }

    return json({ processed: results.length, confirmationDegraded, autoBooked, autoBookSkipped, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});