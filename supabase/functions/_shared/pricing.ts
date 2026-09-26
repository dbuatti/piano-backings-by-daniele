// Single source of truth for prices used by the edge functions.
// Keep in sync with src/utils/pricing.ts on the frontend.

export const TIER_PRICES: Record<string, number> = {
  'note-bash': 15.00,
  'audition-ready': 30.00,
  'full-song': 50.00,
};

export const SERVICE_COSTS: Record<string, number> = {
  'rush-order': 15.00,
  'complex-songs': 10.00,
  'additional-edits': 5.00,
  'exclusive-ownership': 40.00,
  'sheet-music': 50.00,
  'asap': 0,
};

export const SERVICE_LABELS: Record<string, string> = {
  'rush-order': 'Rush Order (24h)',
  'complex-songs': 'Complex Score',
  'additional-edits': 'Additional Edits',
  'exclusive-ownership': 'Exclusive Ownership',
  'sheet-music': 'Custom Sheet Music',
  'asap': 'ASAP',
};

// Engraved sheet music added to a shop track purchase.
export const SHOP_SHEET_MUSIC_PRICE = 50.00;

export const serviceLabel = (id: string) =>
  SERVICE_LABELS[id] || id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
