"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  ShoppingCart, 
  Loader2, 
  PlayCircle, 
  PauseCircle,
  Music,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { TrackInfo } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { isWithinInterval, subDays } from 'date-fns';

interface Product {
  id: string;
  created_at: string;
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
  master_download_link?: string | null;
}

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => Promise<void>;
  isBuying: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const firstTrackUrl = product.track_urls?.[0]?.url || null;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current || !firstTrackUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        audioRef.current?.pause();
        audioRef.current!.currentTime = 0;
        setIsPlaying(false);
      }, 10000);
    }
  };

  const getTrackTypeConfig = (type?: string) => {
    switch (type) {
      case 'polished':
        return { color: 'text-pink-600', bg: 'bg-pink-100' };
      default:
        return null;
    }
  };

  const isNew = isWithinInterval(new Date(product.created_at), {
    start: subDays(new Date(), 7),
    end: new Date(),
  });

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "group relative flex flex-col overflow-visible shadow-2xl hover:shadow-3xl transition-all duration-500 h-full rounded-3xl border-0",
          "bg-white",
          "hover:-translate-y-6"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient Header */}
        <CardHeader className="p-0 relative overflow-hidden rounded-t-3xl">
          <AspectRatio ratio={1 / 1}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#EC4899] via-[#F59E0B] to-[#F97316] opacity-90" />
            <div className="relative flex flex-col items-center justify-center h-full p-8 text-white">
              <h3 className="text-3xl font-black text-center leading-tight drop-shadow-2xl">
                {product.title}
              </h3>
              <p className="mt-3 text-xl font-medium opacity-90">
                by {product.artist_name || 'Reprise'}
              </p>
            </div>
          </AspectRatio>

          {/* Play Overlay on Hover */}
          {firstTrackUrl && isHovered && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md rounded-full p-6 shadow-3xl animate-pulse">
                <PlayCircle className="h-20 w-20 text-[#EC4899]" />
              </div>
            </div>
          )}
        </CardHeader>

        {/* Body - Clickable */}
        <CardContent 
          className="flex-1 p-8 cursor-pointer space-y-6"
          onClick={() => onViewDetails(product)}
        >
          {/* Title + Artist */}
          <div className="text-center">
            <h3 className="text-2xl font-black text-gray-900">
              {product.title}
            </h3>
            <p className="mt-2 text-lg text-gray-600 flex items-center justify-center">
              <Music className="h-5 w-5 mr-2 text-[#EC4899]" />
              {product.artist_name || 'Reprise'}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-3 justify-center">
            {product.category && (
              <Badge className="bg-purple-100 text-purple-700 px-4 py-1 text-sm">
                audition cut
              </Badge>
            )}
            {product.vocal_ranges?.slice(0, 2).map((range) => (
              <Badge key={range} className="bg-pink-100 text-pink-700 px-4 py-1 text-sm border border-pink-300">
                {range}
              </Badge>
            ))}
            {product.key_signature && (
              <Badge variant="outline" className="px-4 py-1 text-sm">
                <Key className="h-4 w-4 mr-2" />
                {product.key_signature}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-center text-gray-700 leading-relaxed text-base">
            {product.description}
          </p>
        </CardContent>

        {/* CTA Footer - Matches Mockup Exactly */}
        <div className="px-8 pb-8 pt-4">
          <div className="bg-gradient-to-r from-[#F59E0B] to-[#EC4899] rounded-full p-1 shadow-2xl">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow(product);
              }}
              disabled={isBuying}
              className="w-full h-16 bg-white text-[#8B5CF6] hover:bg-gray-50 rounded-full font-black text-2xl shadow-xl flex items-center justify-center gap-4"
            >
              <span>
                {product.currency}{product.price.toFixed(2)}
              </span>
              <span className="text-lg text-gray-600">instant download</span>
              <div className="bg-gradient-to-r from-[#F59E0B] to-[#EC4899] rounded-full p-3">
                {isBuying ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <ShoppingCart className="h-8 w-8 text-white" />
                )}
              </div>
              <span>Buy Now & Download</span>
            </Button>
          </div>
        </div>

        {/* Hidden Audio */}
        {firstTrackUrl && (
          <audio
            ref={audioRef}
            src={firstTrackUrl}
            preload="none"
            onEnded={() => {
              setIsPlaying(false);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
          />
        )}
      </Card>
    </TooltipProvider>
  );
};

export default ProductCard;