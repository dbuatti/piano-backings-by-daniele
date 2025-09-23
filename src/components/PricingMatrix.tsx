import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { calculateRequestCost } from '@/utils/pricing'; // Import the new pricing utility

const PricingMatrix = () => {
  // Base price ranges for each track type
  const trackTypeBaseRanges = {
    'quick': { min: 5, max: 10 },
    'one-take': { min: 10, max: 20 },
    'polished': { min: 15, max: 35 }
  };

  // Fixed add-on costs for backing types
  const backingTypeAddOns = [
    { id: 'full-song', name: 'Full Song', price: 30 },
    { id: 'audition-cut', name: 'Audition Cut', price: 15 },
    { id: 'note-bash', name: 'Note Bash', price: 10 }
  ];

  // Additional service prices
  const additionalServices = [
    { id: 'rush-order', name: 'Rush Order', price: 10 },
    { id: 'complex-songs', name: 'Complex Songs', price: 7 },
    { id: 'additional-edits', name: 'Additional Edits', price: 5 },
    { id: 'exclusive-ownership', name: 'Exclusive Ownership', price: 40 }
  ];

  // Generate all possible combinations for display
  const trackTypes = [
    { id: 'quick', name: 'Quick Reference' },
    { id: 'one-take', name: 'One-Take Recording' },
    { id: 'polished', name: 'Polished Backing' }
  ];

  // Generate service combinations (showing some common ones)
  const serviceCombinations = [
    { name: 'Base Price', services: [], backingTypes: [] },
    { name: 'Base + Full Song', services: [], backingTypes: ['full-song'] },
    { name: 'Base + Audition Cut', services: [], backingTypes: ['audition-cut'] },
    { name: 'Base + Note Bash', services: [], backingTypes: ['note-bash'] },
    { name: 'Base + Rush', services: ['rush-order'], backingTypes: [] },
    { name: 'Base + Complex', services: ['complex-songs'], backingTypes: [] },
    { name: 'Base + Full Song + Rush', services: ['rush-order'], backingTypes: ['full-song'] },
    { name: 'Base + Audition Cut + Complex', services: ['complex-songs'], backingTypes: ['audition-cut'] },
    { name: 'Base + Exclusive', services: ['exclusive-ownership'], backingTypes: [] },
    { name: 'All Add-ons (Full Song)', services: ['rush-order', 'complex-songs', 'additional-edits', 'exclusive-ownership'], backingTypes: ['full-song'] }
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357]">Pricing Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#D1AAF2]/20">
                <TableHead className="font-bold min-w-[150px]">Track Type</TableHead>
                {serviceCombinations.map((combo, index) => (
                  <TableHead key={index} className="text-center font-medium min-w-[150px]">
                    {combo.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackTypes.map((type) => (
                <TableRow key={type.id} className="hover:bg-[#D1AAF2]/10">
                  <TableCell className="font-medium">
                    <div className="flex flex-col items-start">
                      <Badge variant="outline" className="mb-1 capitalize">
                        {type.name}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        (${trackTypeBaseRanges[type.id as keyof typeof trackTypeBaseRanges].min} - ${trackTypeBaseRanges[type.id as keyof typeof trackTypeBaseRanges].max})
                      </span>
                    </div>
                  </TableCell>
                  {serviceCombinations.map((combo, index) => {
                    const { min, max } = calculateRequestCost({
                      track_type: type.id,
                      backing_type: combo.backingTypes,
                      additional_services: combo.services
                    });
                    return (
                      <TableCell key={index} className="text-center font-bold">
                        <div className="flex flex-col items-center">
                          <span className="text-lg">${min.toFixed(2)} - ${max.toFixed(2)}</span>
                          {/* Optional: show breakdown if needed */}
                          {/* {combo.services.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              ({combo.services.map(s => 
                                additionalServices.find(sv => sv.id === s)?.price
                              ).join(' + ')})
                            </div>
                          )} */}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-[#1C0357]">Add-on Services Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {backingTypeAddOns.map((service) => (
              <Card key={service.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize">{service.name} (Backing Type)</span>
                    <Badge variant="default" className="bg-[#F538BC]">
                      +${service.price}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {additionalServices.map((service) => (
              <Card key={service.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="default" className="bg-[#1C0357]">
                      +${service.price}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-[#D1AAF2]/20 rounded-lg">
          <h3 className="font-semibold text-[#1C0357] mb-2">Pricing Notes</h3>
          <ul className="text-sm space-y-1">
            <li>• Base prices are determined by the selected Track Type (Quick, One-Take, Polished).</li>
            <li>• Backing Type (Full Song, Audition Cut, Note Bash) and Additional Services are fixed add-on costs.</li>
            <li>• Rush orders are delivered within 24 hours.</li>
            <li>• Complex songs include Sondheim, JRB, and Guettel compositions.</li>
            <li>• Additional edits are $5 per request after completion.</li>
            <li>• Exclusive ownership prevents the track from being shared online.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingMatrix;