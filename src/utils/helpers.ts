// Helper function to normalize backing_type to an array of strings
export const getSafeBackingTypes = (rawType: any): string[] => {
  let types: string[] = [];
  if (Array.isArray(rawType)) {
    types = rawType.filter((item: any) => typeof item === 'string');
  } else if (typeof rawType === 'string') {
    types = [rawType];
  }
  // Ensure no empty strings or null/undefined strings if they somehow got through
  return types.filter(type => type && type.trim() !== '');
};

// Interface for track information, used across components
export interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined;
}

// Reusable download function with robust type checking and filename sanitization
import { toast } from "sonner"; // Assuming sonner is used for toasts

export const downloadTrack = (rawUrl: string, rawFilenameSuggestion: string | boolean | null | undefined = 'download') => {
  console.log('DEBUG: downloadTrack - Raw URL:', rawUrl, 'Type:', typeof rawUrl);
  console.log('DEBUG: downloadTrack - Raw filenameSuggestion:', rawFilenameSuggestion, 'Type:', typeof rawFilenameSuggestion);

  // Ensure URL is a valid string
  const url = typeof rawUrl === 'string' && rawUrl.trim() !== '' ? rawUrl : null;
  if (!url) {
    toast.error("Track Not Available", { description: "Invalid track URL provided." });
    return;
  }

  let finalFilename: string;

  // Step 1: Determine the base filename
  let baseFilenameCandidate: string;
  if (typeof rawFilenameSuggestion === 'string' && rawFilenameSuggestion.trim() !== '') {
    baseFilenameCandidate = rawFilenameSuggestion;
  } else {
    baseFilenameCandidate = 'track_download'; // Fallback for boolean, null, undefined, empty string
  }

  // Step 2: Sanitize the filename
  finalFilename = baseFilenameCandidate.replace(/[^a-zA-Z0-9\.\-_]/gi, '_');
  console.log('DEBUG: downloadTrack - Sanitized filename:', finalFilename);

  // Step 3: Handle the specific "true" string case (after sanitization)
  if (finalFilename.toLowerCase() === 'true') {
    console.warn('DEBUG: downloadTrack - Filename is "true" after sanitization, using fallback.');
    finalFilename = 'track_download';
  }

  // Step 4: Add file extension if missing
  const urlExtensionMatch = url.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  const urlExtension = urlExtensionMatch ? urlExtensionMatch[1] : '';
  
  if (urlExtension && !finalFilename.toLowerCase().endsWith(`.${urlExtension.toLowerCase()}`)) {
    finalFilename = `${finalFilename}.${urlExtension}`;
  } else if (!urlExtension && !finalFilename.includes('.')) {
    // If no extension in URL and not in filename, default to .mp3
    finalFilename = `${finalFilename}.mp3`;
  }
  console.log('DEBUG: downloadTrack - Final filename with extension:', finalFilename);

  const link = document.createElement('a');
  // Append ?download=true to force download for Supabase Storage URLs
  const downloadUrl = url.includes('supabase.co/storage') && !url.includes('?download=')
    ? `${url}?download=true`
    : url;
  link.href = downloadUrl;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};