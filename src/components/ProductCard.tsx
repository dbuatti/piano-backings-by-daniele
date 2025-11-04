import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, Eye, ShoppingCart, Loader2 } from 'lucide-react'; // Removed Music
// import { cn } from '@/lib/utils'; // Removed as it was unused

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  is_active: boolean;
}

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  isBuying: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  return (
    <Card className="w-full max-w-sm mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="w-full h-full object-cover rounded-t-lg" 
            />
          ) : (
            <div 
              className="flex items-center justify-center w-full h-full text-white p-4 text-center rounded-t-lg"
              style={{ backgroundColor: '#ff08b0', fontFamily: '"Playfair Display", serif' }}
            >
              <h3 className="text-xl md:text-2xl font-bold italic leading-tight">
                {product.title}
              </h3>
            </div>
          )}
        </AspectRatio>
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-white text-[#1C0357] shadow-md">
            {product.currency} {product.price.toFixed(2)}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#1C0357] mb-2">{product.title}</h3>
          <p className="text-sm text-gray-700 mb-4 line-clamp-3">{product.description}</p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewDetails(product)}
            className="text-[#1C0357] border-[#1C0357] hover:bg-[#1C0357] hover:text-white"
          >
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Button>
          <Button 
            size="sm" 
            onClick={() => onBuyNow(product)}
            disabled={isBuying}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
          >
            {isBuying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buying...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" /> Buy Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;