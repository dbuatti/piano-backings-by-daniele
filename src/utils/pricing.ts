// src/utils/pricing.ts

export const calculateRequestCost = (request: any) => {
  let minBaseCost = 0;
  let maxBaseCost = 0;
  let additionalFixedCost = 0; // For backing_type and additional_services

  const backingTypes = Array.isArray(request.backing_type) ? request.backing_type : (request.backing_type ? [request.backing_type] : []);
  const trackType = request.track_type;

  // 1. Determine base cost range from track_type
  if (trackType) {
    switch (trackType) {
      case 'quick': 
        minBaseCost = 5;
        maxBaseCost = 10;
        break;
      case 'one-take': 
        minBaseCost = 10;
        maxBaseCost = 20;
        break;
      case 'polished': 
        minBaseCost = 15;
        maxBaseCost = 35;
        break;
      default: 
        minBaseCost = 10; // Default to a reasonable range if unknown
        maxBaseCost = 25;
    }
  } else {
    // Fallback if trackType is not specified, use a general range
    minBaseCost = 10;
    maxBaseCost = 25;
  }

  // 2. Add costs for backing_type (treating them as additional fixed costs)
  // This assumes backing_type adds a fixed amount regardless of track_type base
  backingTypes.forEach((type: string) => {
    switch (type) {
      case 'full-song':
        additionalFixedCost += 30; // Example fixed cost
        break;
      case 'audition-cut':
        additionalFixedCost += 15; // Example fixed cost
        break;
      case 'note-bash':
        additionalFixedCost += 10; // Example fixed cost
        break;
      // No default for backing_type if it's an add-on, only specific types add cost
    }
  });

  // 3. Add additional service costs
  if (request.additional_services && Array.isArray(request.additional_services)) {
    request.additional_services.forEach((service: string) => {
      switch (service) {
        case 'rush-order':
          additionalFixedCost += 10;
          break;
        case 'complex-songs':
          additionalFixedCost += 7;
          break;
        case 'additional-edits':
          additionalFixedCost += 5;
          break;
        case 'exclusive-ownership':
          additionalFixedCost += 40;
          break;
      }
    });
  }
  
  // Apply additional fixed costs to both min and max
  let finalMinCost = minBaseCost + additionalFixedCost;
  let finalMaxCost = maxBaseCost + additionalFixedCost;

  // Round the final costs to the nearest multiple of 5
  finalMinCost = Math.round(finalMinCost / 5) * 5;
  finalMaxCost = Math.round(finalMaxCost / 5) * 5;

  return { min: parseFloat(finalMinCost.toFixed(2)), max: parseFloat(finalMaxCost.toFixed(2)) };
};