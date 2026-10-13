// @ts-nocheck
// Shop lookups for the publishing functions. Mirrors the slug rules of
// shared/song-catalog.mjs (which lives outside supabase/functions and so can't
// be bundled with an edge function): a shop song page is /shop/<slug>, where
// slug = slugify(title)-slugify(show) of the product group.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type Admin = ReturnType<typeof createClient>;

export const SITE = 'https://pianobackings.danielebuatti.com';

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

export const slugify = (value: unknown) =>
  clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// The /shop/<slug> song page for a video's track, when that track is an active
// shop product (same song title, same show). Variants (other keys, cuts) share
// the page. Null when the video isn't in the shop — its description then simply
// omits the shop link and points at the custom-order form instead.
export async function shopSongUrlForTrack(
  supabaseAdmin: Admin,
  track: { song_title?: string | null; show?: string | null }
): Promise<string | null> {
  const titleSlug = slugify(track.song_title);
  if (!titleSlug) return null;
  const showSlug = slugify(track.show);

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('title, artist_name, is_active, product_type')
    .eq('is_active', true);

  const match = (products ?? []).find(
    (p) =>
      (p.product_type || 'track') === 'track' &&
      slugify(p.title) === titleSlug &&
      (!showSlug || !slugify(p.artist_name) || slugify(p.artist_name) === showSlug)
  );
  if (!match) return null;

  const productShowSlug = slugify(match.artist_name);
  const songSlug =
    !productShowSlug || productShowSlug === titleSlug ? titleSlug : `${titleSlug}-${productShowSlug}`;
  return `${SITE}/shop/${songSlug}`;
}

// Deterministic description used when a publication reaches upload without
// drafted metadata (approved in a hurry, or the draft failed) so a video never
// goes out with an empty description. Includes the song's shop page only when
// the track is actually a shop product.
// Keys are stored with their accidental count ("C Major (0)", "G Major (1♯)").
// That parenthetical is internal shorthand — strip it for anything public.
const keyForDisplay = (value: unknown) =>
  clean(value).replace(/\s*\(\d+[♯♭]?\)\s*$/, '').trim();

export function defaultYouTubeDescription(
  track: { title?: string | null; song_title?: string | null; show?: string | null; key?: string | null },
  productUrl: string | null
): string {
  const title = clean(track.title) || clean(track.song_title) || 'This piano backing track';
  const from = clean(track.show) ? ` from ${clean(track.show)}` : '';
  const displayKey = keyForDisplay(track.key);
  const key = displayKey ? ` Recorded in ${displayKey}.` : '';
  const lines = [
    `${title}${from} — a piano backing track by Piano Backings by Daniele.${key}`,
    'Custom piano backing tracks for auditions, performances and practice — arranged and recorded in the key you choose, delivered fast.',
  ];
  if (productUrl) lines.push(`Get this track (instant download): ${productUrl}`);
  lines.push(`Order yours: ${SITE}/form-page`);
  lines.push('Follow: https://www.youtube.com/@pianobackingsbydaniele and https://www.instagram.com/pianobackingsbydaniele/');
  return lines.join('\n\n');
}
