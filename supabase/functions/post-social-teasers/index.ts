// @ts-nocheck
// Posts the TikTok / Instagram teaser rows that belong to an approved track.
//
// A teaser is eligible when its asset has a YouTube row that has moved past
// review (approved/scheduled/publishing/published) and the teaser itself is
// still a draft. YouTube stays the gate: nothing social goes out until the owner
// has approved the video.
//
// UNTESTED until the platform credentials are connected — each row fails
// independently with a clear message (Instagram in particular needs an MP4
// source, not our webm recordings).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getSocialToken, saveSocialToken, type SocialPlatform } from '../_shared/social.ts';
import { publishTikTokVideo, refreshTikTokToken } from '../_shared/tiktok.ts';
import { publishInstagramReel, refreshInstagramToken } from '../_shared/instagram.ts';

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

// Returns a usable access token, refreshing + persisting it when expired.
async function freshAccessToken(supabaseAdmin, platform: SocialPlatform): Promise<string> {
  const row = await getSocialToken(supabaseAdmin, platform);
  if (!row?.access_token) throw new Error(`No ${platform} account connected (Settings → Integrations).`);

  const stillValid = row.expires_at ? new Date(row.expires_at).getTime() > Date.now() + 60_000 : true;
  if (stillValid) return row.access_token;

  if (platform === 'tiktok' && row.refresh_token) {
    const data = await refreshTikTokToken(
      Deno.env.get('TIKTOK_CLIENT_KEY'),
      Deno.env.get('TIKTOK_CLIENT_SECRET'),
      row.refresh_token
    );
    await saveSocialToken(supabaseAdmin, {
      platform,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      externalId: row.external_id,
      displayName: row.display_name,
      scope: data.scope,
    });
    return data.access_token;
  }
  if (platform === 'instagram') {
    const data = await refreshInstagramToken(row.access_token);
    await saveSocialToken(supabaseAdmin, {
      platform,
      accessToken: data.access_token,
      externalId: row.external_id,
      displayName: row.display_name,
      expiresIn: data.expires_in,
      scope: row.scope,
    });
    return data.access_token;
  }
  return row.access_token;
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

    // YouTube is the approval gate: only assets whose YouTube row has advanced.
    const { data: ytRows } = await supabaseAdmin
      .from('publications')
      .select('asset_id')
      .eq('platform', 'youtube')
      .in('status', ['approved', 'scheduled', 'publishing', 'published']);
    const approvedAssets = new Set((ytRows || []).map((r) => r.asset_id));
    if (approvedAssets.size === 0) {
      return json({ processed: 0, results: [], note: 'No approved tracks yet.' });
    }

    let query = supabaseAdmin
      .from('publications')
      .select('*, content_assets(*)')
      .in('platform', ['tiktok', 'instagram'])
      .eq('status', 'draft')
      .limit(BATCH_LIMIT);
    if (assetIdFilter) query = query.eq('asset_id', assetIdFilter);

    const { data: rows, error: rowsErr } = await query;
    if (rowsErr) throw rowsErr;

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

        const accessToken = await freshAccessToken(supabaseAdmin, platform);
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('content')
          .getPublicUrl(asset.storage_path);
        const caption = captionFor(pub);

        let platformPostId = null;
        let url = null;
        if (platform === 'tiktok') {
          const tokenRow = await getSocialToken(supabaseAdmin, 'tiktok');
          const bytesRes = await fetch(publicUrl);
          if (!bytesRes.ok) throw new Error(`Couldn't fetch teaser media (${bytesRes.status}).`);
          const bytes = new Uint8Array(await bytesRes.arrayBuffer());
          const posted = await publishTikTokVideo(accessToken, bytes, {
            caption,
            mimeType: asset.mime_type,
          });
          platformPostId = posted.publishId;
          url = tokenRow?.display_name ? `https://www.tiktok.com/@${tokenRow.display_name}` : null;
        } else {
          const tokenRow = await getSocialToken(supabaseAdmin, 'instagram');
          const posted = await publishInstagramReel(accessToken, tokenRow?.external_id, {
            videoUrl: publicUrl,
            caption,
            mimeType: asset.mime_type,
          });
          platformPostId = posted.mediaId || posted.containerId;
        }

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
        await supabaseAdmin
          .from('publications')
          .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
          .eq('id', pub.id);
        results.push({ id: pub.id, platform, ok: false, error: message });
      }
    }

    return json({ processed: results.length, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
