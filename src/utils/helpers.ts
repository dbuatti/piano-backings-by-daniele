// Helper function to normalize backing_type to an array of strings
export const getSafeBackingTypes = (rawType: any): string[] => {
  let types: string[] = [];
  if (Array.isArray(rawType)) {
    types = rawType.filter((item: any) => typeof item === 'string');
  } else if (typeof rawType === 'string') {
    types = [rawType];
  }
  // Ensure no empty strings or null/undefined strings if they somehow got through
  return types.filter(type => type && type.trim() !== '');
};