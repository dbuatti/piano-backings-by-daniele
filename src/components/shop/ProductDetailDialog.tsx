"use client";

import React from 'react';
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
    case 'quick': return { text: 'Quick Reference', class: 'bg-blue-500/20 text-blue-300 border-blue-500/50' };
    case 'one-take':
    case 'one-take-recording': return { text: 'One-Take Recording', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' };
    case 'polished': return { text: 'Polished Backing', class: 'bg-pink-500/20 text-[#F538BC] border-pink-500/50' };
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[96vh] p-0 overflow-hidden bg-[#1C0357] text-white flex flex-col">
        {/* Hero Section */}
        <div className="relative flex-shrink-0">
          <AspectRatio ratio={16 / 9} className="w-full">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover brightness-50"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1C0357] to-black" />
            )}
          </AspectRatio>

          {/* Title Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-center px-8 leading-tight tracking-tight font-serif drop-shadow-2xl">
              {product.title}
            </h1>
          </div>
        </div>

        {/* Scrollable Details */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#1C0357]/80 to-[#1C0357] px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Artist */}
            {product.artist_name && (
              <p className="text-2xl md:text-3xl text-center flex items-center justify-center gap-4 opacity-90">
                <Theater className="h-8 w-8 text-[#F538BC]" />
                {product.artist_name}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-4">
              {product.category && (
                <Badge className="text-lg px-6 py-3 bg-white/10 text-white border-white/20 backdrop-blur">
                  {product.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
              {product.vocal_ranges?.map((range) => (
                <Badge
                  key={range}
                  className="text-lg px-5 py-3 bg-[#D1AAF2]/20 text-[#D1AAF2] border-[#D1AAF2]/50 backdrop-blur"
                >
                  {range}
                </Badge>
              ))}
              {product.show_key_signature && product.key_signature && (
                <Badge variant="outline" className="text-lg px-5 py-3 border-white/30 text-white/90 backdrop-blur">
                  <Key className="h-5 w-5 mr-2" />
                  {product.key_signature}
                </Badge>
              )}
              {trackBadge && (
                <Badge className={cn("text-lg px-5 py-3 border backdrop-blur", trackBadge.class)}>
                  {trackBadge.text}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-3xl font-bold mb-6">Description</h3>
              <p className="text-xl leading-relaxed opacity-90 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Sheet Music */}
            {product.show_sheet_music_url && product.sheet_music_url && (
              <div className="text-center">
                <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-[#F538BC] text-[#F538BC] hover:bg-[#F538BC] hover:text-white text-xl px-10 py-6 rounded-full backdrop-blur"
                  >
                    <LinkIcon className="mr-3 h-6 w-6" />
                    View Sheet Music
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="bg-black/50 backdrop-blur-xl border-t border-white/10 p-6">
          <div className="max-w-3xl mx-auto">
            {firstTrackUrl && (
              <div className="flex items-center justify-center gap-6 mb-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      onClick={togglePlay}
                      className={cn(
                        "rounded-full w-20 h-20 shadow-2xl",
                        isPlaying ? "bg-red-600/80 hover:bg-red-600" : "bg-[#F538BC] hover:bg-[#F538BC]/90"
                      )}
                    >
                      {isPlaying ? <PauseCircle className="h-12 w-12" /> : <PlayCircle className="h-12 w-12" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-black text-white">
                    <p>{isPlaying ? "Pause preview" : "Play 10-second sample"}</p>
                  </TooltipContent>
                </Tooltip>

                <div className="text-center flex-1">
                  <p className="text-xl font-bold flex items-center justify-center gap-3">
                    <Music className="h-7 w-7 text-[#F538BC]" />
                    Audio Sample (10 seconds)
                  </p>
                  <p className="text-lg opacity-80 mt-1">
                    {isPlaying ? "Playing..." : "Tap to listen"}
                  </p>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DollarSign className="h-12 w-12" />
                <span className="text-5xl md:text-6xl font-extrabold">
                  {product.currency} {product.price.toFixed(2)}
                </span>
              </div>

              <Button
                onClick={() => onBuyNow(product)}
                disabled={isBuying}
                className="h-16 px-12 text-2xl font-bold bg-[#F538BC] hover:bg-[#F538BC]/90 shadow-2xl rounded-full"
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