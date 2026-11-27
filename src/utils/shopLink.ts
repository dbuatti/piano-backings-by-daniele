// Client-side mirror of the edge function's shop lookup (`_shared/shop.ts`) so
// the release board can show whether a track has a shop product page. Slug rules
// must stay in sync with shared/song-catalog.mjs.
export const SITE = 'https://pianobackings.danielebuatti.com';

export type ShopProduct = {
  id?: string;
  title: string;
  artist_name: string;
  product_type: string | null;
  is_active?: boolean;
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

// Titles on the release board (taken from the delivered request) don't always
// match the shop listing verbatim. Common, safe equivalences — a lead article,
// a "- Reprise" suffix, or a plural/capitalisation slip in a show name — are
// normalised here so a real listing isn't reported as "Not in shop". Only
// equivalences that cannot collide with a different song are included.
const normTitle = (value: string | null | undefined) =>
  slugify(value)
    .replace(/^(the|a|an)-/, '')
    .replace(/-(reprise|reprise-2)$/, '');

// A bundle's title lists every song it contains; treat it as a match for any
// one of those songs so a bundled track isn't reported as missing from shop.
const bundleTitles = (value: string | null | undefined) =>
  String(value ?? '')
    .toLowerCase()
    .split(/[,/]|\band\b|\s+-\s+|\s*:\s*|\s{2,}/i)
    .flatMap((s) => {
      const clean = s.trim();
      return [normTitle(clean), normTitle(clean.replace(/^(come|go|get|be)\s+/, '')), normTitle(clean.replace(/^(come|go|get|be)$/, ''))];
    })
    .filter(Boolean);

const normShow = (value: string | null | undefined) =>
  slugify(value)
    .replace(/^(the|a|an)-/, '');

const showMatches = (productShow: string | null | undefined, show: string | null | undefined) => {
  const p = normShow(productShow);
  const s = normShow(show);
  if (!s || !p) return true;
  if (p === s) return true;
  // "Sister Act 2" / "Sister Act", "Matilda JR." / "Matilda Jr" — a trailing
  // ordinal or edition marker doesn't make it a different show.
  const strip = (v: string) => v.replace(/-\d+$/, '').replace(/-(jr|sr|jnr|snr)$/, '');
  return strip(p) === strip(s);
};

// The matching active shop product for a song (same title, same show), if any.
export function shopProductForTrack(
  products: ShopProduct[],
  track: { song?: string | null; show?: string | null }
): ShopProduct | null {
  const titleSlug = slugify(track.song);
  if (!titleSlug) return null;
  const showSlug = slugify(track.show);
  const titleKey = normTitle(track.song);
  const showKey = normShow(track.show);
  const candidates = (products ?? []).filter((p) => (p.product_type || 'track') === 'track');
  const looseTitle = (value: string | null | undefined) =>
  normTitle(value)
    .replace(/-loves?-/, '-')
    .replace(/-(the|me)$/, '');
  const titleMatches = (p: ShopProduct) =>
    normTitle(p.title) === titleKey ||
    bundleTitles(p.title).includes(titleKey) ||
    (looseTitle(p.title) === looseTitle(track.song) && !!p.title && !!track.song);
  // When the board's "show" is actually the song repeated (COME ALIVE from
  // COME ALIVE), the product group's real show can differ — that isn't a
  // reason to call the listing missing.
  const matches = (p: ShopProduct) =>
    titleMatches(p) &&
    (showMatches(p.artist_name, track.show) ||
      normShow(track.show) === normTitle(track.song) ||
      bundleTitles(p.title).includes(titleKey));
  return (
    candidates.find((p) => slugify(p.title) === titleSlug && (!showSlug || !slugify(p.artist_name) || slugify(p.artist_name) === showSlug)) ??
    candidates.find(matches) ??
    null
  );
}

// The /shop/<slug> song page for a track (mirrors _shared/shop.ts).
export function shopSongUrl(products: ShopProduct[], track: { song?: string | null; show?: string | null }): string | null {
  const match = shopProductForTrack(products, track);
  // Only live listings have a public page — a draft isn't reachable yet (parity
  // with _shared/shop.ts, which filters is_active=eq.true).
  if (!match || match.is_active === false) return null;
  const productShowSlug = slugify(match.artist_name);
  const songSlug = slugify(track.song);
  const slug =
    !productShowSlug || productShowSlug === songSlug ? songSlug : `${songSlug}-${productShowSlug}`;
  return `${SITE}/shop/${slug}`;
}