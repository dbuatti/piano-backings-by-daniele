import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import intros from './song-intros.json';
import { buildSongCatalog, introFor, type Song } from '../../shared/song-catalog.mjs';
import {
  DEFAULT_SHOP_QUERY,
  SHOP_STALE_TIME,
  fetchShopProducts,
  shopProductsQueryKey,
  type ShopProduct,
} from './shop-queries';

export type ShopSong = Song<ShopProduct>;

/** Every song in the shop, from the same query (and cache) as the unfiltered /shop list. */
export const useSongCatalog = () => {
  const query = useQuery<ShopProduct[], Error>({
    queryKey: shopProductsQueryKey(DEFAULT_SHOP_QUERY),
    queryFn: () => fetchShopProducts(DEFAULT_SHOP_QUERY),
    staleTime: SHOP_STALE_TIME,
  });
  const catalog = useMemo(() => buildSongCatalog(query.data || []), [query.data]);
  return { catalog, isLoading: query.isLoading, error: query.error };
};

export const songIntro = (song: ShopSong) => introFor(song, intros as Record<string, string>);
