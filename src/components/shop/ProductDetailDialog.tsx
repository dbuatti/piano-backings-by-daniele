"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, ShoppingCart, Link as LinkIcon, Loader2, Music, Theater, Key, PlayCircle, PauseCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_urls?: { url: string }[];
  artist_name?: string;
  category?: string;
  vocal_ranges?: string[];
  key_signature?: string | null;
  show_key_signature?: boolean;
  track_type?: string;
  sheet_music_url?: string | null;
  show_sheet_music_url?: boolean;
  master_download_link?: string | null;
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onBuyNow: (product: Product) => Promise<void>;
  isBuying: boolean;
}

const getTrackTypeBadge = (type?: string) => {
  switch (type) {
    case 'quick': return { text: 'Quick Reference', class: 'bg-blue-100 text-blue-700 border-blue-300' };
    case 'one-take':
    case 'one-take-recording': return { text: 'One-Take Recording', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'polished': return { text: 'Polished Backing', class: 'bg-pink-100 text-[#F538BC] border-pink-300' };
    default: return null;
  }
};

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  onOpenChange,
  product,
  onBuyNow,
  isBuying,
}) => {
  const firstTrackUrl = product.track_urls?.[0]?.url || null;
  const { isPlaying, togglePlay, audioRef, handleEnded } = useAudioPreview(firstTrackUrl);
  const trackBadge = getTrackTypeBadge(product.track_type);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBottomFade, setShowBottomFade] = useState(true);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // small tolerance
      setShowBottomFade(!isAtBottom);
    };

    scrollEl.addEventListener('scroll', handleScroll);
    handleScroll(); // initial check

    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[96vh] max-h-screen p-0 overflow-hidden rounded-none lg:rounded-2xl bg-white flex flex-col">
        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
          {/* Hero Image with Title Overlay */}
          <div className="relative">
            <AspectRatio ratio={16 / 9} className="w-full">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#1C0357] to-[#1C0357]/90">
                  <h1 className="text-5xl lg:text-7xl font-extrabold text-white text-center px-8 leading-tight font-serif">
                    {product.title}
                  </h1>
                </div>
              )}
            </AspectRatio>

            {/* Title overlay if image exists */}
            {product.image_url && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end">
                <h1 className="text-5xl lg:text-7xl font-extrabold text-white px-8 pb-12 leading-tight font-serif">
                  {product.title}
                </h1>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 lg:p-10 pb-32">
            <div className="max-w-3xl mx-auto space-y-10">
              {/* Artist */}
              {product.artist_name && (
                <p className="text-2xl lg:text-3xl text-gray-700 text-center lg:text-left flex items-center justify-center lg:justify-start gap-4">
                  <Theater className="h-8 w-8 text-[#F538BC]" />
                  {product.artist_name}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                {product.category && (
                  <Badge className="text-base px-6 py-3 bg-[#1C0357] text-white font-bold rounded-full">
                    {product.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
                {product.vocal_ranges?.map((range) => (
                  <Badge
                    key={range}
                    className="text-base px-5 py-3 bg-[#D1AAF2]/30 text-[#1C0357] border-2 border-[#D1AAF2] rounded-full font-medium"
                  >
                    {range}
                  </Badge>
                ))}
                {product.show_key_signature && product.key_signature && (
                  <Badge variant="outline" className="text-base px-5 py-3 rounded-full border-gray-400">
                    <Key className="h-5 w-5 mr-2" />
                    {product.key_signature}
                  </Badge>
                )}
                {trackBadge && (
                  <Badge className={cn("text-base px-5 py-3 rounded-full border-2 font-medium", trackBadge.class)}>
                    {trackBadge.text}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <div className="text-center lg:text-left">
                <h3 className="text-3xl font-bold text-[#1C0357] mb-6">Description</h3>
                <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>

              {/* Sheet Music */}
              {product.show_sheet_music_url && product.sheet_music_url && (
                <div className="text-center lg:text-left">
                  <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-[#F538BC] text-[#F538BC] hover:bg-[#F538BC] hover:text-white text-xl px-10 py-6 rounded-full font-semibold"
                    >
                      <LinkIcon className="mr-3 h-6 w-6" />
                      View Sheet Music
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Fade Overlay (Scroll Hint) */}
          {showBottomFade && (
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="bg-white border-t-4 border-[#D1AAF2]/50 shadow-2xl p-6">
          <div className="max-w-3xl mx-auto">
            {firstTrackUrl && (
              <div className="flex items-center justify-center gap-8 mb-6 pb-6 border-b border-gray-200">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      onClick={togglePlay}
                      className={cn(
                        "rounded-full w-24 h-24 shadow-2xl",
                        isPlaying ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#F538BC] hover:bg-[#F538BC]/90"
                      )}
                    >
                      {isPlaying ? <PauseCircle className="h-14 w-14" /> : <PlayCircle className="h-14 w-14" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isPlaying ? "Pause" : "Play 10-second sample"}</p></TooltipContent>
                </Tooltip>

                <div className="text-center">
                  <p className="text-2xl font-bold text-[#1C0357] flex items-center gap-3 justify-center">
                    <Music className="h-8 w-8 text-[#F538BC]" />
                    Audio Sample (10 seconds)
                  </p>
                  <p className="text-lg text-gray-600 mt-2">
                    {isPlaying ? "Playing..." : "Tap to preview"}
                  </p>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <DollarSign className="h-14 w-14 text-[#1C0357]" />
                <span className="text-6xl font-extrabold text-[#1C0357]">
                  {product.currency} {product.price.toFixed(2)}
                </span>
              </div>

              <Button
                onClick={() => onBuyNow(product)}
                disabled={isBuying}
                className="w-full sm:w-auto h-20 px-16 text-2xl font-bold bg-[#F538BC] hover:bg-[#F538BC]/90 shadow-2xl rounded-full"
              >
                {isBuying ? (
                  <> <Loader2 className="mr-4 h-8 w-8 animate-spin" /> Processing... </>
                ) : product.master_download_link ? (
                  <> <LinkIcon className="mr-4 h-8 w-8" /> Instant Download </>
                ) : (
                  <> <ShoppingCart className="mr-4 h-8 w-8" /> Buy Now </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;