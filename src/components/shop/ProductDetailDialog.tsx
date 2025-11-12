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
import { DollarSign, Music, ShoppingCart, X, Link as LinkIcon, PlayCircle, Theater, Tag, Key, FileText, Loader2 } from 'lucide-react'; // Replaced Mask with Theater
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo
import { showSuccess } from '@/utils/toast'; // Updated import

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
  track_type?: string; // Add track_type here
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onBuyNow: (product: Product) => Promise<void>;
  isBuying: boolean; // Added isBuying prop
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  onOpenChange,
  product,
  onBuyNow,
  isBuying, // Destructure isBuying
}) => {
  if (!product) return null;

  const handlePreviewPdf = () => {
    if (product.sheet_music_url) {
      const deidentifiedFilename = `${product.title} - ${product.artist_name || 'Sheet Music'}.pdf`;
      let previewUrl = product.sheet_music_url;

      // Check if the URL is a Supabase Storage URL
      if (product.sheet_music_url.includes('supabase.co/storage')) {
        const baseUrl = product.sheet_music_url.split('?')[0]; // Remove any existing query parameters
        previewUrl = `${baseUrl}?download=${encodeURIComponent(deidentifiedFilename)}`;
        window.open(previewUrl, '_blank');
      } else {
        // For external links (like Google Drive), we cannot control the filename
        window.open(previewUrl, '_blank');
        showSuccess("External PDF Viewer", "The PDF is hosted externally. The filename displayed in the new tab cannot be de-identified by this application."); // Updated toast call
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1C0357] flex items-center">
            <Music className="mr-2 h-6 w-6" />
            {product.title}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {product.artist_name && <span className="font-medium">{product.artist_name}</span>}
            {product.category && <span className="ml-2 text-sm capitalize">({product.category.replace('-', ' ')})</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {product.image_url && (
            <AspectRatio ratio={16 / 9} className="mb-4">
              <img src={product.image_url} alt={product.title} className="rounded-md object-cover w-full h-full" />
            </AspectRatio>
          )}
          <p className="text-gray-700 text-sm leading-relaxed">{product.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-[#1C0357]" />
              <span className="font-semibold">Price:</span> {product.currency} {product.price.toFixed(2)}
            </div>
            {product.key_signature && product.show_key_signature && (
              <div className="flex items-center">
                <Key className="mr-2 h-4 w-4 text-[#1C0357]" />
                <span className="font-semibold">Key:</span> {product.key_signature}
              </div>
            )}
            {product.vocal_ranges && product.vocal_ranges.length > 0 && (
              <div className="flex items-center col-span-2">
                <Mic className="mr-2 h-4 w-4 text-[#1C0357]" />
                <span className="font-semibold">Vocal Ranges:</span> {product.vocal_ranges.join(', ')}
              </div>
            )}
            {product.track_type && (
              <div className="flex items-center">
                <Headphones className="mr-2 h-4 w-4 text-[#1C0357]" />
                <span className="font-semibold">Track Type:</span> <Badge variant="secondary" className="ml-1 capitalize">{product.track_type.replace('-', ' ')}</Badge>
              </div>
            )}
          </div>

          {product.track_urls && product.track_urls.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-md mb-2 text-[#1C0357] flex items-center">
                <PlayCircle className="mr-2 h-4 w-4" />
                Audio Samples
              </h3>
              <div className="space-y-2">
                {product.track_urls.map((track, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <span className="text-sm font-medium">{track.caption || `Sample ${index + 1}`}</span>
                    <audio controls src={track.url} className="w-auto max-w-[70%] h-8" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.sheet_music_url && product.show_sheet_music_url && (
            <div className="mt-4">
              <Button variant="outline" onClick={handlePreviewPdf} className="w-full">
                <FileText className="mr-2 h-4 w-4" /> Preview Sheet Music (PDF)
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onBuyNow(product)}
            disabled={isBuying}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-6 py-3"
          >
            {isBuying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" /> Buy Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;