import type { TrackInfo } from '@/utils/helpers';

interface ProductFilesRow {
  track_urls?: TrackInfo[] | null;
  master_download_link?: string | null;
}

// Select string for admin/buyer product queries: paid files live in `product_files`
// (not readable by the public), joined back in here.
export const PRODUCT_WITH_FILES = '*, product_files(track_urls, master_download_link)';

/**
 * Flattens the joined `product_files` row back onto the product so existing code can
 * keep using `track_urls` / `master_download_link`. The join key is removed so the
 * object can be spread straight into an update payload.
 */
export const withPrivateFiles = <T extends { product_files?: ProductFilesRow | ProductFilesRow[] | null }>(
  row: T,
): Omit<T, 'product_files'> & { track_urls: TrackInfo[]; master_download_link: string | null } => {
  const { product_files, ...rest } = row;
  const files = Array.isArray(product_files) ? product_files[0] : product_files;
  return {
    ...rest,
    track_urls: files?.track_urls ?? [],
    master_download_link: files?.master_download_link ?? null,
  };
};
