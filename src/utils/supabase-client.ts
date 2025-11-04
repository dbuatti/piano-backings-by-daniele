import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a file to a specified Supabase storage bucket path.
 * @param file The file to upload.
 * @param path The path within the bucket where the file should be stored (e.g., 'tracks/request-id/').
 * @param bucketName The name of the Supabase storage bucket. Defaults to 'tracks'.
 * @returns An object containing the uploaded file's path or an error.
 */
export const uploadFileToSupabase = async (file: File, path: string, bucketName: string = 'tracks') => {
  const filePath = `${path}${file.name}`;
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Set to true if you want to overwrite existing files
    });

  if (error) {
    console.error(`Supabase upload error for ${file.name}:`, error);
    return { data: null, error };
  }

  // Supabase returns the full path including the bucket name in data.path
  // We might want to return just the path within the bucket or the full URL
  // For consistency with previous usage, returning data.path which is relative to the bucket.
  return { data: { path: data?.path }, error: null };
};