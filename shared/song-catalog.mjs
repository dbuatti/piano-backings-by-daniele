// The shop as a catalogue of songs: products with the same title and show are one
// song (its variants differ by key, voice or track type), each with a page at
// /shop/<slug>. Shared by the shop pages, scripts/prerender-seo.mjs,
// api/shop-product.ts and api/sitemap.xml.ts. Plain JS (.mjs) so Vite, Node scripts
// and Vercel functions all import it without a build step.

export const BRAND = 'Piano Backings by Daniele';

/** Custom recordings of any song, ordered through /form-page. Prices in AUD. */
export const CUSTOM_TIERS = [
  { id: 'note-bash', name: 'Note Bash', price: 15, blurb: 'A clean one-pass recording to learn the notes.' },
  { id: 'audition-ready', name: 'Audition Ready', price: 30, blurb: 'A detailed, expressive recording of your cut.' },
  { id: 'full-song', name: 'Full Song', price: 50, blurb: 'A complete, performance-ready recording.' },
];

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

export const slugify = (value) =>
  clean(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Major/minor key signatures, for normalising free-text keys.
const NOTE = /^\s*([A-Ga-g])\s*(♭|♯|b|#|flat|sharp)?\s*(major|minor|maj|min|m(?![a-z]))?/i;

/**
 * One key format everywhere: "B♭ major", "F♯ minor". Unrecognised text (e.g.
 * "Various") is returned tidied but unchanged; blank stays blank.
 */
export const formatKey = (raw) => {
  const text = clean(raw);
  if (!text) return '';
  const m = text.match(NOTE);
  if (!m) return text;
  const accidental = { '♭': '♭', b: '♭', flat: '♭', '♯': '♯', '#': '♯', sharp: '♯' }[(m[2] || '').toLowerCase()] || '';
  const mode = /^min|^m$/i.test(m[3] || '') ? 'minor' : 'major';
  return `${m[1].toUpperCase()}${accidental} ${mode}`;
};

export const formatDuration = (seconds) => {
  const s = Math.round(Number(seconds) || 0);
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const CATEGORY_LABELS = {
  'audition-cut': 'Audition cut',
  'full-song': 'Full song',
  'note-bash': 'Note bash',
};

const VOICE_ORDER = ['soprano', 'mezzo-soprano', 'alto', 'tenor', 'baritone', 'bass'];
const byVoice = (a, b) => {
  const rank = (v) => (VOICE_ORDER.indexOf(v.toLowerCase()) + 1) || 99;
  return rank(a) - rank(b) || a.localeCompare(b);
};

// Small stable hash, so ties between equally related songs spread across the
// catalogue instead of always picking the alphabetically first ones.
const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

const isSong = (p) => p && p.is_active !== false && (p.product_type || 'track') === 'track';

/** "Song – Show", or just the song when the show has the same name. */
export const songLabel = (song) =>
  song.show && slugify(song.show) !== slugify(song.title) ? `${song.title} – ${song.show}` : song.title;

/**
 * Group products into songs. Returns songs sorted by title, each with a unique slug.
 * @param {import('./song-catalog.d.mts').CatalogProduct[]} products
 */
export const buildSongCatalog = (products) => {
  const groups = new Map();
  for (const product of (products || []).filter(isSong)) {
    const title = clean(product.title);
    const show = clean(product.artist_name);
    const id = `${slugify(title)}|${slugify(show)}`;
    if (!groups.has(id)) groups.set(id, { title, show, variants: [] });
    groups.get(id).variants.push(product);
  }

  const songs = [...groups.values()]
    .map(({ title, show, variants }) => {
      variants.sort((a, b) => Number(a.price) - Number(b.price) || String(a.id).localeCompare(String(b.id)));
      const uniq = (list) => [...new Set(list.filter(Boolean))];
      const titleSlug = slugify(title);
      const showSlug = slugify(show);
      return {
        slug: !showSlug || showSlug === titleSlug ? titleSlug : `${titleSlug}-${showSlug}`,
        titleSlug,
        title,
        show,
        variants,
        keys: uniq(variants.map((v) => (v.show_key_signature === false ? '' : formatKey(v.key_signature)))),
        voices: uniq(variants.flatMap((v) => (v.vocal_ranges || []).map(clean))).sort(byVoice),
        categories: uniq(variants.map((v) => v.category)),
        durations: uniq(variants.map((v) => formatDuration(v.duration_seconds))),
        previewUrl: variants.find((v) => v.preview_url)?.preview_url || null,
        minPrice: Math.min(...variants.map((v) => Number(v.price) || 0)),
        currency: clean(variants[0].currency || 'AUD').toUpperCase(),
        imageUrl: variants.find((v) => v.image_url)?.image_url || null,
        updatedAt: variants.map((v) => v.updated_at || v.created_at || '').sort().at(-1) || null,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title) || a.show.localeCompare(b.show));

  // Two different songs can't share a URL.
  const seen = new Map();
  for (const song of songs) {
    const n = (seen.get(song.slug) || 0) + 1;
    seen.set(song.slug, n);
    if (n > 1) song.slug = `${song.slug}-${n}`;
  }
  return songs;
};

export const songPath = (song) => `/shop/${song.slug}`;

/** Slug of the song a product belongs to, for linking a product to its page. */
export const songSlugForProduct = (catalog, productId) =>
  catalog.find((s) => s.variants.some((v) => v.id === productId))?.slug || null;

/**
 * Look up a slug. `{ song }` for an exact match; `{ redirect }` when the slug names a
 * song whose show has since been renamed (same song title, one match); else null.
 */
export const findSong = (catalog, slug) => {
  const wanted = slugify(slug);
  const song = catalog.find((s) => s.slug === wanted);
  if (song) return { song };
  const candidates = catalog.filter((s) => wanted === s.titleSlug || wanted.startsWith(`${s.titleSlug}-`));
  return candidates.length === 1 ? { redirect: candidates[0].slug } : null;
};

/** Up to `count` songs: the same show first, then shared voice types, then the same kind of track. */
export const relatedSongs = (catalog, song, count = 3) => {
  const score = (other) =>
    (song.show && slugify(other.show) === slugify(song.show) ? 100 : 0) +
    other.voices.filter((v) => song.voices.includes(v)).length * 10 +
    (other.categories.some((c) => song.categories.includes(c)) ? 5 : 0);
  return catalog
    .filter((other) => other.slug !== song.slug)
    .map((other) => ({ other, s: score(other), tie: hash(`${song.slug}>${other.slug}`) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || a.tie - b.tie)
    .slice(0, count)
    .map(({ other }) => other);
};

/** Fallback intro for songs without a written one in src/lib/song-intros.json. */
export const defaultIntro = (song) => {
  const kind = song.categories.includes('full-song')
    ? 'a full-length accompaniment for performances, concerts and complete-song auditions'
    : song.categories.includes('audition-cut')
      ? 'an audition cut, ready for a 16 or 32 bar slot or a self-tape'
      : 'a note bash that plays the melody clearly so you can learn the notes';
  const from = song.show ? ` from ${song.show}` : '';
  const key = song.keys.length ? ` in ${song.keys.join(' and ')}` : '';
  const voice = song.voices.length ? ` It suits ${song.voices.join(', ').toLowerCase()} voices.` : '';
  return `This piano backing track of "${song.title}"${from} is ${kind}. It's recorded on a real piano by Melbourne music director Daniele Buatti${key}, so you hear the phrasing and space a pianist gives you in the room.${voice} Preview the clip, then download it straight after checkout. Need it in another key or cut differently? Order a custom recording in your key.`;
};

/**
 * Title, description, canonical URL and structured data for a song page.
 * @param {ReturnType<typeof buildSongCatalog>[number]} song
 */
export const songSeo = (song, siteUrl, intro) => {
  const url = `${siteUrl}${songPath(song)}`;
  const heading = `${songLabel(song)} piano backing track`;
  const title = `${heading} | ${BRAND}`;
  const summary = [
    `Piano backing track of "${song.title}"${song.show ? ` (${song.show})` : ''}`,
    song.keys.length ? ` in ${song.keys.join(' / ')}` : '',
    song.voices.length ? ` for ${song.voices.join('/')}` : '',
    `. Instant download from $${song.minPrice.toFixed(2)} ${song.currency}, or a custom recording in your key from $${CUSTOM_TIERS[0].price} AUD.`,
  ].join('');

  const offers = [
    ...song.variants.map((v) => ({
      '@type': 'Offer',
      name: [CATEGORY_LABELS[v.category] || 'Backing track', formatKey(v.key_signature), (v.vocal_ranges || []).join('/')]
        .filter(Boolean)
        .join(' – ') + ' (instant download)',
      url,
      sku: v.id,
      price: Number(v.price || 0).toFixed(2),
      priceCurrency: clean(v.currency || 'AUD').toUpperCase(),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: BRAND },
    })),
    ...CUSTOM_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: `${tier.name} custom recording in your key`,
      url: `${siteUrl}/form-page?tier=${tier.id}`,
      price: tier.price.toFixed(2),
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: BRAND },
    })),
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: heading.replace(/^./, (c) => c.toUpperCase()),
      description: intro || summary,
      url,
      sku: song.slug,
      image: song.imageUrl || `${siteUrl}/og-image.png`,
      category: 'Piano backing track',
      brand: { '@type': 'Brand', name: BRAND },
      offers,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Backing track library', item: `${siteUrl}/shop` },
        { '@type': 'ListItem', position: 3, name: songLabel(song), item: url },
      ],
    },
  ];

  return { heading, title, description: summary, url, jsonLd };
};

/**
 * The song's written intro (src/lib/song-intros.json, keyed by slug), falling back to
 * the entry for the same song title if its show has since been renamed, then to
 * `defaultIntro`.
 * @param {Record<string, string>} intros
 */
export const introFor = (song, intros) => {
  if (intros[song.slug]) return intros[song.slug];
  const byTitle = Object.keys(intros).filter((k) => k === song.titleSlug || k.startsWith(`${song.titleSlug}-`));
  return byTitle.length === 1 ? intros[byTitle[0]] : defaultIntro(song);
};
