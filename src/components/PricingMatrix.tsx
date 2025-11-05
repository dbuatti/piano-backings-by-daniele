import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { calculateRequestCost } from "@/utils/pricing"; // Import the utility

const PricingMatrix = () => {
  // Base prices for each backing type (used internally by the utility if track_type is polished/missing)
  // We define the track types we want to display in the matrix
  const trackTypes = [
    { id: 'polished', name: 'Polished Backing', baseRange: '$15 - $35' },
    { id: 'one-take', name: 'One-Take Recording', baseRange: '$10 - $20' },
    { id: 'quick', name: 'Quick Reference', baseRange: '$5 - $10' },
  ];

  // Additional service prices (used for display)
  const additionalServices = [
    { id: 'rush-order', name: 'Rush Order', price: 10 },
    { id: 'complex-songs', name: 'Complex Songs', price: 7 },
    { id: 'additional-edits', name: 'Additional Edits', price: 5 },
    { id: 'exclusive-ownership', name: 'Exclusive Ownership', price: 40 }
  ];

  // Generate service combinations (showing some common ones)
  const serviceCombinations = [
    { name: 'Base Price', services: [] },
    { name: 'Base + Rush', services: ['rush-order'] },
    { name: 'Base + Complex', services: ['complex-songs'] },
    { name: 'Base + Rush + Complex', services: ['rush-order', 'complex-songs'] },
    { name: 'Base + Exclusive', services: ['exclusive-ownership'] },
    { name: 'All Services', services: ['rush-order', 'complex-songs', 'additional-edits', 'exclusive-ownership'] }
  ];

  // Calculate total using the central utility function
  const calculateTotal = (trackType: string, services: string[]) => {
    // Simulate a request object for the utility function
    const mockRequest = {
      track_type: trackType,
      backing_type: ['full-song'], // Use full-song to ensure the base cost is overridden by track_type
      additional_services: services,
    };
    return calculateRequestCost(mockRequest).totalCost;
  };

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
                <TableHead className="font-bold w-[200px]">Track Type</TableHead>
                {serviceCombinations.map((combo, index) => (
                  <TableHead key={index} className="text-center font-medium">
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
                      <Badge variant="default" className="mb-1 bg-[#1C0357] capitalize">
                        {type.name}
                      </Badge>
                      <span className="text-sm text-gray-600">{type.baseRange}</span>
                    </div>
                  </TableCell>
                  {serviceCombinations.map((combo, index) => {
                    const total = calculateTotal(type.id, combo.services);
                    return (
                      <TableCell key={index} className="text-center font-bold">
                        <div className="flex flex-col items-center">
                          <span className="text-lg">${total.toFixed(2)}</span>
                          {combo.services.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              ({combo.services.map(s => 
                                additionalServices.find(sv => sv.id === s)?.price
                              ).join(' + ')})
                            </div>
                          )}
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
          <h3 className="text-lg font-semibold mb-4 text-[#1C0357]">Additional Services Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {additionalServices.map((service) => (
              <Card key={service.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="default" className="bg-[#1C0357]">
                      ${service.price}
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
            <li>• Base prices reflect the complexity and quality of the track type (Quick, One-Take, Polished).</li>
            <li>• Rush orders are delivered within 24 hours</li>
            <li>• Complex songs include Sondheim, JRB, and Guettel compositions</li>
            <li>• Additional edits are $5 per request after completion</li>
            <li>• Exclusive ownership prevents the track from being shared online</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingMatrix;