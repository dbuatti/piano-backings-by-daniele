"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  FileText,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { TrackInfo } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

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

const getTrackTypeConfig = (type?: string) => {
  switch (type) {
    case 'quick':
      return { Icon: Mic, color: 'text-blue-600', bg: 'bg-blue-100', tooltip: 'Quick Reference – Fast voice memo for learning' };
    case 'one-take':
      return { Icon: Headphones, color: 'text-amber-600', bg: 'bg-amber-100', tooltip: 'One-Take – Authentic live recording' };
    case 'polished':
      return { Icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-100', tooltip: 'Polished – Professionally refined track' };
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const firstTrackUrl = product.track_urls?.[0]?.url || null;
  const trackConfig = getTrackTypeConfig(product.track_type);

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handlePlayPause = () => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl w-full h-[95dvh] p-0 overflow-hidden rounded-2xl border-0 shadow-3xl flex flex-col"
      >
        <TooltipProvider>
          <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
            
            {/* Left Column: Image + Preview */}
            {/* Added h-full to ensure it respects the parent's height */}
            <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-b from-[#8B5CF6]/5 via-transparent to-transparent">
              <div className="p-6 lg:p-8 pb-4">
                <AspectRatio ratio={1 / 1} className="overflow-hidden rounded-2xl shadow-2xl">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="object-cover w-full h-full transition-transform duration-700 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] p-10">
                      <h2 className="text-3xl lg:text-5xl font-black text-white text-center leading-tight drop-shadow-2xl">
                        {product.title}
                      </h2>
                      {product.artist_name && (
                        <p className="mt-4 text-xl lg:text-2xl font-medium text-white/90">
                          by {product.artist_name}
                        </p>
                      )}
                    </div>
                  )}
                </AspectRatio>
              </div>

              {firstTrackUrl && (
                <div className="px-6 lg:px-8 pb-8 pt-4">
                  <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 lg:p-8 shadow-2xl border border-white/50">
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-5 flex items-center">
                      <PlayCircle className="h-7 w-7 mr-3 text-[#EC4899]" />
                      Listen to Preview
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <Button
                        size="lg"
                        onClick={handlePlayPause}
                        className={cn(
                          "rounded-full shadow-2xl transition-all flex-shrink-0",
                          "h-16 w-16 sm:h-20 sm:w-20",
                          isPlaying
                            ? "bg-red-500 hover:bg-red-600 animate-pulse"
                            : "bg-gradient-to-r from-[#EC4899] to-[#F59E0B] hover:scale-110"
                        )}
                      >
                        {isPlaying ? (
                          <PauseCircle className="h-10 w-10 sm:h-12 sm:w-12" />
                        ) : (
                          <PlayCircle className="h-10 w-10 sm:h-12 sm:w-12" />
                        )}
                      </Button>
                      <div className="text-center sm:text-left">
                        <p className="text-base lg:text-lg font-medium text-gray-800">
                          {isPlaying ? "Playing 10-second sample..." : "Play 10-second preview"}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Full high-quality track instantly after purchase
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Details + Sticky CTA */}
            <div className="flex flex-col h-full min-h-0">
              {/* Scrollable Details */}
              {/* Removed pb-32 and added flex-shrink-0 to the sticky footer to ensure it doesn't shrink */}
              <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8"> 
                <div className="mb-8">
                  <h1 className="text-3xl lg:text-5xl font-black text-gray-900 leading-tight">
                    {product.title}
                  </h1>
                  {product.artist_name && (
                    <p className="text-xl lg:text-2xl text-gray-700 mt-3 flex items-center">
                      <Music className="h-6 w-6 mr-3 text-[#EC4899]" />
                      {product.artist_name}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mb-8">
                  {product.category && (
                    <Badge className="text-sm px-4 py-2 bg-purple-100 text-purple-800 font-medium">
                      {product.category.replace('-', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {product.vocal_ranges?.map((range) => (
                    <Badge key={range} variant="outline" className="text-sm px-4 py-2 border-pink-300 text-pink-700">
                      {range}
                    </Badge>
                  ))}
                  {product.show_key_signature && product.key_signature && (
                    <Badge variant="outline" className="text-sm px-4 py-2">
                      <Key className="h-4 w-4 mr-2" />
                      {product.key_signature}
                    </Badge>
                  )}
                  {trackConfig && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={cn("text-sm px-4 py-2 font-medium", trackConfig.bg, trackConfig.color)}>
                          <trackConfig.Icon className="h-5 w-5 mr-2" />
                          {trackConfig.tooltip.split(' – ')[0]}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{trackConfig.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <Separator className="my-8" />

                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">About This Track</h3>
                  <p className="text-base lg:text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>

                  {product.show_sheet_music_url && product.sheet_music_url && (
                    <div className="mt-8">
                      <Button asChild variant="outline" size="lg" className="w-full px-8 py-6 text-lg rounded-xl border-2">
                        <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-3 h-6 w-6" />
                          View Sheet Music (PDF)
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Bottom CTA - Fixed height, flex-shrink-0 */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-6 lg:px-12 py-6 shadow-2xl flex-shrink-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <p className="text-4xl lg:text-5xl font-black text-[#8B5CF6]">
                      {product.currency}{product.price.toFixed(2)}
                    </p>
                    <p className="text-gray-600 mt-2 text-base lg:text-lg">
                      Instant download • High-quality MP3 • Lifetime access
                    </p>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => onBuyNow(product)}
                    disabled={isBuying}
                    className="w-full sm:w-auto px-10 py-7 text-lg lg:text-xl font-bold rounded-2xl shadow-2xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C4DFF] hover:to-[#EC4899] hover:shadow-3xl hover:scale-105 transition-all"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-3 h-6 w-6" />
                        Buy Now & Download Instantly
                      </>
                    )}
                  </Button>
                </div>
              </div>
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
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;