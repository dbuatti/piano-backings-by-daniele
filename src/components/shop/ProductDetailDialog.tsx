"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, ShoppingCart, Loader2, Theater, Key, Mic, Headphones, Sparkles, PlayCircle, PauseCircle, Link as LinkIcon, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { TrackInfo } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onBuyNow: (product: Product) => Promise<void>;
  isBuying: boolean;
}

const getTrackTypeIcon = (type: string | undefined) => {
  switch (type) {
    case 'quick':
      return { Icon: Mic, color: 'text-blue-500', tooltip: 'Quick Reference' };
    case 'one-take':
    case 'one-take-recording':
      return { Icon: Headphones, color: 'text-yellow-500', tooltip: 'One-Take Recording' };
    case 'polished':
      return { Icon: Sparkles, color: 'text-[#F538BC]', tooltip: 'Polished Backing' };
    default:
      return null;
  }
};

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  product, 
  onBuyNow, 
  isBuying 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const firstTrackUrl = product.track_urls && product.track_urls.length > 0 ? product.track_urls[0].url : null;
  const trackIcon = getTrackTypeIcon(product.track_type);

  // Reset audio state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handlePlayPause = () => {
    if (!audioRef.current || !firstTrackUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        timeoutRef.current = null;
      }, 10000) as unknown as number;
    }
  };

  const handleAudioEnded = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* Left Column: Image & Audio Player */}
          <div className="lg:w-1/2 p-6 bg-gray-50 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="relative mb-4">
              <AspectRatio ratio={16 / 9}>
                {/* Image or Placeholder */}
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title} 
                    className="w-full h-full object-cover rounded-lg shadow-md" 
                  />
                ) : (
                  <div 
                    className="flex items-center justify-center w-full h-full text-white p-4 text-center rounded-lg shadow-md"
                    style={{ backgroundColor: '#1C0357', fontFamily: '"Playfair Display", serif' }} // Dark primary color for contrast
                  >
                    <h3 className="text-3xl font-bold leading-snug">
                      {product.title}
                    </h3>
                  </div>
                )}
              </AspectRatio>
            </div>

            {/* Audio Player Section */}
            {firstTrackUrl && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow-inner border border-gray-200">
                <h4 className="text-lg font-semibold text-[#1C0357] mb-2 flex items-center">
                  <Music className="h-5 w-5 mr-2 text-[#F538BC]" /> Listen to Sample (10s)
                </h4>
                <div className="flex items-center space-x-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handlePlayPause}
                        className={cn(
                          "h-12 w-12 rounded-full transition-colors shadow-lg",
                          isPlaying 
                            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-fast" 
                            : "bg-[#D1AAF2] hover:bg-[#D1AAF2]/80 text-[#1C0357]"
                        )}
                      >
                        {isPlaying ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPlaying ? 'Pause Sample' : 'Play 10-sec Sample'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-sm text-gray-600">
                    {isPlaying ? 'Playing...' : 'Click to play sample'}
                  </p>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleAudioEnded} preload="none" className="hidden" />
              </div>
            )}
          </div>

          {/* Right Column: Details & CTA */}
          <div className="lg:w-1/2 p-6 flex flex-col overflow-y-auto">
            <DialogHeader className="mb-4 flex-shrink-0">
              <DialogTitle className="text-3xl font-extrabold text-[#1C0357] leading-tight">{product.title}</DialogTitle>
              {product.artist_name && (
                <DialogDescription className="text-xl text-gray-700 flex items-center mt-1">
                  <Theater className="h-5 w-5 mr-2 text-[#F538BC]" /> {product.artist_name}
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Metadata Badges */}
            <div className="flex flex-wrap gap-2 mb-4 border-b pb-4 flex-shrink-0">
              {/* Category */}
              {product.category && (
                <Badge className="bg-[#1C0357] text-white capitalize text-sm px-3 py-1 rounded-full font-semibold">
                  {product.category.replace('-', ' ')}
                </Badge>
              )}
              {/* Vocal Ranges */}
              {product.vocal_ranges && product.vocal_ranges.map(range => (
                <Badge key={range} variant="secondary" className="bg-white text-[#1C0357] border-2 border-[#D1AAF2] text-sm px-3 py-1 rounded-full font-medium">
                  {range}
                </Badge>
              ))}
              {/* Key Signature */}
              {product.show_key_signature && product.key_signature && (
                <Badge variant="outline" className="text-sm px-3 py-1 rounded-full border-gray-400 text-gray-700">
                  <Key className="h-4 w-4 mr-1" /> Key: {product.key_signature}
                </Badge>
              )}
              {/* Track Type */}
              {trackIcon && (
                <Badge className={cn("text-sm px-3 py-1 rounded-full font-medium", trackIcon.color, "bg-opacity-10")} style={{ borderColor: trackIcon.color }}>
                  <trackIcon.Icon className="h-4 w-4 mr-1" /> {trackIcon.tooltip}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="flex-1 overflow-y-auto pr-2 mb-4">
              <h4 className="text-xl font-semibold text-[#1C0357] mb-2">Description</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
              
              {/* Sheet Music Link */}
              {product.show_sheet_music_url && product.sheet_music_url && (
                <div className="mt-4">
                  <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" className="p-0 text-[#F538BC] hover:text-[#F538BC]/80">
                      <LinkIcon className="h-4 w-4 mr-2" /> View Sheet Music Link
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Sticky Footer CTA */}
            <div className="flex-shrink-0 pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-[#1C0357] mr-2" />
                  <span className="text-4xl font-extrabold text-[#1C0357]">{product.currency} {product.price.toFixed(2)}</span>
                </div>
              </div>
              <Button 
                onClick={() => onBuyNow(product)} 
                className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white w-full justify-center shadow-xl text-xl h-14"
                disabled={isBuying}
              >
                {isBuying ? (
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                  product.master_download_link ? (
                    <LinkIcon className="mr-2 h-6 w-6" />
                  ) : (
                    <ShoppingCart className="mr-2 h-6 w-6" />
                  )
                )}
                {isBuying ? 'Processing...' : `Buy Now (${product.currency} ${product.price.toFixed(2)})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;