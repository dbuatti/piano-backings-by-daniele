// @ts-nocheck
// Pushes a publication's (edited or re-drafted) metadata to its uploaded
// YouTube video. Called by Admin → Publishing after Edit → Save or Re-draft AI
// on rows that already have a platform_post_id, so the live video matches the
// queue. Signed-in admin only; the gateway JWT check alone is not enough (the
// anon key is also a valid JWT).
//
// Note: videos.update replaces the whole snippet, so categoryId is always sent,
// and the token needs the youtube.force-ssl scope (granted by the Connect
// YouTube Channel flow since the scope update — reconnect once if the stored
// token predates it).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireGoogleCreds, requireSupabaseEnv } from '../_shared/env.ts';
import { mintChannelAccessToken } from '../_shared/youtube.ts';
import { defaultYouTubeDescription, shopSongUrlForTrack } from '../_shared/shop.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET } = requireGoogleCreds('update-youtube-video');
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('update-youtube-video');
    const YT_ACCOUNT_EMAIL =
      Deno.env.get('YT_ACCOUNT_EMAIL') || 'pianobackingsbydaniele@gmail.com';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Admin-only: the gateway's verify_jwt merely requires a valid JWT, and the
    // anon key is one — so gate on the real signed-in user like send-email does.
    const authHeader = req.headers.get('Authorization') || '';
    const authToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!authToken) return json({ error: 'Forbidden' }, 403);
    const { data: authUser } = await supabaseAdmin.auth.getUser(authToken);
    const email = authUser?.user?.email ?? '';
    if (!['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'].includes(email)) {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as { publication_id?: string };
    if (!body.publication_id) {
      return json({ error: 'publication_id is required.' }, 400);
    }

    const { data: pub, error: pubErr } = await supabaseAdmin
      .from('publications')
      .select('id, platform_post_id, metadata, content_assets(title, song_title, show, key)')
      .eq('id', body.publication_id)
      .eq('platform', 'youtube')
      .in('status', ['scheduled', 'publishing', 'published'])
      .maybeSingle();
    if (pubErr) throw pubErr;
    if (!pub) {
      return json({ error: 'No uploaded YouTube publication found for that id.' }, 404);
    }
    if (!pub.platform_post_id) {
      return json({ error: 'That publication has no uploaded video yet.' }, 400);
    }

    const meta = pub.metadata || {};
    const asset = pub.content_assets || {};
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

    const token = await mintChannelAccessToken(supabaseAdmin, {
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      accountEmail: YT_ACCOUNT_EMAIL,
    });

    const updateRes = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          id: pub.platform_post_id,
          snippet: {
            title: meta.title || asset.title || asset.song_title || 'Piano backing track',
            description,
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            categoryId: '10',
          },
        }),
      }
    );
    if (!updateRes.ok) {
      const detail = (await updateRes.text()).slice(0, 300);
      return json(
        {
          error:
            updateRes.status === 403
              ? `YouTube rejected the update (403) — the channel token lacks update access. Reconnect the channel in Admin → Settings → Integrations, then save again. (${detail})`
              : `YouTube update failed (${updateRes.status}): ${detail}`,
        },
        updateRes.status === 403 ? 403 : 502
      );
    }

    return json({ updated: true, video_id: pub.platform_post_id });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
