"use client";

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, Eye, ShoppingCart, Loader2, Theater, Key, Mic, Headphones, Sparkles, PlayCircle, PauseCircle, Link as LinkIcon, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { TrackInfo } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const handlePlayPause = () => {
    if (!audioRef.current || !product.track_urls || product.track_urls.length === 0) return;

    if (isPlaying) {
      // Pause immediately
      audioRef.current.pause();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playing from the beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);

      // Set timeout to stop after 10 seconds
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0; // Reset for next play
        }
        setIsPlaying(false);
        timeoutRef.current = null;
      }, 10000) as unknown as number; // Explicitly cast to number
    }
  };

  const handleAudioEnded = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
  };
  
  const getTrackTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'quick':
        return { Icon: Mic, color: 'text-blue-500', tooltip: 'Quick Reference' };
      case 'one-take':
      case 'one-take-recording': // Ensure consistency
        return { Icon: Headphones, color: 'text-yellow-500', tooltip: 'One-Take Recording' };
      case 'polished':
        return { Icon: Sparkles, color: 'text-[#F538BC]', tooltip: 'Polished Backing' };
      default:
        return null;
    }
  };

  const trackIcon = getTrackTypeIcon(product.track_type);
  const firstTrackUrl = product.track_urls && product.track_urls.length > 0 ? product.track_urls[0].url : null;

  // Logic for "NEW" badge
  const isNew = isWithinInterval(new Date(product.created_at), {
    start: subDays(new Date(), 7),
    end: new Date(),
  });

  return (
    <Card className="group flex flex-col overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full border-2 border-transparent hover:border-[#F538BC] bg-white min-h-[400px]">
      
      {/* Content Area (Clickable for Details) */}
      <CardContent 
        className="flex-1 p-4 bg-white text-left flex flex-col cursor-pointer relative" // Added relative
        onClick={() => onViewDetails(product)}
      >
        {/* Top Left: NEW Badge */}
        {isNew && (
          <Badge className="absolute top-4 left-4 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse-slow z-10">NEW</Badge>
        )}
        
        {/* Top Right: Wishlist Icon (Placeholder) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-10 p-0 h-8 w-8 text-gray-400 hover:text-[#F538BC] transition-colors"
              onClick={(e) => { e.stopPropagation(); console.log("Wishlist feature coming soon!"); }}
            >
              <Heart className="h-5 w-5 fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save to Wishlist</p>
          </TooltipContent>
        </Tooltip>

        {/* Track Type Icon (Moved slightly down to avoid conflict with Wishlist) */}
        {trackIcon && (
          <div className="absolute top-14 right-4 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "p-2 rounded-full bg-[#1C0357]/80 shadow-lg text-white",
                )}>
                  <trackIcon.Icon className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{trackIcon.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <CardTitle className="text-xl font-bold text-[#1C0357] leading-tight mb-1 mt-10">{product.title}</CardTitle>
        {product.artist_name && (
          <p className="text-sm text-gray-700 mb-3 leading-tight flex items-center">
            <Theater className="h-4 w-4 mr-2 text-gray-500" /> {product.artist_name}
          </p>
        )}
        
        {/* Info Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.category && (
            <Badge 
              variant="default" 
              className="bg-[#1C0357] text-white capitalize text-xs px-2 py-0.5 rounded-full font-semibold"
            >
              {product.category.replace('-', ' ')}
            </Badge>
          )}
          {/* Vocal Ranges - Use high contrast colors for better accessibility */}
          {product.vocal_ranges && product.vocal_ranges.length > 0 && product.vocal_ranges.map(range => (
            <Badge 
              key={range} 
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                range === 'Soprano' && 'bg-pink-100 text-pink-800 border border-pink-300',
                range === 'Alto' && 'bg-purple-100 text-purple-800 border border-purple-300',
                range === 'Tenor' && 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                range === 'Bass' && 'bg-blue-100 text-blue-800 border border-blue-300',
              )}
            >
              {range}
            </Badge>
          ))}
          {product.show_key_signature && product.key_signature && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-gray-400 text-gray-700">
              <Key className="h-3 w-3 mr-1" /> {product.key_signature}
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">{product.description}</p>
        
        {/* Price and Play Button */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-[#1C0357] mr-1" />
            <span className="text-xl font-medium text-gray-600 mr-1">{product.currency}</span>
            <span className="text-3xl font-extrabold text-[#1C0357]">{product.price.toFixed(2)}</span>
          </div>
          {firstTrackUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} // Stop propagation
                  className={cn(
                    "h-10 w-10 rounded-full transition-colors shadow-md",
                    isPlaying 
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-fast" 
                      : "bg-[#F538BC] hover:bg-[#F538BC]/90 text-white"
                  )}
                >
                  {isPlaying ? <PauseCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                  <span className="sr-only">{isPlaying ? 'Pause Sample' : 'Play Sample'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? 'Pause Sample' : 'Preview Track (10s)'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {firstTrackUrl && (
          <audio ref={audioRef} src={firstTrackUrl} onEnded={handleAudioEnded} preload="none" className="hidden" />
        )}
      </CardContent>
      
      {/* CardFooter - Only for Buy Now Action (Primary Action) */}
      <CardFooter className="p-4 border-t bg-[#D1AAF2]/30 flex flex-col gap-2 w-full transition-colors duration-300 group-hover:bg-[#D1AAF2]/50">
        <Button 
          onClick={() => onBuyNow(product)} 
          className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white w-full justify-center shadow-lg text-lg h-12"
          disabled={isBuying}
        >
          {isBuying ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            product.master_download_link ? (
              <LinkIcon className="mr-2 h-5 w-5" />
            ) : (
              <ShoppingCart className="mr-2 h-5 w-5" />
            )
          )}
          {isBuying ? 'Processing...' : `Buy Now (${product.currency} ${product.price.toFixed(2)})`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;