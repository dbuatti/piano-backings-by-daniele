"use client";

// src/utils/pricing.ts

/**
 * New Pricing Model:
 * - Note Bash: $15.00 (Simple one-pass, melody-focused)
 * - Audition Ready: $30.00 (Detailed comprehensive cut, performance quality)
 * - Full Song: $50.00 (Concert-level comprehensive performance, complete piece)
 */
export const TIER_PRICES: Record<string, number> = {
  'note-bash': 15.00,
  'audition-ready': 30.00,
  'full-song': 50.00,
};

export const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 15.00,
  'complex-songs': 10.00,
  'additional-edits': 5.00,
  'exclusive-ownership': 40.00,
  'sheet-music': 50.00,
  'asap': 0,
};

// Engraved sheet music added to a shop track purchase.
// Keep in sync with supabase/functions/_shared/pricing.ts.
export const SHOP_SHEET_MUSIC_PRICE = 50.00;

export const SERVICE_LABELS: Record<string, string> = {
  'rush-order': 'Rush Order (24h)',
  'complex-songs': 'Complex Score',
  'additional-edits': 'Additional Edits',
  'exclusive-ownership': 'Exclusive Ownership',
  'sheet-music': 'Custom Sheet Music',
  'asap': 'ASAP',
};

export const calculateRequestCost = (request: { track_type?: string | null; additional_services?: string[] | null }) => {
  let totalCost = 0;
  const baseCosts: { type: string; cost: number }[] = [];
  const serviceCosts: { service: string; cost: number }[] = [];
  
  const tier = request.track_type || 'audition-ready'; 
  
  const baseCost = TIER_PRICES[tier] || TIER_PRICES['audition-ready'];
  
  let tierLabel = "Audition Ready Cut";
  if (tier === 'note-bash') tierLabel = "Note Bash (One-Pass)";
  if (tier === 'full-song') tierLabel = "Full Song (Comprehensive)";

  baseCosts.push({ 
    type: tierLabel, 
    cost: baseCost 
  });
  totalCost += baseCost;

  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((service: string) => {
      const cost = ADDITIONAL_SERVICE_COSTS[service] || 0;
      if (cost > 0) {
        serviceCosts.push({ 
          service: SERVICE_LABELS[service] || service.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          cost 
        });
        totalCost += cost;
      }
    });
  }
  
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  
  return {
    totalCost: parseFloat(roundedTotalCost.toFixed(2)),
    baseCosts,
    serviceCosts,
  };
};