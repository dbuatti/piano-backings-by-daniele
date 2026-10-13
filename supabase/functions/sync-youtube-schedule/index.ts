// @ts-nocheck
// Pushes updated `scheduled_for` dates to already-uploaded YouTube videos.
// After the release board re-books the queue onto a new cadence, this walks every
// future `scheduled` YouTube row whose video is already on the channel and moves
// its publishAt to match, so the live schedule matches the board. Admin /
// service-role only; it never uploads or deletes anything.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { mintChannelAccessToken } from '../_shared/youtube.ts';
import { requireGoogleCreds, requireSupabaseEnv } from '../_shared/env.ts';

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

async function isAdmin(req, supabaseAdmin) {
  const authHeader = req.headers.get('Authorization') || '';
  const callerToken = authHeader.replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (callerToken && callerToken === serviceKey) return true;
  if (!callerToken) return false;
  const { data } = await supabaseAdmin.auth.getUser(callerToken);
  return Boolean(data?.user && ADMIN_EMAILS.includes(data.user.email || ''));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('sync-youtube-schedule');
    const { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET } = requireGoogleCreds('sync-youtube-schedule');
    const YT_ACCOUNT_EMAIL =
      Deno.env.get('YT_ACCOUNT_EMAIL') || 'pianobackingsbydaniele@gmail.com';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!(await isAdmin(req, supabaseAdmin))) {
      return json({ error: 'Forbidden' }, 403);
    }

    // Every uploaded-but-not-yet-live YouTube row on the schedule.
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from('publications')
      .select('id, platform_post_id, scheduled_for')
      .eq('platform', 'youtube')
      .eq('status', 'scheduled')
      .not('platform_post_id', 'is', null)
      .gt('scheduled_for', nowIso);
    if (error) throw error;

    if (!(rows ?? []).length) {
      return json({ synced: 0, failed: 0, results: [] });
    }

    const token = await mintChannelAccessToken(supabaseAdmin, {
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      accountEmail: YT_ACCOUNT_EMAIL,
    });

    const results = [];
    let synced = 0;
    let failed = 0;
    for (const row of rows ?? []) {
      // YouTube requires the video to stay `private` until publishAt arrives.
      const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          id: row.platform_post_id,
          status: {
            privacyStatus: 'private',
            publishAt: new Date(row.scheduled_for).toISOString(),
            selfDeclaredMadeForKids: false,
          },
        }),
      });
      if (res.ok) {
        synced += 1;
        results.push({ id: row.id, ok: true });
      } else {
        failed += 1;
        const detail = (await res.text()).slice(0, 200);
        results.push({ id: row.id, ok: false, status: res.status, error: detail });
        console.warn(`[sync-youtube-schedule] ${row.platform_post_id} failed (${res.status}): ${detail}`);
      }
    }

    return json({ synced, failed, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
