// --- Pricing Logic ---
const TRACK_TYPE_BASE_COSTS: Record<string, number> = {
  'quick': 5.00,
  'one-take': 15.00,
  'polished': 25.00,
};

const BACKING_TYPE_MODIFIERS: Record<string, number> = {
  'note-bash': 5.00,
  'audition-cut': 10.00,
  'full-song': 15.00,
};

const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 10,
  'complex-songs': 7,
  'additional-edits': 5,
  'exclusive-ownership': 40,
};

export function calculateRequestCost(request: any): number {
  let totalCost = 0;
  
  const trackType = request.trackType || 'polished'; 
  const baseCost = TRACK_TYPE_BASE_COSTS[trackType] || TRACK_TYPE_BASE_COSTS['polished'];
  totalCost += baseCost;

  const backingTypes = Array.isArray(request.backingType) ? request.backingType : (request.backingType ? [request.backingType] : []);
  
  let maxModifier = 0;

  if (backingTypes.length > 0) {
    backingTypes.forEach((type: string) => {
      const modifier = BACKING_TYPE_MODIFIERS[type] || 0;
      if (modifier > maxModifier) {
        maxModifier = modifier;
      }
    });
    totalCost += maxModifier;
  }

  if (request.additionalServices && Array.isArray(request.additionalServices)) {
    request.additionalServices.forEach((service: string) => {
      const cost = ADDITIONAL_SERVICE_COSTS[service] || 0;
      totalCost += cost;
    });
  }
  
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  
  return parseFloat(roundedTotalCost.toFixed(2));
}

// --- Sanitization and Validation Helpers ---
export function sanitizeString(input: string | null | undefined, maxLength: number = 500): string | null {
  if (input === null || input === undefined) return null;
  
  let sanitized = input.trim();
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.length > 0 ? sanitized : null;
}

export function validateEmail(email: string | null | undefined): string {
  const sanitizedEmail = sanitizeString(email, 255);
  if (!sanitizedEmail) throw new Error('Email is required.');
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    throw new Error('Invalid email format.');
  }
  return sanitizedEmail;
}

export function validateUrl(url: string | null | undefined): string | null {
  const sanitizedUrl = sanitizeString(url, 2048);
  if (!sanitizedUrl) return null;
  
  try {
    new URL(sanitizedUrl);
    return sanitizedUrl;
  } catch {
    return null;
  }
}

export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function getFileExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDotIndex = pathname.lastIndexOf('.');
    return lastDotIndex !== -1 ? pathname.substring(lastDotIndex + 1) : 'audio';
  } catch (error) {
    return 'audio';
  }
}

export function createOrderSummary(formData: any): string {
  const summary = `
PIANO BACKING TRACK REQUEST SUMMARY
==================================

ORDER DETAILS
-------------
Date: ${new Date().toLocaleString()}
Request ID: ${Date.now()}

CLIENT INFORMATION
------------------
Name: ${formData.name || 'Not provided'}
Email: ${formData.email || 'Not provided'}
Phone: ${formData.phone || 'Not provided'}

TRACK INFORMATION
-----------------
Song Title: ${formData.songTitle}
Musical/Artist: ${formData.musicalOrArtist}
Song Key: ${formData.songKey || 'Not specified'}
Different Key Required: ${formData.differentKey || 'No'}
${formData.differentKey === 'Yes' ? `Requested Key: ${formData.keyForTrack || 'Not specified'}` : ''}

REFERENCES
----------
YouTube Link: ${formData.youtubeLink || 'Not provided'}
Voice Memo Link: ${formData.voiceMemo || 'Not provided'}
Additional Links: ${formData.additionalLinks || 'Not provided'}

ORDER DETAILS
-------------
Track Purpose: ${formData.trackPurpose?.replace('-', ' ') || 'Not specified'}
Backing Type(s): ${Array.isArray(formData.backingType) ? formData.backingType.map((type: string) => type.replace('-', ' ')).join(', ') : (formData.backingType?.replace('-', ' ') || 'Not specified')}
Delivery Date: ${formData.deliveryDate || 'Not specified'}
Category: ${formData.category || 'Not specified'}
Track Type: ${formData.trackType || 'Not specified'}

ADDITIONAL SERVICES
------------------
${formData.additionalServices && formData.additionalServices.length > 0 
  ? formData.additionalServices.map((service: string) => `- ${service.replace('-', ' ')}`).join('\n') 
  : 'None requested'}

SPECIAL REQUESTS
----------------
${formData.specialRequests || 'None provided'}

SHEET MUSIC
------------
${formData.sheetMusicUrl ? 'Sheet music has been uploaded and will be included in this folder.' : 'No sheet music provided.'}

VOICE MEMO
----------
${formData.voiceMemoFileUrl ? 'Voice memo has been uploaded and will be included in this folder.' : 'No voice memo file provided.'}

---
This summary was automatically generated for Piano Backings by Daniele.
  `.trim();
  
  return summary;
}