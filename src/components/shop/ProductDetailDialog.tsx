"use client";

import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, ShoppingCart, Link as LinkIcon, Loader2, Music, Theater, Key, PlayCircle, PauseCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { cn } from "@/lib/utils";

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onBuyNow: (product: any) => Promise<void>;
  isBuying: boolean;
}

const getTrackTypeBadge = (type?: string) => {
  switch (type) {
    case 'quick': return { text: 'Quick Reference', color: 'bg-blue-100 text-blue-700 border-blue-300' };
    case 'one-take': case 'one-take-recording': return { text: 'One-Take Recording', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    case 'polished': return { text: 'Polished Backing', color: 'bg-pink-100 text-[#F538BC] border-pink-300' };
    default: return null;
  }
};

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen, onOpenChange, product, onBuyNow, isBuying
}) => {
  const firstTrackUrl = product.track_urls?.[0]?.url || null;
  const { isPlaying, togglePlay, audioRef, handleEnded } = useAudioPreview(firstTrackUrl);
  const trackBadge = getTrackTypeBadge(product.track_type);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden rounded-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
          {/* Left: Image + Player */}
          <div className="bg-gradient-to-br from-[#1C0357]/5 to-[#D1AAF2]/20 p-8 flex flex-col">
            <AspectRatio ratio={16 / 9} className="rounded-xl overflow-hidden shadow-2xl">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center bg-[#1C0357] text-white">
                  <h2 className="text-4xl font-bold text-center px-8 font-serif">{product.title}</h2>
                </div>
              )}
            </AspectRatio>

            {firstTrackUrl && (
              <div className="mt-8 bg-white rounded-xl shadow-xl p-6 border">
                <h4 className="text-xl font-bold text-[#1C0357] mb-4 flex items-center gap-3">
                  <Music className="h-6 w-6 text-[#F538BC]" />
                  Audio Sample (10 seconds)
                </h4>
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={togglePlay}
                    className={cn(
                      "rounded-full w-16 h-16 shadow-xl",
                      isPlaying ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#F538BC] hover:bg-[#F538BC]/90"
                    )}
                  >
                    {isPlaying ? <PauseCircle className="h-8 w-8" /> : <PlayCircle className="h-8 w-8" />}
                  </Button>
                  <span className="text-lg text-gray-700 font-medium">
                    {isPlaying ? "Playing sample..." : "Play 10-second preview"}
                  </span>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="p-8 lg:p-10 flex flex-col overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-extrabold text-[#1C0357] leading-tight">{product.title}</h1>
                {product.artist_name && (
                  <p className="text-2xl text-gray-700 mt-2 flex items-center gap-3">
                    <Theater className="h-6 w-6 text-[#F538BC]" />
                    {product.artist_name}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {product.category && (
                  <Badge className="text-sm px-4 py-1.5 bg-[#1C0357] text-white font-semibold">
                    {product.category.replace('-', ' ')}
                  </Badge>
                )}
                {product.vocal_ranges?.map((range: string) => (
                  <Badge key={range} className="text-sm px-4 py-1.5 bg-[#D1AAF2]/30 text-[#1C0357] border border-[#D1AAF2]">
                    {range}
                  </Badge>
                ))}
                {product.show_key_signature && product.key_signature && (
                  <Badge variant="outline" className="text-sm px-4 py-1.5">
                    <Key className="h-4 w-4 mr-2" /> {product.key_signature}
                  </Badge>
                )}
                {trackBadge && (
                  <Badge className={cn("text-sm px-4 py-1.5 border", trackBadge.color)}>
                    {trackBadge.text}
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-[#1C0357] mb-3">Description</h3>
                <p className="text-lg text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
              </div>

              {product.show_sheet_music_url && product.sheet_music_url && (
                <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4">
                  <Button variant="outline" className="border-[#F538BC] text-[#F538BC] hover:bg-[#F538BC] hover:text-white">
                    <LinkIcon className="mr-2 h-5 w-5" /> View Sheet Music
                  </Button>
                </a>
              )}
            </div>

            <div className="mt-auto pt-8 border-t-2 border-[#D1AAF2]/50">
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
                  <> <Loader2 className="mr-3 h-7 w-7 animate-spin" /> Processing Purchase... </>
                ) : product.master_download_link ? (
                  <> <LinkIcon className="mr-3 h-7 w-7" /> Instant Download Now </>
                ) : (
                  <> <ShoppingCart className="mr-3 h-7 w-7" /> Buy Now – {product.currency} {product.price.toFixed(2)} </>
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