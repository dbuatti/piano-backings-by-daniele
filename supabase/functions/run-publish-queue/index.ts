// @ts-nocheck
// Processes the publishing queue. Triggered by pg_cron (anon JWT) and safely
// callable by admins / service role. Idempotent: each publication is claimed
// (status -> publishing) before upload so concurrent runs can't double-post.
//
// Two responsibilities:
//   1. Upload `approved` rows now as private videos scheduled via YouTube's
//      native `status.publishAt` — YouTube promotes them to public at the slot,
//      so no second, time-bound upload is needed.
//   2. Flip `scheduled` rows whose slot has passed to `published` (label only).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { mintChannelAccessToken, uploadVideoToYouTube } from '../_shared/youtube.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID');
    const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET');
    const YT_ACCOUNT_EMAIL =
      Deno.env.get('YT_ACCOUNT_EMAIL') || 'pianobackingsbydaniele@gmail.com';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set.');
    }

    const nowIso = new Date().toISOString();
    const results: Array<Record<string, unknown>> = [];

    // 1) Upload approved rows immediately, scheduling them through publishAt.
    const { data: toUpload, error: uploadErr } = await supabaseAdmin
      .from('publications')
      .select('id, asset_id, platform, metadata, scheduled_for, attempts, content_assets(storage_path, mime_type, title, song_title)')
      .eq('platform', 'youtube')
      .eq('status', 'approved')
      .not('scheduled_for', 'is', null)
      .order('scheduled_for', { ascending: true })
      .limit(5);

    if (uploadErr) throw uploadErr;

    for (const pub of toUpload ?? []) {
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
        const asset = pub.content_assets || {};
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
        const publishAt =
          pub.scheduled_for && new Date(pub.scheduled_for).getTime() > Date.now()
            ? pub.scheduled_for
            : undefined;
        const videoId = await uploadVideoToYouTube(token.access_token, bytes, {
          title: meta.title || fallbackTitle,
          description: meta.description || '',
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
      }
    }

    // 2) For uploaded rows whose slot has passed, confirm with YouTube that the
    // video actually became public before labelling it published. One videos.list
    // call covers all due ids; rows YouTube still reports as private stay
    // `scheduled` and get re-checked on the next run.
    const { data: due, error: dueErr } = await supabaseAdmin
      .from('publications')
      .select('id, platform_post_id')
      .eq('platform', 'youtube')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso)
      .not('platform_post_id', 'is', null);

    if (dueErr) throw dueErr;

    if ((due ?? []).length) {
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
      if (!listRes.ok) throw new Error(`YouTube videos.list failed (${listRes.status}).`);
      const list = await listRes.json();

      const publicIds = new Set<string>();
      for (const item of list.items ?? []) {
        const privacy = item?.status?.privacyStatus;
        if (privacy === 'public' || privacy === 'unlisted') publicIds.add(item.id);
      }

      for (const row of due ?? []) {
        if (!publicIds.has(row.platform_post_id)) continue;
        await supabaseAdmin
          .from('publications')
          .update({ status: 'published', published_at: nowIso })
          .eq('id', row.id);
        results.push({ id: row.id, status: 'published' });
      }
    }

    return json({ processed: results.length, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});