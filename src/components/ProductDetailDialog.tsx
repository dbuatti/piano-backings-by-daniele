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
import { DollarSign, Music, ShoppingCart, X, Link as LinkIcon, PlayCircle, User, Tag, Key, FileText } from 'lucide-react'; // Added Key and FileText icons
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo

// TrackInfo interface is now imported from helpers.ts
// interface TrackInfo {
//   url: string;
//   caption: string | boolean | null | undefined; // Updated to be more robust
// }

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
  sheet_music_url?: string | null; // New field
  key_signature?: string | null; // New field
  show_sheet_music_url?: boolean; // New field
  show_key_signature?: boolean; // New field
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

  const handlePreviewPdf = () => {
    if (product.sheet_music_url) {
      window.open(product.sheet_music_url, '_blank');
    }
  };

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
            {product.artist_name && (
              <p className="text-lg text-gray-700 flex items-center">
                <User className="h-5 w-5 mr-2" /> {product.artist_name}
              </p>
            )}
            {product.category && (
              <p className="text-md text-gray-600 flex items-center capitalize">
                <Tag className="h-4 w-4 mr-2" /> {product.category.replace('-', ' ')}
              </p>
            )}
            {product.key_signature && product.show_key_signature && ( // Conditionally display key signature
              <p className="text-md text-gray-600 flex items-center">
                <Key className="h-4 w-4 mr-2" /> Key: {product.key_signature}
              </p>
            )}
            {product.vocal_ranges && product.vocal_ranges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.vocal_ranges.map((range, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {range}
                  </Badge>
                ))}
              </div>
            )}
            <DialogDescription className="text-lg text-gray-700">
              {product.description}
            </DialogDescription>
          </DialogHeader>

          {product.sheet_music_url && product.show_sheet_music_url && ( // Conditionally display PDF preview button
            <div className="border-t pt-4">
              <Button 
                variant="outline" 
                onClick={handlePreviewPdf}
                className="w-full bg-[#D1AAF2]/30 hover:bg-[#D1AAF2]/50 text-[#1C0357]"
              >
                <FileText className="h-4 w-4 mr-2" /> Preview Sheet Music (PDF)
              </Button>
            </div>
          )}

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
                      {String(track.caption || 'Track Sample')}
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