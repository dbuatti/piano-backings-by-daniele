import { BackingRequest } from './emailGenerator'; // Assuming BackingRequest interface is exported from emailGenerator.ts

/**
 * Generates a product description for a shop item based on a BackingRequest.
 * It provides specific phrasing for 'One Take Recording' tracks to clarify their nature.
 *
 * @param request The BackingRequest object from which to derive the description.
 * @returns A formatted string suitable for a product description.
 */
export function generateProductDescriptionFromRequest(request: BackingRequest): string {
  const clientName = request.name.split(' ')[0]; // Get first name for "originally created for"
  
  let trackQualityDescription = '';
  if (request.track_type === 'One Take Recording') {
    trackQualityDescription = 'This is a sight-read first recording through a DAW. While not a polished studio production, it offers good quality and an authentic performance feel.';
  } else {
    // Default description for other track types
    trackQualityDescription = 'This is a high-quality piano backing track recorded through a DAW.';
  }

  const purposeDescription = request.track_purpose 
    ? `It's perfect for ${request.track_purpose.toLowerCase().replace(/-/g, ', ')}.`
    : `It's perfect for auditions, practice, or performance.`;

  const specialRequestsNotes = request.special_requests
    ? `Special notes from the original request: "${request.special_requests}"`
    : '';

  // Combine all parts, clean up extra spaces, and trim
  return `
    ${trackQualityDescription} This piano backing track for "${request.song_title}" from ${request.musical_or_artist} was originally created for ${clientName}.
    ${purposeDescription}
    ${specialRequestsNotes}
  `.replace(/\s+/g, ' ').trim();
}