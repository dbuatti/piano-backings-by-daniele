import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// A delivered backing track: audio is in the public `tracks` bucket, linked to
// a backing_requests row. Delivered = has request metadata + an audio file.
export type DeliveredTrack = {
  requestId: string;
  song: string;
  show: string;
  client: string;
  key: string | null;
  createdAt: string;
  url: string;
  noSocials: boolean;
};

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i;
const isAudioFile = (name: string, metadata: unknown) => {
  const mime = (metadata as { mimetype?: string } | null)?.mimetype;
  if (mime && mime.startsWith('audio/')) return true;
  return AUDIO_EXT.test(name);
};

async function loadDeliveredTracks(): Promise<DeliveredTrack[]> {
  const selectWithFlag =
    'id, song_title, musical_or_artist, name, song_key, different_key, key_for_track, no_socials, created_at';
  const selectWithoutFlag =
    'id, song_title, musical_or_artist, name, song_key, different_key, key_for_track, created_at';
  // no_socials arrives with migration 0039; fall back so the board still loads
  // (tracks just show as allowed) if it hasn't been applied yet.
  let { data: reqData, error: reqError } = await supabase
    .from('backing_requests')
    .select(selectWithFlag)
    .order('created_at', { ascending: false })
    .limit(400);
  if (reqError) {
    ({ data: reqData, error: reqError } = await supabase
      .from('backing_requests')
      .select(selectWithoutFlag)
      .order('created_at', { ascending: false })
      .limit(400));
  }
  if (reqError) throw reqError;

  const requests = new Map<string, Omit<DeliveredTrack, 'requestId' | 'url'>>(
    (reqData || []).map((row) => {
      const r = row as Record<string, unknown>;
      const different = String(r.different_key ?? '') === 'Yes';
      return [
        String(r.id ?? ''),
        {
          song: String(r.song_title ?? '').trim(),
          show: String(r.musical_or_artist ?? '').trim(),
          client: String(r.name ?? '').trim(),
          key: (different
            ? String(r.key_for_track ?? '').trim() || String(r.song_key ?? '').trim()
            : String(r.song_key ?? '').trim()) || null,
          createdAt: String(r.created_at ?? ''),
          noSocials: Boolean(r.no_socials),
        },
      ] as const;
    })
  );

  const files: { path: string; folder: string | null }[] = [];
  const MAX_FILES = 400;
  const MAX_DEPTH = 3; // tracks bucket nests at most tracks/<request-id>/<file>
  const visit = async (prefix: string, folder: string | null, depth: number) => {
    if (files.length >= MAX_FILES || depth > MAX_DEPTH) return;
    const { data, error } = await supabase.storage.from('tracks').list(prefix, { limit: 400 });
    if (error) throw error;
    for (const item of data || []) {
      if (files.length >= MAX_FILES) return;
      if (item.id === null) {
        await visit(`${prefix}${item.name}/`, folder ?? item.name, depth + 1);
        continue;
      }
      if (!isAudioFile(item.name, item.metadata)) continue;
      files.push({ path: `${prefix}${item.name}`, folder });
    }
  };
  await visit('tracks/', null, 1);

  const tracks: DeliveredTrack[] = [];
  const seen = new Set<string>();
  files.forEach((f) => {
    const meta = f.folder ? requests.get(f.folder) : undefined;
    if (!meta || !meta.song) return;
    // One row per request: folders can hold several audio files (takes,
    // exports); the master take is the first one listed.
    if (seen.has(f.folder!)) return;
    seen.add(f.folder!);
    const { data } = supabase.storage.from('tracks').getPublicUrl(f.path);
    if (!data?.publicUrl) return;
    tracks.push({ requestId: f.folder!, ...meta, url: data.publicUrl });
  });
  tracks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return tracks;
}

// Delivered tracks shared by the release board and the vetting flow, cached on
// one react-query key so the two panels never double-list the bucket.
export function useDeliveredTracks() {
  return useQuery({
    queryKey: ['delivered_tracks'],
    queryFn: loadDeliveredTracks,
    staleTime: 60_000,
    retry: 1,
  });
}

// Active shop products, mirrored by the release board's shop-gap column.
export type ShopProductRow = { id: string; title: string; artist_name: string; product_type: string | null };
export function useActiveShopProducts() {
  return useQuery({
    queryKey: ['active_shop_products'],
    queryFn: async (): Promise<ShopProductRow[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, artist_name, product_type')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as ShopProductRow[];
    },
    staleTime: 60_000,
  });
}