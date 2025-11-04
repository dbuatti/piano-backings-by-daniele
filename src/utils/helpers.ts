// src/utils/helpers.ts
export interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
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

export const downloadTrack = (url: string, filenameSuggestion: string | boolean | null | undefined = 'download') => {
  const link = document.createElement('a');
  link.href = url;
  
  // Use the caption as a filename suggestion, or fallback to a generic name
  const filename = typeof filenameSuggestion === 'string' && filenameSuggestion.trim() !== ''
    ? filenameSuggestion
    : 'download';

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};