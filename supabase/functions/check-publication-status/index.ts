// @ts-nocheck
// Best-effort reconciliation of a publication with YouTube's actual state.
// Signed-in admin only (JWT verified by the gateway AND the caller's email is
// checked against the admin list). With no body it reconciles every non-terminal
// YouTube publication; with `{ publication_id }` it checks one.
//
// Uses videos.list (part=status) so we can tell when a scheduled (private)
// video has actually been promoted to public by YouTube, instead of trusting
// the clock.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireGoogleCreds, requireSupabaseEnv } from '../_shared/env.ts';
import { mintChannelAccessToken } from '../_shared/youtube.ts';

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
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('check-publication-status');
    const { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET } = requireGoogleCreds('check-publication-status');
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

    const body = (await req.json().catch(() => ({}))) as {
      publication_id?: string;
    };

    const q = supabaseAdmin
      .from('publications')
      .select('id, platform_post_id, scheduled_for, status')
      .eq('platform', 'youtube')
      .in('status', ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing']);
    if (body.publication_id) q.eq('id', body.publication_id);
    const { data: pubs, error: qErr } = await q;
    if (qErr) throw qErr;

    const withVideo = (pubs ?? []).filter((p) => p.platform_post_id);
    if (!withVideo.length) return json({ processed: 0, results: [] });

    const token = await mintChannelAccessToken(supabaseAdmin, {
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      accountEmail: YT_ACCOUNT_EMAIL,
    });

    const ids = withVideo.map((p) => p.platform_post_id);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${ids.join(',')}&part=status`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? 'YouTube videos.list was denied (403) — the channel token lacks read access. Reconnect the channel in Admin → Settings → Integrations.'
          : `YouTube videos.list failed (${res.status}).`
      );
    }
    const list = await res.json();

    const byId = new Map<string, { privacyStatus?: string; uploadStatus?: string }>();
    for (const item of list.items ?? []) {
      const s = item?.status || {};
      byId.set(item.id, { privacyStatus: s.privacyStatus, uploadStatus: s.uploadStatus });
    }

    const nowIso = new Date().toISOString();
    const results: Array<Record<string, unknown>> = [];

    for (const pub of withVideo) {
      const yt = byId.get(pub.platform_post_id ?? '');
      if (!yt) continue; // Not yet visible in the API; leave for the next pass.

      let nextStatus: string | null = null;
      let error: string | null = null;
      if (yt.uploadStatus === 'failed' || yt.uploadStatus === 'rejected') {
        nextStatus = 'failed';
        error = `YouTube upload ${yt.uploadStatus}.`;
      } else if (yt.privacyStatus === 'public' || yt.privacyStatus === 'unlisted') {
        nextStatus = 'published';
      }
      // private + uploadStatus 'processed'/'uploaded' => still scheduled.

      if (nextStatus && nextStatus !== pub.status) {
        await supabaseAdmin
          .from('publications')
          .update({
            status: nextStatus,
            ...(nextStatus === 'published' ? { published_at: nowIso } : {}),
            ...(error ? { error } : {}),
          })
          .eq('id', pub.id);
        results.push({ id: pub.id, status: nextStatus, error });
      }
    }

    return json({ processed: results.length, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});