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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-full max-h-[96vh] p-0 overflow-hidden rounded-lg bg-white">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left Side: Image + Audio Player */}
          <div className="w-full lg:w-1/2 bg-gradient-to-br from-[#D1AAF2]/20 via-white to-[#F1E14F]/5 flex flex-col">
            <div className="p-6 lg:p-8 flex flex-col h-full">
              {/* Image */}
              <div className="flex-1 mb-6">
                <AspectRatio ratio={16 / 9} className="rounded-xl overflow-hidden shadow-2xl">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-[#1C0357] text-white p-8">
                      <h2 className="text-3xl lg:text-4xl font-bold text-center font-serif leading-tight">
                        {product.title}
                      </h2>
                    </div>
                  )}
                </AspectRatio>
              </div>

              {/* Audio Player */}
              {firstTrackUrl && (
                <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
                  <h4 className="text-xl font-bold text-[#1C0357] mb-4 flex items-center gap-3">
                    <Music className="h-6 w-6 text-[#F538BC]" />
                    Audio Sample (10 seconds)
                  </h4>
                  <div className="flex items-center gap-5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          onClick={togglePlay}
                          className={cn(
                            "rounded-full w-16 h-16 shadow-xl transition-all",
                            isPlaying
                              ? "bg-red-500 hover:bg-red-600 animate-pulse"
                              : "bg-[#F538BC] hover:bg-[#F538BC]/90"
                          )}
                        >
                          {isPlaying ? (
                            <PauseCircle className="h-9 w-9" />
                          ) : (
                            <PlayCircle className="h-9 w-9" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isPlaying ? "Pause" : "Play 10-second sample"}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-lg text-gray-700 font-medium">
                      {isPlaying ? "Playing sample..." : "Tap to play preview"}
                    </span>
                  </div>
                  <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Details (Scrollable on Mobile) */}
          <div className="w-full lg:w-1/2 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin scrollbar-thumb-[#D1AAF2] scrollbar-track-transparent">
              <div className="max-w-lg mx-auto lg:mx-0 space-y-8">
                {/* Title & Artist */}
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-[#1C0357] leading-tight">
                    {product.title}
                  </h1>
                  {product.artist_name && (
                    <p className="text-xl lg:text-2xl text-gray-700 mt-3 flex items-center gap-3">
                      <Theater className="h-7 w-7 text-[#F538BC]" />
                      {product.artist_name}
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-3">
                  {product.category && (
                    <Badge className="text-sm px-4 py-2 bg-[#1C0357] text-white font-semibold rounded-full">
                      {product.category.replace('-', ' ')}
                    </Badge>
                  )}
                  {product.vocal_ranges?.map((range) => (
                    <Badge
                      key={range}
                      className="text-sm px-4 py-2 bg-[#D1AAF2]/30 text-[#1C0357] border border-[#D1AAF2] rounded-full"
                    >
                      {range}
                    </Badge>
                  ))}
                  {product.show_key_signature && product.key_signature && (
                    <Badge variant="outline" className="text-sm px-4 py-2 rounded-full">
                      <Key className="h-4 w-4 mr-2" />
                      {product.key_signature}
                    </Badge>
                  )}
                  {trackBadge && (
                    <Badge className={cn("text-sm px-4 py-2 rounded-full border", trackBadge.class)}>
                      {trackBadge.text}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-2xl font-bold text-[#1C0357] mb-4">Description</h3>
                  <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>

                {/* Sheet Music Link */}
                {product.show_sheet_music_url && product.sheet_music_url && (
                  <a
                    href={product.sheet_music_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button
                      variant="outline"
                      className="border-[#F538BC] text-[#F538BC] hover:bg-[#F538BC] hover:text-white text-lg px-6 py-3"
                    >
                      <LinkIcon className="mr-3 h-5 w-5" />
                      View Sheet Music
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Sticky Bottom CTA */}
            <div className="p-6 lg:p-10 border-t-2 border-[#D1AAF2]/30 bg-white">
              <div className="max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-10 w-10 text-[#1C0357]" />
                    <span className="text-5xl font-extrabold text-[#1C0357]">
                      {product.currency} {product.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => onBuyNow(product)}
                  disabled={isBuying}
                  className="w-full h-16 text-xl font-bold bg-[#F538BC] hover:bg-[#F538BC]/90 shadow-2xl"
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                      Processing...
                    </>
                  ) : product.master_download_link ? (
                    <>
                      <LinkIcon className="mr-3 h-7 w-7" />
                      Instant Download
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-3 h-7 w-7" />
                      Buy Now – {product.currency} {product.price.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;