import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Music, Key, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo

// Define the Product interface here or import it from a shared types file
// For now, defining it here to resolve the immediate error.
interface Product {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  track_urls: TrackInfo[];
  is_active: boolean;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string | null;
  key_signature: string | null;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
}

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => Promise<void>; // Added onBuyNow prop
  isBuying: boolean; // Added isBuying prop
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  return (
    <Card className="flex flex-col h-full border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out min-h-[400px]">
      <CardHeader className="p-0">
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={product.image_url || '/placeholder.svg'} // Changed fallback to .svg
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge className="bg-[#D1AAF2] text-[#1C0357]">{product.category.replace(/-/g, ' ')}</Badge>
            {product.vocal_ranges && product.vocal_ranges.map(range => (
              <Badge key={range} variant="secondary" className="bg-gray-200 text-gray-800">{range}</Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle className="text-xl font-bold text-[#1C0357] mb-2">{product.title}</CardTitle>
        <CardDescription className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</CardDescription>
        <div className="flex items-center text-gray-800 mb-2">
          <Music className="h-4 w-4 mr-2 text-blue-500" />
          <span className="text-sm">{product.artist_name}</span>
        </div>
        {product.show_key_signature && product.key_signature && (
          <div className="flex items-center text-gray-800 mb-2">
            <Key className="h-4 w-4 mr-2 text-purple-500" />
            <span className="text-sm">Key: {product.key_signature}</span>
          </div>
        )}
        {product.show_sheet_music_url && product.sheet_music_url && (
          <div className="flex items-center text-gray-800 mb-2">
            <FileText className="h-4 w-4 mr-2 text-green-500" />
            <span className="text-sm">Sheet Music Available</span>
          </div>
        )}
        <div className="flex items-center text-[#1C0357] font-semibold text-lg mt-3">
          <DollarSign className="h-5 w-5 mr-1" />
          <span>{product.price.toFixed(2)} {product.currency.toUpperCase()}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline" 
          onClick={() => onViewDetails(product)} 
          className="flex-grow text-[#1C0357] border-[#1C0357] hover:bg-[#1C0357]/10"
        >
          View Details
        </Button>
        <Button 
          onClick={() => onBuyNow(product)} 
          className="flex-grow bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
          disabled={isBuying} // Disable button when buying
        >
          {isBuying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="mr-2 h-4 w-4" />
          )}
          {isBuying ? 'Processing...' : 'Buy Now'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;