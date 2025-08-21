// src/utils/pricing.ts

export const calculateRequestCost = (request: any) => {
  let baseCost = 0;
  switch (request.backing_type) {
    case 'full-song':
      baseCost = 30;
      break;
    case 'audition-cut':
      baseCost = 15;
      break;
    case 'note-bash':
      baseCost = 10;
      break;
    default:
      baseCost = 20;
  }
  
  // Add additional service costs
  if (request.additional_services) {
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
  
  return baseCost;
};