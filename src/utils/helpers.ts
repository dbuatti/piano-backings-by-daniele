// src/utils/helpers.ts
export interface TrackInfo {
  url: string | null; // Changed to allow null
  caption: string; // Changed to always be string
  selected?: boolean;
  file?: File | null; // Added optional file property for UI state
}

// Add other helper functions or interfaces as needed
export const getSafeBackingTypes = (backingType: string | string[] | undefined): string[] => {
  if (!backingType) {
    return [];
  }
  if (Array.isArray(backingType)) {
    return backingType;
  }
  try {
    const parsed = JSON.parse(backingType);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Not a JSON string, treat as single string
  }
  return [backingType];
};

export const downloadTrack = (url: string, filename: string) => {
  if (!url) return;
  
  let finalUrl = url;
  
  // Check if the URL is a Supabase public storage URL
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    // Append the 'download' query parameter to force a full download and suggest filename
    const urlObj = new URL(url);
    urlObj.searchParams.set('download', filename);
    finalUrl = urlObj.toString();
  }
  
  const link = document.createElement('a');
  link.href = finalUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};