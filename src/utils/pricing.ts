// src/utils/pricing.ts

export const TRACK_TYPE_BASE_COSTS: Record<string, number> = {
  'quick': 5.00,
  'one-take': 10.00, // Changed from 15.00 to 10.00
  'polished': 15.00, // Changed from 25.00 to 15.00
};

export const BACKING_TYPE_MODIFIERS: Record<string, number> = {
  'note-bash': 5.00,
  'audition-cut': 10.00,
  'full-song': 15.00,
};

export const ADDITIONAL_SERVICE_COSTS: Record<string, number> = {
  'rush-order': 10,
  'complex-songs': 7,
  'additional-edits': 5,
  'exclusive-ownership': 40,
};

export const calculateRequestCost = (request: any) => {
  let totalCost = 0;
  const baseCosts: { type: string; cost: number }[] = [];
  const serviceCosts: { service: string; cost: number }[] = [];
  
  // Default to 'polished' if track_type is missing, as it's the highest base cost
  const trackType = request.track_type || 'polished'; 
  
  // 1. Determine Base Cost (Effort/Quality)
  const baseCost = TRACK_TYPE_BASE_COSTS[trackType] || TRACK_TYPE_BASE_COSTS['polished'];
  baseCosts.push({ type: `${trackType.replace('-', ' ')} Base Cost`, cost: baseCost });
  totalCost += baseCost;

  // 2. Determine Modifier (Length/Size) - Use the maximum modifier if multiple backing types are selected
  const backingTypes = Array.isArray(request.backing_type) ? request.backing_type : (request.backing_type ? [request.backing_type] : []);
  
  let maxModifier = 0;
  let modifierType = 'No Length Modifier';

  if (backingTypes.length > 0) {
    backingTypes.forEach((type: string) => {
      const modifier = BACKING_TYPE_MODIFIERS[type] || 0;
      if (modifier > maxModifier) {
        maxModifier = modifier;
        modifierType = type;
      }
    });
    
    if (maxModifier > 0) {
      baseCosts.push({ type: `${modifierType.replace('-', ' ')} Modifier`, cost: maxModifier });
      totalCost += maxModifier;
    }
  }

  // 3. Add additional service costs
  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((service: string) => {
      const cost = ADDITIONAL_SERVICE_COSTS[service] || 0;
      if (cost > 0) {
        serviceCosts.push({ service, cost });
        totalCost += cost;
      }
    });
  }
  
  // 4. Round the final total cost to the nearest multiple of 5
  const roundedTotalCost = Math.round(totalCost / 5) * 5;
  
  return {
    totalCost: parseFloat(roundedTotalCost.toFixed(2)),
    baseCosts,
    serviceCosts,
  };
};

// Remove the obsolete function
export const getTrackTypeBaseDisplayRange = (trackType: string): string | null => {
  return null;
};