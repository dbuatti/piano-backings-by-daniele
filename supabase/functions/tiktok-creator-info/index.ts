// @ts-nocheck
// Returns the TikTok creator's current settings so the compose screen can render
// TikTok's required UX: nickname, allowed privacy levels, interaction
// availability, and the max video length. Admin-only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getFreshSocialAccessToken, getSocialToken } from '../_shared/social.ts';
import { queryTikTokCreatorInfo } from '../_shared/tiktok.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('tiktok-creator-info');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!callerToken) return json({ error: 'Forbidden' }, 403);
    if (callerToken !== supabaseServiceKey) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) return json({ error: 'Forbidden' }, 403);
    }

    const accessToken = await getFreshSocialAccessToken(supabaseAdmin, 'tiktok');
    const creator = await queryTikTokCreatorInfo(accessToken);
    const row = await getSocialToken(supabaseAdmin, 'tiktok');

    return json({
      creator_username: creator.creator_username ?? row?.display_name ?? null,
      creator_avatar_url: creator.creator_avatar_url ?? null,
      privacy_level_options: creator.privacy_level_options ?? [],
      max_video_post_duration_sec: creator.max_video_post_duration_sec ?? null,
      comment_disabled: creator.comment_disabled ?? false,
      duet_disabled: creator.duet_disabled ?? false,
      stitch_disabled: creator.stitch_disabled ?? false,
    });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
