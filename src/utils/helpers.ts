// src/utils/helpers.ts
export interface TrackInfo {
  url: string;
  caption: string | null | undefined; // Updated 'caption' to allow null/undefined
  selected?: boolean;
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
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};