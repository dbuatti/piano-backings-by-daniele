import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrackInfo } from '@/utils/helpers'; // Ensure TrackInfo is imported
import { Music, DollarSign, Key, FileText, ShoppingCart } from 'lucide-react';

// Define the Product interface, matching Shop.tsx
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
  product: Product | null;
  onBuyNow: (product: Product) => void;
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({ isOpen, onOpenChange, product, onBuyNow }) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1C0357]">{product.title}</DialogTitle>
          <DialogDescription className="text-gray-600">
            by {product.artist_name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <img src={product.image_url || '/placeholder-image.png'} alt={product.title} className="w-full h-64 object-cover rounded-md" />
          <p className="text-lg font-semibold text-[#1C0357] flex items-center">
            <DollarSign className="h-5 w-5 mr-2" /> {product.price.toFixed(2)} {product.currency}
          </p>
          <p className="text-gray-700">{product.description}</p>

          <div className="space-y-2">
            <h4 className="font-semibold text-md text-[#1C0357] flex items-center"><Music className="h-4 w-4 mr-2" /> Tracks:</h4>
            {product.track_urls.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-700">
                {product.track_urls.map((track, index) => (
                  <li key={index}>{track.caption || `Track ${index + 1}`}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No tracks available.</p>
            )}
          </div>

          {product.show_key_signature && product.key_signature && (
            <p className="text-sm text-gray-700 flex items-center">
              <Key className="h-4 w-4 mr-2" /> Key: {product.key_signature}
            </p>
          )}

          {product.show_sheet_music_url && product.sheet_music_url && (
            <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
              <FileText className="h-4 w-4 mr-2" /> View Sheet Music (PDF)
            </a>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={() => onBuyNow(product)} className="bg-[#1C0357] hover:bg-[#1C0357]/90 flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" /> Buy Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;