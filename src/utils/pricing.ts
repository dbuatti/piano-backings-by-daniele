// src/utils/pricing.ts

export const calculateRequestCost = (request: any) => {
  let baseCost = 0;
  
  // Determine base cost based on backing_type or track_type
  // Prioritize backing_type if available, otherwise infer from track_type
  const backingTypes = Array.isArray(request.backing_type) ? request.backing_type : (request.backing_type ? [request.backing_type] : []);
  const trackType = request.track_type;

  if (backingTypes.length > 0) {
    // If multiple backing types are selected, sum their base costs
    backingTypes.forEach((type: string) => {
      switch (type) {
        case 'full-song':
          baseCost += 30;
          break;
        case 'audition-cut':
          baseCost += 15;
          break;
        case 'note-bash':
          baseCost += 10;
          break;
        default:
          baseCost += 20; // Default if backing_type is unknown
      }
    });
  } else if (trackType) {
    // If backing_type is not explicitly set, try to infer from track_type
    switch (trackType) {
      case 'quick': 
        baseCost = 7.5; // Average of 5-10
        break;
      case 'one-take': 
        baseCost = 15; // Average of 10-20
        break;
      case 'polished': 
        baseCost = 25; // Average of 15-35
        break;
      default: 
        baseCost = 20; // Default if track_type is unknown
    }
  } else {
    baseCost = 20; // General fallback if neither is specified
  }
  
  // Add additional service costs
  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((service: string) => {
      switch (service) {
        case 'rush-order':
          baseCost += 10;
          break;
        case 'complex-songs':
          baseCost += 7;
          break;
        case 'additional-edits':
          baseCost += 5;
          break;
        case 'exclusive-ownership':
          baseCost += 40;
          break;
      }
    });
  }
  
  // Round the final cost to the nearest multiple of 5
  const roundedCost = Math.round(baseCost / 5) * 5;
  
  return parseFloat(roundedCost.toFixed(2));
};