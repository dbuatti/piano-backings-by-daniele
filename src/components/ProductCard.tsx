import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Music, DollarSign, Eye, ShoppingCart } from 'lucide-react'; // Added ShoppingCart icon
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_url?: string; // Assuming this might be a preview or full track
  is_active: boolean;
}

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => void; // Changed to onBuyNow
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow }) => {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="p-0">
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
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <CardTitle className="text-xl font-bold text-[#1C0357] mb-2">{product.title}</CardTitle>
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
          onClick={() => onBuyNow(product)} // Call onBuyNow
          className="flex-1 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Buy Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;