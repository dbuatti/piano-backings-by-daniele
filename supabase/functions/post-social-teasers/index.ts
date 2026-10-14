// @ts-nocheck
// Posts the TikTok / Instagram teaser rows that belong to an approved track.
//
// A teaser is eligible when its asset has a YouTube row that has moved past
// review (approved/scheduled/publishing/published) and the teaser itself is
// still a draft. YouTube stays the gate: nothing social goes out until the owner
// has approved the video.
//
// UNTESTED until the platform credentials are connected — each row fails
// independently with a clear message (Instagram only accepts MP4/MOV, which is
// what the recorder now produces first).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getSocialToken, getFreshSocialAccessToken } from '../_shared/social.ts';
import { publishInstagramReel } from '../_shared/instagram.ts';

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
const BATCH_LIMIT = 10;

async function isAuthorized(req: Request, supabaseAdmin, serviceKey: string): Promise<boolean> {
  const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!callerToken) return false;
  if (callerToken === serviceKey) return true;
  const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
  return !!user && ADMIN_EMAILS.includes(user.email || '');
}


function captionFor(pub): string {
  const meta = (pub.metadata || {}) as Record<string, unknown>;
  const asset = (pub.content_assets || {}) as Record<string, unknown>;
  return String(meta.caption || meta.title || asset.title || asset.song_title || '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('post-social-teasers');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    if (!(await isAuthorized(req, supabaseAdmin, supabaseServiceKey))) {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const assetIdFilter = body?.assetId ?? null;

    // YouTube is the approval gate: only assets whose YouTube row has advanced
    // past review. We also create the TikTok/Instagram teaser rows for any such
    // track that lacks them (videos queued before the teaser pipeline existed),
    // reusing the same recorded asset — no re-recording needed.
    const { data: ytRows } = await supabaseAdmin
      .from('publications')
      .select('asset_id, metadata')
      .eq('platform', 'youtube')
      .in('status', ['approved', 'scheduled', 'publishing', 'published']);
    const approvedYt = (ytRows || []).filter((r) => r.asset_id);
    if (approvedYt.length === 0) {
      return json({ created: 0, processed: 0, results: [], note: 'No approved tracks yet.' });
    }

    const { data: existingTeasers } = await supabaseAdmin
      .from('publications')
      .select('asset_id, platform')
      .in('platform', ['tiktok', 'instagram'])
      .in('asset_id', approvedYt.map((r) => r.asset_id));
    const haveTeaser = new Set((existingTeasers || []).map((r) => `${r.asset_id}:${r.platform}`));

    const newRows = [];
    for (const yt of approvedYt) {
      const meta = (yt.metadata || {}) as Record<string, unknown>;
      for (const platform of ['tiktok', 'instagram']) {
        if (haveTeaser.has(`${yt.asset_id}:${platform}`)) continue;
        newRows.push({
          asset_id: yt.asset_id,
          platform,
          status: 'pending_approval',
          // Seed the teaser caption from the approved YouTube metadata.
          metadata: { title: meta.title ?? null, hashtags: meta.hashtags ?? [] },
        });
      }
    }
    let created = 0;
    if (newRows.length) {
      const { error: insErr } = await supabaseAdmin.from('publications').insert(newRows);
      if (insErr) throw insErr;
      created = newRows.length;
    }

    // Post the Instagram teasers. TikTok is handled by the compose dialog
    // (post-tiktok-teaser) so it goes through TikTok's required Direct Post UX.
    let query = supabaseAdmin
      .from('publications')
      .select('*, content_assets(*)')
      .eq('platform', 'instagram')
      .in('status', ['draft', 'pending_approval', 'failed'])
      .limit(BATCH_LIMIT);
    if (assetIdFilter) query = query.eq('asset_id', assetIdFilter);

    const { data: rows, error: rowsErr } = await query;
    if (rowsErr) throw rowsErr;

    const approvedAssets = new Set(approvedYt.map((r) => r.asset_id));
    const eligible = (rows || []).filter((r) => approvedAssets.has(r.asset_id));
    const results = [];

    for (const pub of eligible) {
      const platform = pub.platform;
      const asset = pub.content_assets;
      try {
        if (!asset?.storage_path) throw new Error('Teaser has no source media.');
        // Claim the row so a concurrent run can't double-post.
        await supabaseAdmin
          .from('publications')
          .update({ status: 'publishing', attempts: (pub.attempts || 0) + 1 })
          .eq('id', pub.id);

        const accessToken = await getFreshSocialAccessToken(supabaseAdmin, platform);
        // The `content` bucket is private, so hand out a short-lived signed URL
        // (getPublicUrl returns a URL that 400s) for Instagram to fetch.
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from('content')
          .createSignedUrl(asset.storage_path, 3600);
        if (signErr || !signed?.signedUrl) {
          throw new Error(`Couldn't sign the teaser media URL: ${signErr?.message ?? 'no URL returned'}`);
        }
        const mediaUrl = signed.signedUrl;
        const caption = captionFor(pub);

        const tokenRow = await getSocialToken(supabaseAdmin, 'instagram');
        const posted = await publishInstagramReel(accessToken, tokenRow?.external_id, {
          videoUrl: mediaUrl,
          caption,
          mimeType: asset.mime_type,
        });
        const platformPostId = posted.mediaId;
        const url = null;

        await supabaseAdmin
          .from('publications')
          .update({
            status: 'published',
            platform_post_id: platformPostId,
            url,
            published_at: new Date().toISOString(),
            error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pub.id);
        results.push({ id: pub.id, platform, ok: true });
      } catch (err) {
        const message = err?.message || String(err);
        console.error(`[post-social-teasers] ${platform} failed for publication ${pub.id}:`, message);
        await supabaseAdmin
          .from('publications')
          .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
          .eq('id', pub.id);
        results.push({ id: pub.id, platform, ok: false, error: message });
      }
    }

    return json({ created, processed: results.length, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
