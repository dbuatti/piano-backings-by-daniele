"use client";

/**
 * Centralized list of administrator emails.
 */
export const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

/**
 * Standard interface for track information used throughout the application.
 */
export interface TrackInfo {
  url: string | null;
  caption: string;
  selected?: boolean;
  file?: File | null;
}

/**
 * Formats a duration in seconds as "m:ss" (e.g. 128 -> "2:08").
 */
export const formatDuration = (seconds?: number | null): string | null => {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

/**
 * Formats a duration in seconds as an ISO 8601 duration (schema.org style), e.g. 128 -> "PT2M8S".
 */
export const formatDurationIso = (seconds?: number | null): string | null => {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `PT${minutes}M${secs}S`;
};

/**
 * Safely parses backing types from various formats (string, array, JSON string).
 */
export const getSafeBackingTypes = (backingType: string | string[] | undefined | null): string[] => {
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

/**
 * Triggers a browser download for a given URL.
 */
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