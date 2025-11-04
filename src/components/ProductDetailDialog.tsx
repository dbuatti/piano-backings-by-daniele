import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, Music, ShoppingCart, X, Link as LinkIcon, PlayCircle } from 'lucide-react'; // Added PlayCircle icon
import { cn } from '@/lib/utils';

interface TrackInfo {
  url: string;
  caption: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_urls?: TrackInfo[];
  is_active: boolean;
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onBuyNow: (product: Product) => void;
  isBuying: boolean;
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  onOpenChange,
  product,
  onBuyNow,
  isBuying,
}) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="relative">
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
                <h3 className="text-2xl md:text-3xl font-bold italic leading-tight">
                  {product.title}
                </h3>
              </div>
            )}
          </AspectRatio>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 text-white hover:bg-white/20 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-[#1C0357]">{product.title}</DialogTitle>
            <DialogDescription className="text-lg text-gray-700">
              {product.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between border-t border-b py-3">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-[#1C0357] mr-2" />
              <span className="text-2xl font-bold text-[#1C0357]">{product.currency} {product.price.toFixed(2)}</span>
            </div>
            <Button 
              onClick={() => onBuyNow(product)}
              disabled={isBuying}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-6 py-3"
            >
              {isBuying ? 'Processing...' : 'Buy Now'}
              <ShoppingCart className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {product.track_urls && product.track_urls.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xl font-semibold text-[#1C0357] flex items-center">
                <Music className="mr-2 h-5 w-5" />
                Available Tracks
              </h4>
              <ul className="space-y-2">
                {product.track_urls.map((track, index) => (
                  <li key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md bg-gray-50">
                    <span className="font-medium text-gray-800 flex items-center mb-2 sm:mb-0">
                      <LinkIcon className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                      {track.caption}
                    </span>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <audio controls preload="none" className="w-full sm:w-48 h-8">
                        <source src={track.url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <span className="text-sm text-gray-500 whitespace-nowrap">(10-sec sample)</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-600">Note: These are 10-second audio samples. Full access is granted upon purchase.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;