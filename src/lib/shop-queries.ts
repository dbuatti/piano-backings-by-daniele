// Shop data queries, shared by the shop page and the build-time prerender
// (src/entry-server.tsx), so the static HTML is rendered from the same data and
// react-query cache keys the browser then picks up.
import { supabase } from '@/integrations/supabase/client';

export interface ShopProduct {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  preview_url?: string | null;
  is_active: boolean;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string | null;
  key_signature: string | null;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
  duration_seconds?: number | null;
  product_type?: string | null;
  cut_description?: string | null;
  official_score_url?: string | null;
}

export interface ShopQuery {
  search: string;
  category: string;
  trackType: string;
  sort: string;
}

/** What /shop shows with no filters in the URL. */
export const DEFAULT_SHOP_QUERY: ShopQuery = { search: '', category: 'all', trackType: 'all', sort: 'title_asc' };

export const SHOP_STALE_TIME = 2 * 60 * 1000;

export const shopProductsQueryKey = (q: ShopQuery) => ['shopProducts', q.search, q.category, q.trackType, q.sort] as const;
export const shopProductQueryKey = (id: string) => ['shopProduct', id] as const;

// PostgREST `or=(...)` filters treat commas, parentheses and quotes as syntax, so
// strip them (and LIKE wildcards) from free-text search before interpolating.
const sanitizeSearch = (term: string) => term.replace(/[,()"'\\%*]/g, ' ').replace(/\s+/g, ' ').trim();

const SORTABLE_COLUMNS: Record<string, string> = {
  title: 'title',
  artist_name: 'artist_name',
  key_signature: 'key_signature',
  track_type: 'track_type',
  duration_seconds: 'duration_seconds',
  price: 'price',
  created_at: 'created_at',
};

export const fetchShopProducts = async (q: ShopQuery): Promise<ShopProduct[]> => {
  let query = supabase.from('products').select('*').eq('is_active', true);

  const search = sanitizeSearch(q.search);
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,artist_name.ilike.%${search}%`);
  }
  if (q.category !== 'all') query = query.eq('category', q.category);
  if (q.trackType !== 'all') query = query.eq('track_type', q.trackType);

  const sortMatch = q.sort.match(/^(\w+)_(asc|desc)$/);
  const sortColumn = sortMatch ? SORTABLE_COLUMNS[sortMatch[1]] : undefined;
  if (sortColumn) {
    query = query.order(sortColumn, { ascending: sortMatch![2] === 'asc' });
  } else {
    query = query.order('title', { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ShopProduct[];
};

export const fetchShopProduct = async (id: string): Promise<ShopProduct | null> => {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as ShopProduct) || null;
};
