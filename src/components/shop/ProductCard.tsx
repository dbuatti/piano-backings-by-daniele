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
  Key,
  BadgeCheck
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

  // Auto-pause when unmount or tab loses focus
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
      audioRef.current.play().catch(() => {
        // Handle autoplay policy gracefully
        setIsPlaying(false);
      });
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
          "group relative flex flex-col overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 h-full",
          "bg-white border-0 rounded-2xl",
          "hover:-translate-y-3 hover:ring-4 hover:ring-[#EC4899]/20"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Play Button Overlay on Hover */}
        {firstTrackUrl && isHovered && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md rounded-full p-4 shadow-2xl animate-bounce-short">
              <PlayCircle className="h-16 w-16 text-[#EC4899] drop-shadow-lg" />
            </div>
          </div>
        )}

        {/* Image / Title Header */}
        <CardHeader className="p-0 relative overflow-hidden">
          <AspectRatio ratio={1 / 1}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] p-8">
                <h3 className="text-2xl md:text-3xl font-black text-white text-center leading-tight drop-shadow-lg">
                  {product.title}
                  {product.artist_name && <span className="block text-xl mt-1 opacity-90">by {product.artist_name}</span>}
                </h3>
              </div>
            )}
          </AspectRatio>

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between z-20">
            {isNew && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-lg animate-pulse">
                NEW
              </Badge>
            )}
            {trackConfig && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("p-3 rounded-full shadow-xl", trackConfig.bg)}>
                    <trackConfig.Icon className={cn("h-6 w-6", trackConfig.color)} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="font-medium">{trackConfig.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        {/* Clickable Content Area */}
        <CardContent 
          className="flex-1 p-6 cursor-pointer space-y-4"
          onClick={() => onViewDetails(product)}
        >
          <div>
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
              {product.title}
            </h3>
            {product.artist_name && (
              <p className="text-sm text-gray-600 mt-1 flex items-center">
                <Music className="h-4 w-4 mr-1 text-[#EC4899]" />
                {product.artist_name}
              </p>
            )}
          </div>

          {/* Metadata Tags */}
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs font-medium">
                {product.category.replace('-', ' ')}
              </Badge>
            )}
            {product.vocal_ranges?.slice(0, 3).map((range) => (
              <Badge key={range} variant="outline" className="text-xs border-pink-300 text-pink-700">
                {range}
              </Badge>
            ))}
            {product.show_key_signature && product.key_signature && (
              <Badge variant="outline" className="text-xs">
                <Key className="h-3 w-3 mr-1" />
                {product.key_signature}
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {product.description}
          </p>
        </CardContent>

        {/* Footer with Price & Actions */}
        <CardFooter className="p-6 pt-0 space-y-4">
          {/* Price + Sample Play */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline">
              <span className="text-4xl font-black text-[#8B5CF6]">
                {product.currency}{product.price.toFixed(2)}
              </span>
              <span className="ml-2 text-sm text-gray-500">instant download</span>
            </div>

            {firstTrackUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handlePlayPause}
                    className={cn(
                      "rounded-full shadow-xl transition-all duration-300",
                      isPlaying
                        ? "bg-red-500 hover:bg-red-600 animate-pulse"
                        : "bg-gradient-to-r from-[#EC4899] to-[#F59E0B] hover:scale-110"
                    )}
                  >
                    {isPlaying ? (
                      <PauseCircle className="h-7 w-7" />
                    ) : (
                      <PlayCircle className="h-7 w-7" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPlaying ? "Pause preview" : "Play 10-second sample"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Buy Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBuyNow(product);
            }}
            disabled={isBuying}
            className="w-full h-14 text-lg font-bold rounded-xl shadow-2xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C4DFF] hover:to-[#EC4899] transition-all hover:shadow-3xl hover:scale-105"
          >
            {isBuying ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-3 h-6 w-6" />
                Buy Now & Download
              </>
            )}
          </Button>
        </CardFooter>

        {/* Hidden Audio Element */}
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