import { supabase } from '@/integrations/supabase/client';
import type { PublicationWithAsset } from '@/types/publishing';

// Saving the exact bytes that get posted, so the audio can be checked in a real
// player instead of trusting the in-app preview (which is a re-render).

export function assetExt(mime: string | null | undefined): string {
  if (/quicktime/.test(mime ?? '')) return 'mov';
  if (/webm/.test(mime ?? '')) return 'webm';
  return 'mp4';
}

export function assetFilename(
  label: string,
  mime: string | null | undefined,
  suffix = 'teaser'
): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'track';
  return `${slug}-${suffix}.${assetExt(mime)}`;
}

// Returns a signed, forcing-download URL for the row's recorded file.
export async function signedAssetDownloadUrl(
  pub: PublicationWithAsset,
  label: string,
  suffix = 'teaser'
): Promise<string> {
  const path = pub.content_assets?.storage_path;
  if (!path) throw new Error('This row has no recorded file to download.');
  const filename = assetFilename(label, pub.content_assets?.mime_type, suffix);
  const { data, error } = await supabase.storage
    .from('content')
    .createSignedUrl(path, 3600, { download: filename });
  if (error || !data?.signedUrl) throw error ?? new Error('Could not sign the file.');
  return data.signedUrl;
}
