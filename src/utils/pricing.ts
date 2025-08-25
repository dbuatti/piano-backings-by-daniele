// src/utils/pricing.ts

export const calculateRequestCost = (request: any) => {
  let baseCost = 0;
  
  // Determine base cost based on backing_type or track_type
  // Prioritize backing_type if available, otherwise infer from track_type
  const backingTypes = Array.isArray(request.backing_type) ? request.backing_type : [request.backing_type];
  const trackType = request.track_type;

  // Calculate base cost for each selected backing type
  backingTypes.forEach((backingType: string) => {
    switch (backingType) {
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
        // If backing_type is unknown, try to infer from track_type if no specific backing type was selected
        if (backingTypes.length === 0 || (backingTypes.length === 1 && backingType === undefined)) {
          switch (trackType) {
            case 'quick': 
              baseCost += 7.5; // Average of 5-10
              break;
            case 'one-take': 
              baseCost += 15; // Average of 10-20
              break;
            case 'polished': 
              baseCost += 25; // Average of 15-35
              break;
            default: 
              baseCost += 20; // Default if track_type is unknown
          }
        } else {
          baseCost += 20; // Default if backing_type is unknown but other backing types are present
        }
    }
  });

  // If no specific backing types were selected, and trackType is available, use trackType for base cost
  if (backingTypes.length === 0 && trackType) {
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
  } else if (backingTypes.length === 0 && !trackType) {
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
  
  return parseFloat(baseCost.toFixed(2));
};