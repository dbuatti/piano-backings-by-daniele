import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  calculateRequestCost, 
  TRACK_TYPE_BASE_COSTS, 
  BACKING_TYPE_MODIFIERS, 
  ADDITIONAL_SERVICE_COSTS 
} from "@/utils/pricing"; // Import constants

const PricingMatrix = () => {
  
  // Define the track types based on the imported constants
  const trackTypes = Object.entries(TRACK_TYPE_BASE_COSTS).map(([id, cost]) => ({
    id,
    name: id.replace('-', ' '),
    baseCost: cost,
  }));

  // Define the backing types (modifiers) based on the imported constants
  const backingTypes = Object.entries(BACKING_TYPE_MODIFIERS).map(([id, modifier]) => ({
    id,
    name: id.replace('-', ' '),
    modifier,
  }));

  // Additional service prices (used for display)
  const additionalServices = Object.entries(ADDITIONAL_SERVICE_COSTS).map(([id, price]) => ({
    id,
    name: id.replace('-', ' '),
    price,
  }));

  // Generate service combinations (showing only the base + single modifier for the matrix)
  const matrixColumns = backingTypes.map(bt => ({
    name: `${bt.name} (+A$${bt.modifier.toFixed(2)})`,
    modifierId: bt.id,
  }));

  // Calculate total using the central utility function for the matrix cells
  const calculateMatrixTotal = (trackType: string, modifierId: string) => {
    // Simulate a request object for the utility function
    const mockRequest = {
      track_type: trackType,
      backing_type: [modifierId], // Only include the single modifier for the matrix cell
      additional_services: [],
    };
    // Note: The utility function rounds to the nearest $5.00.
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
                <TableHead className="font-bold w-[200px]">Quality / Length</TableHead>
                {matrixColumns.map((col, index) => (
                  <TableHead key={index} className="text-center font-medium">
                    {col.name}
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
                      <span className="text-sm text-gray-600">(A${type.baseCost.toFixed(2)})</span>
                    </div>
                  </TableCell>
                  {matrixColumns.map((col, index) => {
                    const total = calculateMatrixTotal(type.id, col.modifierId);
                    return (
                      <TableCell key={index} className="text-center font-bold">
                        <span className="text-lg">A${total.toFixed(2)}</span>
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
                    <span className="font-medium capitalize">{service.name.replace('-', ' ')}</span>
                    <Badge variant="default" className="bg-[#1C0357]">
                      +A${service.price.toFixed(2)}
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
            <li>• Final price is calculated by: (Track Type Base Cost + Highest Backing Type Modifier + Additional Services).</li>
            <li>• The final total is rounded to the nearest A$5.00.</li>
            <li>• Rush orders are delivered within 24 hours</li>
            <li>• Complex songs include Sondheim, JRB, and Guettel compositions</li>
            <li>• Additional edits are A$5.00 per request after completion</li>
            <li>• Exclusive ownership prevents the track from being shared online</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingMatrix;