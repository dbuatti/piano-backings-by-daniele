export interface CatalogProduct {
  id: string;
  title: string;
  artist_name?: string | null;
  price: number;
  currency?: string | null;
  key_signature?: string | null;
  show_key_signature?: boolean | null;
  category?: string | null;
  vocal_ranges?: string[] | null;
  duration_seconds?: number | null;
  preview_url?: string | null;
  image_url?: string | null;
  product_type?: string | null;
  is_active?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface CustomTier {
  id: string;
  name: string;
  price: number;
  blurb: string;
}

export interface Song<P extends CatalogProduct = CatalogProduct> {
  slug: string;
  titleSlug: string;
  title: string;
  show: string;
  variants: P[];
  keys: string[];
  voices: string[];
  categories: string[];
  durations: string[];
  previewUrl: string | null;
  minPrice: number;
  currency: string;
  imageUrl: string | null;
  updatedAt: string | null;
}

export declare const BRAND: string;
export declare const CUSTOM_TIERS: CustomTier[];
export declare const CATEGORY_LABELS: Record<string, string>;
export declare const slugify: (value: string | null | undefined) => string;
export declare const formatKey: (raw: string | null | undefined) => string;
export declare const formatDuration: (seconds: number | null | undefined) => string;
export declare const songLabel: (song: Pick<Song, 'title' | 'show'>) => string;
export declare function buildSongCatalog<P extends CatalogProduct>(products: P[] | null | undefined): Song<P>[];
export declare const songPath: (song: Pick<Song, 'slug'>) => string;
export declare const songSlugForProduct: (catalog: Song[], productId: string) => string | null;
export declare function findSong<P extends CatalogProduct>(
  catalog: Song<P>[],
  slug: string,
): { song: Song<P>; redirect?: undefined } | { redirect: string; song?: undefined } | null;
export declare function relatedSongs<P extends CatalogProduct>(catalog: Song<P>[], song: Song<P>, count?: number): Song<P>[];
export declare const defaultIntro: (song: Song) => string;
export declare const songSeo: (
  song: Song,
  siteUrl: string,
  intro?: string,
) => { heading: string; title: string; description: string; url: string; jsonLd: object[] };
export declare const introFor: (song: Song, intros: Record<string, string>) => string;
