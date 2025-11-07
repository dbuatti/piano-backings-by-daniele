import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DollarSign, Music, Key, FileText, Download, Loader2 } from 'lucide-react';
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

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onBuyNow: (product: Product) => Promise<void>; // Added onBuyNow prop
  isBuying: boolean; // Added isBuying prop
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({ isOpen, onOpenChange, product, onBuyNow, isBuying }) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <div className="relative">
          <img
            src={product.image_url || '/placeholder-image.jpg'}
            alt={product.title}
            className="w-full h-64 object-cover rounded-t-lg"
          />
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <Badge className="bg-[#D1AAF2] text-[#1C0357] text-sm px-3 py-1">{product.category.replace(/-/g, ' ')}</Badge>
            {product.vocal_ranges && product.vocal_ranges.map(range => (
              <Badge key={range} variant="secondary" className="bg-gray-200 text-gray-800 text-sm px-3 py-1">{range}</Badge>
            ))}
          </div>
        </div>
        <DialogHeader className="px-6 pt-4">
          <DialogTitle className="text-3xl font-bold text-[#1C0357]">{product.title}</DialogTitle>
          <DialogDescription className="text-gray-600 text-base mt-2">{product.description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center text-gray-800">
            <Music className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-lg font-medium">{product.artist_name}</span>
          </div>
          {product.show_key_signature && product.key_signature && (
            <div className="flex items-center text-gray-800">
              <Key className="h-5 w-5 mr-2 text-purple-500" />
              <span className="text-lg font-medium">Key: {product.key_signature}</span>
            </div>
          )}
          {product.show_sheet_music_url && product.sheet_music_url && (
            <div className="flex items-center text-gray-800">
              <FileText className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-lg font-medium">Sheet Music Available</span>
            </div>
          )}
          {product.track_urls && product.track_urls.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-[#1C0357] mb-2">Preview Tracks:</h3>
              <div className="space-y-2">
                {product.track_urls.map((track, index) => (
                  <audio key={index} controls className="w-full">
                    <source src={track.url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex flex-col sm:flex-row justify-between items-center border-t pt-4 gap-4">
          <div className="flex items-center text-[#1C0357] font-extrabold text-3xl">
            <DollarSign className="h-7 w-7 mr-2" />
            <span>{product.price.toFixed(2)} {product.currency.toUpperCase()}</span>
          </div>
          <Button 
            onClick={() => onBuyNow(product)} 
            className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-8 py-6"
            disabled={isBuying} // Disable button when buying
          >
            {isBuying ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <DollarSign className="mr-2 h-5 w-5" />
            )}
            {isBuying ? 'Processing...' : 'Buy Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;