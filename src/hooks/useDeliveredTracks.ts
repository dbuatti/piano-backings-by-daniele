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
  // Which column `key` came from. A request where the client asked for a
  // different key reads `key_for_track`; writing to `song_key` for one of those
  // would silently leave the track keyless.
  keyField: 'song_key' | 'key_for_track';
  createdAt: string;
  url: string;
  noSocials: boolean;
  // Client bought exclusive ownership (+$40) → the track is theirs; don't nudge
  // it onto socials from the board.
  isExclusive: boolean;
};

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i;
const isAudioFile = (name: string, metadata: unknown) => {
  const mime = (metadata as { mimetype?: string } | null)?.mimetype;
  if (mime && mime.startsWith('audio/')) return true;
  return AUDIO_EXT.test(name);
};

async function loadDeliveredTracks(): Promise<DeliveredTrack[]> {
  const selectWithFlag =
    'id, song_title, musical_or_artist, name, song_key, different_key, key_for_track, no_socials, additional_services, created_at';
  const selectWithoutFlag =
    'id, song_title, musical_or_artist, name, song_key, different_key, key_for_track, additional_services, created_at';
  // no_socials arrives with migration 0039; fall back so the board still loads
  // (tracks just show as allowed) if it hasn't been applied yet.
  let reqData: Record<string, unknown>[] | null = null;
  let reqError: { message?: string } | null = null;
  ({ data: reqData, error: reqError } = await supabase
    .from('backing_requests')
    .select(selectWithFlag)
    .order('created_at', { ascending: false })
    .limit(400));
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
      const services = Array.isArray(r.additional_services) ? (r.additional_services as unknown[]) : [];
      const isExclusive = services.some(
        (s) => String(s).trim().toLowerCase().replace(/\s+/g, '-') === 'exclusive-ownership'
      );
      return [
        String(r.id ?? ''),
        {
          song: String(r.song_title ?? '').trim(),
          show: String(r.musical_or_artist ?? '').trim(),
          client: String(r.name ?? '').trim(),
          key: (different
            ? String(r.key_for_track ?? '').trim() || String(r.song_key ?? '').trim()
            : String(r.song_key ?? '').trim()) || null,
          keyField: different ? ('key_for_track' as const) : ('song_key' as const),
          createdAt: String(r.created_at ?? ''),
          noSocials: Boolean(r.no_socials),
          isExclusive,
        },
      ] as const;
    })
  );

  // The bucket nests at most tracks/<request-id>/<file>, with an optional extra
  // level of takes. Listing each folder one after another meant one round-trip
  // per track (39 tracks = 39 sequential calls); list them all at once instead.
  const MAX_FILES = 400;
  const root = await supabase.storage.from('tracks').list('tracks/', { limit: 400 });
  if (root.error) throw root.error;

  const files: { path: string; folder: string | null }[] = [];
  const folders: string[] = [];
  for (const item of root.data || []) {
    if (item.id === null) folders.push(item.name);
    else if (isAudioFile(item.name, item.metadata)) files.push({ path: `tracks/${item.name}`, folder: null });
  }

  const fromFolder = await Promise.all(
    folders.map(async (folder) => {
      const out: { path: string; folder: string | null }[] = [];
      const { data, error } = await supabase.storage
        .from('tracks')
        .list(`tracks/${folder}/`, { limit: 400 });
      if (error) return out;
      const nested: string[] = [];
      for (const item of data || []) {
        if (item.id === null) nested.push(item.name);
        else if (isAudioFile(item.name, item.metadata)) out.push({ path: `tracks/${folder}/${item.name}`, folder });
      }
      const deeper = await Promise.all(
        nested.map(async (sub) => {
          const { data: inner } = await supabase.storage
            .from('tracks')
            .list(`tracks/${folder}/${sub}/`, { limit: 400 });
          return (inner || [])
            .filter((item) => item.id !== null && isAudioFile(item.name, item.metadata))
            .map((item) => ({ path: `tracks/${folder}/${sub}/${item.name}`, folder }));
        })
      );
      return out.concat(deeper.flat());
    })
  );
  files.push(...fromFolder.flat());

  if (files.length > MAX_FILES) files.length = MAX_FILES;

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
    staleTime: 300_000,
    retry: 1,
  });
}

// Every shop product (active and draft), mirrored by the release board's
// shop column so a freshly-created draft listing shows as "draft" until the
// owner reviews and activates it.
export type ShopProductRow = {
  id: string;
  title: string;
  artist_name: string;
  product_type: string | null;
  is_active: boolean;
};
export function useShopProducts() {
  return useQuery({
    queryKey: ['shop_products'],
    queryFn: async (): Promise<ShopProductRow[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, artist_name, product_type, is_active');
      if (error) throw error;
      return (data || []) as ShopProductRow[];
    },
    staleTime: 60_000,
  });
}