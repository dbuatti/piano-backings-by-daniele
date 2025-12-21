"use client";

import React, { useRef, useState, useEffect } from 'react';
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
    case 'quick': return { text: 'Quick Reference', class: 'bg-blue-100 text-blue-700' };
    case 'one-take':
    case 'one-take-recording': return { text: 'One-Take', class: 'bg-yellow-100 text-yellow-700' };
    case 'polished': return { text: 'Polished', class: 'bg-pink-100 text-[#F538BC]' };
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
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const canScroll = el.scrollHeight > el.clientHeight;
      const notAtBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 20;
      setShowFade(canScroll && notAtBottom);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[95vh] max-h-screen p-0 overflow-hidden bg-white flex flex-col rounded-lg">
        {/* Hero Image + Title */}
        <div className="relative flex-shrink-0">
          <AspectRatio ratio={16 / 9}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1C0357] to-[#1C0357]/80 flex items-center justify-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white text-center px-8 font-serif">
                  {product.title}
                </h1>
              </div>
            )}
          </AspectRatio>

          {/* Overlay Title if image exists */}
          {product.image_url && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight font-serif">
                {product.title}
              </h1>
              {product.artist_name && (
                <p className="text-xl text-white/90 mt-2 flex items-center gap-3">
                  <Theater className="h-6 w-6" />
                  {product.artist_name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 relative">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Artist (if no image overlay) */}
            {!product.image_url && product.artist_name && (
              <p className="text-2xl text-center text-gray-700 flex items-center justify-center gap-3">
                <Theater className="h-7 w-7 text-[#F538BC]" />
                {product.artist_name}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-3">
              {product.category && (
                <Badge className="text-base px-5 py-2 bg-[#1C0357] text-white rounded-full font-medium">
                  {product.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
              {product.vocal_ranges?.map((range) => (
                <Badge key={range} className="text-base px-4 py-2 bg-[#D1AAF2]/30 text-[#1C0357] border border-[#D1AAF2] rounded-full">
                  {range}
                </Badge>
              ))}
              {product.show_key_signature && product.key_signature && (
                <Badge variant="outline" className="text-base px-4 py-2 rounded-full border-gray-400">
                  <Key className="h-5 w-5 mr-2" /> {product.key_signature}
                </Badge>
              )}
              {trackBadge && (
                <Badge className={cn("text-base px-4 py-2 rounded-full font-medium", trackBadge.class)}>
                  {trackBadge.text}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#1C0357] mb-4">Description</h3>
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Sheet Music */}
            {product.show_sheet_music_url && product.sheet_music_url && (
              <div className="text-center">
                <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-[#F538BC] text-[#F538BC] hover:bg-[#F538BC] hover:text-white text-lg px-8 py-4 rounded-full">
                    <LinkIcon className="mr-2 h-5 w-5" /> View Sheet Music
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* Scroll Fade Hint */}
          {showFade && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="border-t bg-white p-6 shadow-lg">
          <div className="max-w-2xl mx-auto">
            {firstTrackUrl && (
              <div className="flex items-center justify-center gap-6 mb-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      onClick={togglePlay}
                      className={cn(
                        "rounded-full w-20 h-20 shadow-xl",
                        isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-[#F538BC] hover:bg-[#F538BC]/90"
                      )}
                    >
                      {isPlaying ? <PauseCircle className="h-12 w-12" /> : <PlayCircle className="h-12 w-12" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlaying ? "Pause" : "Play 10-second sample"}</p>
                  </TooltipContent>
                </Tooltip>

                <div className="text-center">
                  <p className="text-xl font-bold text-[#1C0357] flex items-center gap-3">
                    <Music className="h-6 w-6 text-[#F538BC]" />
                    Audio Sample (10 seconds)
                  </p>
                  <p className="text-gray-600">Tap to listen</p>
                </div>

                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
              </div>
            )}

            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-10 w-10 text-[#1C0357]" />
                <span className="text-5xl font-extrabold text-[#1C0357]">
                  {product.currency}{product.price.toFixed(2)}
                </span>
              </div>

              <Button
                onClick={() => onBuyNow(product)}
                disabled={isBuying}
                className="h-16 px-10 text-xl font-bold bg-[#F538BC] hover:bg-[#F538BC]/90 rounded-full shadow-xl"
              >
                {isBuying ? (
                  <> <Loader2 className="mr-3 h-7 w-7 animate-spin" /> Processing... </>
                ) : (
                  <> <ShoppingCart className="mr-3 h-7 w-7" /> Buy Now </>
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