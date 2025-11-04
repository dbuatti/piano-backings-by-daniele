import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackInfo } from '@/utils/helpers'; // Ensure TrackInfo is imported

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

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails }) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-4 pb-2">
        <img src={product.image_url || '/placeholder-image.png'} alt={product.title} className="w-full h-48 object-cover rounded-md mb-2" />
        <CardTitle className="text-lg font-semibold truncate">{product.title}</CardTitle>
        <p className="text-sm text-gray-500">{product.artist_name}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
        <p className="text-md font-bold text-[#1C0357] mb-3">${product.price.toFixed(2)} {product.currency}</p>
        <Button onClick={() => onViewDetails(product)} className="w-full bg-[#1C0357] hover:bg-[#1C0357]/90">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;