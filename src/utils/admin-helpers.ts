"use client";

/**
 * Truncates a long URL for cleaner display in tables and lists.
 */
export const truncateUrl = (url: string | null | undefined, maxLength: number = 40): string => {
  if (!url) return 'N/A';
  if (url.length <= maxLength) return url;
  const start = url.substring(0, maxLength / 2 - 2);
  const end = url.substring(url.length - maxLength / 2 + 2);
  return `${start}...${end}`;
};

/**
 * Extracts a filename from a URL, handling query parameters and encoding.
 */
export const getFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const filenameWithQuery = parts[parts.length - 1];
    const filename = filenameWithQuery.split('?')[0];
    return decodeURIComponent(filename);
  } catch (e) {
    return 'Unnamed Track';
  }
};