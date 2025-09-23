import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PricingMatrix = () => {
  // Base prices for each backing type
  const basePrices = {
    'full-song': 30,
    'audition-cut': 15,
    'note-bash': 10
  };

  // Additional service prices
  const additionalServices = [
    { id: 'rush-order', name: 'Rush Order', price: 10 },
    { id: 'complex-songs', name: 'Complex Songs', price: 7 },
    { id: 'additional-edits', name: 'Additional Edits', price: 5 },
    { id: 'exclusive-ownership', name: 'Exclusive Ownership', price: 40 }
  ];

  // Calculate all possible combinations
  const calculateTotal = (backingType: string, services: string[]) => {
    let total = basePrices[backingType as keyof typeof basePrices];
    
    services.forEach(serviceId => {
      const service = additionalServices.find(s => s.id === serviceId);
      if (service) {
        total += service.price;
      }
    });
    
    return total;
  };

  // Generate all possible combinations
  const backingTypes = [
    { id: 'full-song', name: 'Full Song' },
    { id: 'audition-cut', name: 'Audition Cut' },
    { id: 'note-bash', name: 'Note Bash' }
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
                <TableHead className="font-bold">Backing Type</TableHead>
                <TableHead className="font-bold">Service Combination</TableHead>
                {serviceCombinations.map((combo, index) => (
                  <TableHead key={index} className="text-center font-medium">
                    {combo.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {backingTypes.map((type) => (
                <TableRow key={type.id} className="hover:bg-[#D1AAF2]/10">
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">
                        {type.name}
                      </Badge>
                      <span>${basePrices[type.id as keyof typeof basePrices]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">Base price</div>
                  </TableCell>
                  {serviceCombinations.map((combo, index) => (
                    <TableCell key={index} className="text-center font-bold">
                      <div className="flex flex-col items-center">
                        <span className="text-lg">${calculateTotal(type.id, combo.services)}</span>
                        {combo.services.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            ({combo.services.map(s => 
                              additionalServices.find(sv => sv.id === s)?.price
                            ).join(' + ')})
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
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
            <li>• Base prices are for standard tracks with standard complexity</li>
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