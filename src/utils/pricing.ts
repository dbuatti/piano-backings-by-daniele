// src/utils/pricing.ts

export const calculateRequestCost = (request: any) => {
  let totalCost = 0;
  const baseCosts: { type: string; cost: number }[] = [];
  const serviceCosts: { service: string; cost: number }[] = [];
  let trackTypeBaseCost = 0; // For cases where backing_type is not explicitly set

  // Determine base cost based on backing_type or track_type
  const backingTypes = Array.isArray(request.backing_type) ? request.backing_type : (request.backing_type ? [request.backing_type] : []);
  const trackType = request.track_type;

  if (backingTypes.length > 0) {
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
      baseCosts.push({ type, cost });
      totalCost += cost;
    });
  } else if (trackType) {
    // If backing_type is not explicitly set, try to infer from track_type
    switch (trackType) {
      case 'quick': 
        trackTypeBaseCost = 7.5; // Average of 5-10
        break;
      case 'one-take': 
        trackTypeBaseCost = 15; // Average of 10-20
        break;
      case 'polished': 
        trackTypeBaseCost = 25; // Average of 15-35
        break;
      default: 
        trackTypeBaseCost = 20; // Default if track_type is unknown
    }
    baseCosts.push({ type: trackType, cost: trackTypeBaseCost });
    totalCost += trackTypeBaseCost;
  } else {
    // General fallback if neither is specified
    const defaultCost = 20;
    baseCosts.push({ type: 'default', cost: defaultCost });
    totalCost += defaultCost;
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