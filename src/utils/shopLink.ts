// Client-side mirror of the edge function's shop lookup (`_shared/shop.ts`) so
// the release board can show whether a track has a shop product page. Slug rules
// must stay in sync with shared/song-catalog.mjs.
export const SITE = 'https://pianobackings.danielebuatti.com';

export type ShopProduct = {
  title: string;
  artist_name: string;
  product_type: string | null;
};

export const slugify = (value: string | null | undefined) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// The matching active shop product for a song (same title, same show), if any.
export function shopProductForTrack(
  products: ShopProduct[],
  track: { song?: string | null; show?: string | null }
): ShopProduct | null {
  const titleSlug = slugify(track.song);
  if (!titleSlug) return null;
  const showSlug = slugify(track.show);
  return (
    (products ?? []).find(
      (p) =>
        (p.product_type || 'track') === 'track' &&
        slugify(p.title) === titleSlug &&
        (!showSlug || !slugify(p.artist_name) || slugify(p.artist_name) === showSlug)
    ) ?? null
  );
}

// The /shop/<slug> song page for a track (mirrors _shared/shop.ts).
export function shopSongUrl(products: ShopProduct[], track: { song?: string | null; show?: string | null }): string | null {
  const match = shopProductForTrack(products, track);
  if (!match) return null;
  const productShowSlug = slugify(match.artist_name);
  const songSlug = slugify(track.song);
  const slug =
    !productShowSlug || productShowSlug === songSlug ? songSlug : `${songSlug}-${productShowSlug}`;
  return `${SITE}/shop/${slug}`;
}