"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, PlayCircle, PauseCircle, Link as LinkIcon, ShoppingCart, Loader2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { isWithinInterval, subDays } from 'date-fns';
import { useAudioPreview } from '@/hooks/useAudioPreview';

interface ProductCardProps {
  product: any;
  onViewDetails: (product: any) => void;
  onBuyNow: (product: any) => Promise<void>;
  isBuying: boolean;
}

const getTrackTypeIcon = (type?: string) => {
  switch (type) {
    case 'quick': return { Icon: () => <span className="text-blue-500">🎤</span>, tooltip: 'Quick Reference' };
    case 'one-take': case 'one-take-recording': return { Icon: () => <span className="text-yellow-500">🎧</span>, tooltip: 'One-Take Recording' };
    case 'polished': return { Icon: () => <span className="text-[#F538BC]">✨</span>, tooltip: 'Polished Backing' };
    default: return null;
  }
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  const firstTrackUrl = product.track_urls?.[0]?.url || null;
  const { isPlaying, togglePlay, audioRef, handleEnded, hasAudio } = useAudioPreview(firstTrackUrl);
  const trackIcon = getTrackTypeIcon(product.track_type);
  const isNew = isWithinInterval(new Date(product.created_at), { start: subDays(new Date(), 7), end: new Date() });

  return (
    <Card className="group flex flex-col overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 h-full border-2 border-transparent hover:border-[#F538BC]/50 bg-white">
      <CardHeader className="p-0 relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
          ) : (
            <div className="flex items-center justify-center h-full bg-[#1C0357] text-white p-6 text-center">
              <h3 className="text-2xl font-bold leading-tight font-serif">{product.title}</h3>
            </div>
          )}
        </AspectRatio>

        {trackIcon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-lg">
                <trackIcon.Icon />
              </div>
            </TooltipTrigger>
            <TooltipContent>{trackIcon.tooltip}</TooltipContent>
          </Tooltip>
        )}

        {isNew && (
          <Badge className="absolute top-3 left-3 bg-yellow-400 text-black font-bold animate-pulse">
            NEW
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-5 cursor-pointer" onClick={() => onViewDetails(product)}>
        <h3 className="text-xl font-extrabold text-[#1C0357] mb-1 line-clamp-2">{product.title}</h3>
        {product.artist_name && (
          <p className="text-gray-700 flex items-center gap-2 mb-3">
            <Music className="h-4 w-4 text-[#F538BC]" />
            {product.artist_name}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {product.category && (
            <Badge className="bg-[#1C0357] text-white text-xs">{product.category.replace('-', ' ')}</Badge>
          )}
          {product.vocal_ranges?.map((range: string) => (
            <Badge key={range} variant="outline" className="border-[#D1AAF2] text-[#1C0357] text-xs">
              {range}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-gray-600 line-clamp-3 flex-1">{product.description}</p>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-baseline">
            <DollarSign className="h-7 w-7 text-[#F538BC]" />
            <span className="text-3xl font-extrabold text-[#1C0357]">{product.currency} {product.price.toFixed(2)}</span>
          </div>

          {hasAudio && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className={cn("rounded-full shadow-md", isPlaying && "bg-red-500 hover:bg-red-600 text-white animate-pulse")}
                  aria-label={isPlaying ? "Pause sample" : "Play 10-second sample"}
                >
                  {isPlaying ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6 text-[#F538BC]" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? "Pause" : "Play 10s sample"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>

      {hasAudio && <audio ref={audioRef} src={firstTrackUrl!} onEnded={handleEnded} preload="none" />}

      <CardFooter className="p-5 pt-0">
        <Button
          onClick={() => onBuyNow(product)}
          disabled={isBuying}
          className="w-full h-12 text-lg font-semibold bg-[#F538BC] hover:bg-[#F538BC]/90 shadow-xl"
        >
          {isBuying ? (
            <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing... </>
          ) : product.master_download_link ? (
            <> <LinkIcon className="mr-2 h-5 w-5" /> Instant Download </>
          ) : (
            <> <ShoppingCart className="mr-2 h-5 w-5" /> Buy Now ({product.currency} {product.price.toFixed(2)}) </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;