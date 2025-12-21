"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  DollarSign, 
  ShoppingCart, 
  Loader2, 
  PlayCircle, 
  PauseCircle, 
  Sparkles, 
  Mic, 
  Headphones,
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
      case 'quick':
        return { Icon: Mic, color: 'text-blue-600', bg: 'bg-blue-100', tooltip: 'Quick Reference – Fast voice memo for learning' };
      case 'one-take':
        return { Icon: Headphones, color: 'text-amber-600', bg: 'bg-amber-100', tooltip: 'One-Take – Authentic live recording' };
      case 'polished':
        return { Icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-100', tooltip: 'Polished – Professionally refined backing track' };
      default:
        return null;
    }
  };

  const trackConfig = getTrackTypeConfig(product.track_type);

  const isNew = isWithinInterval(new Date(product.created_at), {
    start: subDays(new Date(), 7),
    end: new Date(),
  });

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "group relative flex flex-col overflow-visible shadow-xl hover:shadow-2xl transition-all duration-500 h-full",
          "bg-white border border-gray-200 rounded-2xl",
          "hover:-translate-y-4 hover:ring-4 hover:ring-[#EC4899]/30"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Play Overlay */}
        {firstTrackUrl && isHovered && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/95 backdrop-blur-md rounded-full p-6 shadow-2xl">
              <PlayCircle className="h-20 w-20 text-[#EC4899] drop-shadow-2xl" />
            </div>
          </div>
        )}

        {/* Header Image */}
        <CardHeader className="p-0 relative overflow-hidden rounded-t-2xl">
          <AspectRatio ratio={1 / 1}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] p-10">
                <h3 className="text-3xl font-black text-white text-center leading-tight drop-shadow-2xl">
                  {product.title}
                </h3>
                {product.artist_name && (
                  <span className="mt-3 text-xl font-medium text-white/90">by {product.artist_name}</span>
                )}
              </div>
            )}
          </AspectRatio>

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
            {isNew && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-xl px-4 py-1 animate-pulse">
                NEW
              </Badge>
            )}
            {trackConfig && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("p-3 rounded-full shadow-2xl", trackConfig.bg)}>
                    <trackConfig.Icon className={cn("h-7 w-7", trackConfig.color)} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="font-medium max-w-xs">{trackConfig.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent 
          className="flex-1 p-6 cursor-pointer space-y-5"
          onClick={() => onViewDetails(product)}
        >
          <div>
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">
              {product.title}
            </h3>
            {product.artist_name && (
              <p className="text-base text-gray-600 mt-2 flex items-center">
                <Music className="h-5 w-5 mr-2 text-[#EC4899]" />
                {product.artist_name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {product.category && (
              <Badge className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1">
                {product.category.replace('-', ' ')}
              </Badge>
            )}
            {product.vocal_ranges?.slice(0, 4).map((range) => (
              <Badge key={range} variant="outline" className="text-sm border-pink-300 text-pink-700 px-3 py-1">
                {range}
              </Badge>
            ))}
            {product.show_key_signature && product.key_signature && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                <Key className="h-4 w-4 mr-2" />
                {product.key_signature}
              </Badge>
            )}
          </div>

          <p className="text-base text-gray-600 leading-relaxed line-clamp-4">
            {product.description}
          </p>
        </CardContent>

        {/* Footer */}
        <CardFooter className="p-6 pt-0 space-y-5">
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-4xl font-black text-[#8B5CF6]">
                {product.currency}{product.price.toFixed(2)}
              </span>
              <span className="block text-sm text-gray-500 mt-1">instant download</span>
            </div>

            {firstTrackUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handlePlayPause}
                    className={cn(
                      "rounded-full shadow-2xl transition-all duration-300",
                      isPlaying
                        ? "bg-red-500 hover:bg-red-600 animate-pulse"
                        : "bg-gradient-to-r from-[#EC4899] to-[#F59E0B] hover:scale-110"
                    )}
                  >
                    {isPlaying ? <PauseCircle className="h-8 w-8" /> : <PlayCircle className="h-8 w-8" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPlaying ? "Pause preview" : "Play 10-second sample"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBuyNow(product);
            }}
            disabled={isBuying}
            className="w-full h-16 text-xl font-bold rounded-2xl shadow-2xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C4DFF] hover:to-[#EC4899] hover:shadow-3xl hover:scale-105 transition-all"
          >
            {isBuying ? (
              <>
                <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-3 h-7 w-7" />
                Buy Now & Download
              </>
            )}
          </Button>
        </CardFooter>

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