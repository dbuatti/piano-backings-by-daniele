"use client";

// src/utils/pricing.ts

/**
 * New Pricing Model:
 * - Note Bash: $15.00 (Functional recording)
 * - Audition Ready: $30.00 (Performance quality, 16/32 bar cut)
 * - Full Song: $50.00 (Concert-level performance, complete piece)
 */
export const TIER_PRICES: Record<string, number> = {
  'note-bash': 15.00,
  'audition-ready': 30.00,
  'full-song': 50.00,
};

export const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 15.00, // Updated from $10
  'complex-songs': 10.00, // Updated from $7
  'additional-edits': 5.00,
  'exclusive-ownership': 40.00,
};

export const calculateRequestCost = (request: any) => {
  let totalCost = 0;
  const baseCosts: { type: string; cost: number }[] = [];
  const serviceCosts: { service: string; cost: number }[] = [];
  
  // The new model uses a single tier selection
  // We'll map the 'track_type' field to these tiers
  const tier = request.track_type || 'audition-ready'; 
  
  const baseCost = TIER_PRICES[tier] || TIER_PRICES['audition-ready'];
  baseCosts.push({ 
    type: `${tier.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Tier`, 
    cost: baseCost 
  });
  totalCost += baseCost;

  // Add additional service costs
  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((service: string) => {
      const cost = ADDITIONAL_SERVICE_COSTS[service] || 0;
      if (cost > 0) {
        serviceCosts.push({ 
          service: service.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
          cost 
        });
        totalCost += cost;
      }
    });
  }
  
  // The final total is already in multiples of 5 based on the new pricing, 
  // but we'll keep the rounding logic for safety.
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  
  return {
    totalCost: parseFloat(roundedTotalCost.toFixed(2)),
    baseCosts,
    serviceCosts,
  };
};