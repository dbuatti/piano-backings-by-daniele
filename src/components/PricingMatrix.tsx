import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  TIER_PRICES, 
  ADDITIONAL_SERVICE_COSTS 
} from "@/utils/pricing";

const PricingMatrix = () => {
  
  const tiers = Object.entries(TIER_PRICES).map(([id, price]) => ({
    id,
    name: id.replace('-', ' '),
    price,
  }));

  const additionalServices = Object.entries(ADDITIONAL_SERVICE_COSTS).map(([id, price]) => ({
    id,
    name: id.replace('-', ' '),
    price,
  }));

  return (
    <Card className="shadow-lg border-none rounded-[32px] overflow-hidden">
      <CardHeader className="bg-[#1C0357] text-white p-8">
        <CardTitle className="text-3xl font-black">Pricing Matrix</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="overflow-x-auto border rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#D1AAF2]/20">
                <TableHead className="font-black text-[#1C0357] py-6 px-6">Tier</TableHead>
                <TableHead className="font-black text-[#1C0357] py-6 px-6">Description</TableHead>
                <TableHead className="text-right font-black text-[#1C0357] py-6 px-6">Base Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id} className="hover:bg-[#D1AAF2]/10">
                  <TableCell className="font-black capitalize py-6 px-6 text-[#1C0357]">
                    {tier.name}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 py-6 px-6">
                    {tier.id === 'note-bash' && "A simple, one-pass recording with the melody 'bashed out'. Functional reference for learning notes."}
                    {tier.id === 'audition-ready' && "A detailed, comprehensive and expressive recording of a 16/32 bar cut. Performance quality."}
                    {tier.id === 'full-song' && "A concert-level, comprehensive performance of the complete piece. Fully voiced and dynamically shaped."}
                  </TableCell>
                  <TableCell className="text-right font-black text-xl text-[#F538BC] py-6 px-6">
                    ${tier.price.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-12">
          <h3 className="text-xl font-black mb-6 text-[#1C0357] uppercase tracking-widest">Additional Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {additionalServices.map((service) => (
              <Card key={service.id} className="border-2 border-gray-100 rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="font-black capitalize text-[#1C0357]">{service.name.replace('-', ' ')}</span>
                    <Badge variant="default" className="bg-[#F538BC] text-white font-black">
                      +${service.price.toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="mt-12 p-8 bg-[#1C0357] text-white rounded-[32px] shadow-xl">
          <h3 className="font-black text-xl mb-4 flex items-center gap-2">
            <Package className="text-[#F538BC]" />
            Season Pack — $95
          </h3>
          <p className="text-white/70 font-medium mb-4">
            Get 3 Audition Ready tracks and save $15. Mention this in special requests to redeem!
          </p>
          <ul className="text-sm space-y-2 text-white/60 font-bold">
            <li>• Save $15.00 compared to individual orders</li>
            <li>• Valid for 6 months from purchase</li>
            <li>• Redeemable for any Audition Ready tier track</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const Package = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </svg>
);

export default PricingMatrix;