import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Music, DollarSign, Eye, ShoppingCart, Loader2, User, Tag, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrackInfo } from '@/utils/helpers';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_urls?: TrackInfo[];
  is_active: boolean;
  artist_name?: string;
  category?: string;
  vocal_ranges?: string[];
  sheet_music_url?: string | null;
  key_signature?: string | null;
  show_sheet_music_url?: boolean;
  show_key_signature?: boolean;
  track_type?: string;
}

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  isBuying: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="p-0 relative"> {/* Added relative positioning here */}
        <AspectRatio ratio={16 / 9}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div 
              className="flex items-center justify-center w-full h-full text-white p-4 text-center"
              style={{ backgroundColor: '#ff08b0', fontFamily: '"Playfair Display", serif' }}
            >
              <h3 className="text-xl md:text-2xl font-bold italic leading-tight">
                {product.title}
              </h3>
            </div>
          )}
        </AspectRatio>
        {product.category && (
          <Badge 
            variant="default" 
            className="absolute bottom-2 left-2 bg-[#1C0357] text-white capitalize text-sm px-3 py-1 rounded-full shadow-md"
          >
            {product.category.replace('-', ' ')}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <CardTitle className="text-xl font-bold text-[#1C0357] mb-2">{product.title}</CardTitle>
        {product.artist_name && (
          <p className="text-sm text-gray-500 flex items-center mb-1">
            <User className="h-3 w-3 mr-1" /> {product.artist_name}
          </p>
        )}
        {product.key_signature && product.show_key_signature && (
          <p className="text-xs text-gray-500 flex items-center mb-2">
            <Key className="h-3 w-3 mr-1" /> {product.key_signature}
          </p>
        )}
        {product.vocal_ranges && product.vocal_ranges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.vocal_ranges.map((range, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {range}
              </Badge>
            ))}
          </div>
        )}
        {product.track_type && (
          <p className="text-xs text-gray-500 flex items-center mb-2 capitalize">
            <Music className="h-3 w-3 mr-1" /> {product.track_type.replace('-', ' ')}
          </p>
        )}
        <p className="text-sm text-gray-600 line-clamp-3">{product.description}</p>
        <div className="flex items-center mt-3">
          <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          <span className="text-lg font-semibold text-[#1C0357]">{product.currency} {product.price.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={() => onViewDetails(product)}
          className="flex-1 mr-2 bg-[#D1AAF2]/30 hover:bg-[#D1AAF2]/50 text-[#1C0357]"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        <Button 
          onClick={() => onBuyNow(product)}
          disabled={isBuying}
          className="flex-1 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
        >
          {isBuying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buying...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;