// src/utils/pricing.ts

export const calculateRequestCost = (request: any) => {
  let totalCost = 0;
  const baseCosts: { type: string; cost: number }[] = [];
  const serviceCosts: { service: string; cost: number }[] = [];
  
  const backingTypes = Array.isArray(request.backing_type) ? request.backing_type : (request.backing_type ? [request.backing_type] : []);
  const trackType = request.track_type;

  let baseCost = 0;
  let baseType = '';

  // 1. Determine base cost based on Track Type (prioritize cheaper rough cuts)
  if (trackType === 'quick' || trackType === 'one-take') {
    switch (trackType) {
      case 'quick': 
        baseCost = 7.5; // Average of $5 - $10
        baseType = 'Quick Reference (Base)';
        break;
      case 'one-take': 
        baseCost = 15; // Average of $10 - $20
        baseType = 'One-Take Recording (Base)';
        break;
    }
  } else if (backingTypes.length > 0) {
    // 2. If not a rough cut, use Backing Type for base cost
    backingTypes.forEach((type: string) => {
      let cost = 0;
      switch (type) {
        case 'full-song':
          cost = 30;
          break;
        case 'audition-cut':
          cost = 15;
          break;
        case 'note-bash':
          cost = 10;
          break;
        default:
          cost = 20; // Default if backing_type is unknown
      }
      // If multiple backing types are selected, sum their costs
      baseCosts.push({ type, cost });
      totalCost += cost;
    });
    
    // If multiple backing types were processed, we skip the single baseCost logic below
    if (baseCosts.length > 0) {
      // Total cost already calculated above
    }
  } else if (trackType) {
    // 3. Fallback: If no backing type, use polished track type average
    switch (trackType) {
      case 'polished': 
        baseCost = 25; // Average of $15 - $35
        baseType = 'Polished Backing (Base)';
        break;
      default: 
        baseCost = 20; // General Default
        baseType = 'Default Base Cost';
    }
  } else {
    // 4. General fallback
    baseCost = 20;
    baseType = 'Default Base Cost';
  }

  // If a single base cost was determined (i.e., not multiple backing types)
  if (baseCost > 0 && baseCosts.length === 0) {
    baseCosts.push({ type: baseType, cost: baseCost });
    totalCost += baseCost;
  }
  
  // Add additional service costs
  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((service: string) => {
      let cost = 0;
      switch (service) {
        case 'rush-order':
          cost = 10;
          break;
        case 'complex-songs':
          cost = 7;
          break;
        case 'additional-edits':
          cost = 5;
          break;
        case 'exclusive-ownership':
          cost = 40;
          break;
      }
      serviceCosts.push({ service, cost });
      totalCost += cost;
    });
  }
  
  // Round the final total cost to the nearest multiple of 5
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  
  return {
    totalCost: parseFloat(roundedTotalCost.toFixed(2)),
    baseCosts,
    serviceCosts,
  };
};

/**
 * Returns the display range for a given track type.
 * @param trackType The type of track (e.g., 'quick', 'one-take', 'polished').
 * @returns A string representing the price range (e.g., "$5 - $10") or null if not applicable.
 */
export const getTrackTypeBaseDisplayRange = (trackType: string): string | null => {
  switch (trackType) {
    case 'quick':
      return "$5 - $10";
    case 'one-take':
      return "$10 - $20";
    case 'polished':
      return "$15 - $35";
    default:
      return null;
  }
};