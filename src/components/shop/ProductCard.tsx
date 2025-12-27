"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Play, Pause, ShoppingCart, Loader2, Music, Sparkles, Headphones, Mic2, Key, Theater } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"; // Added TooltipProvider
import { isWithinInterval, subDays } from 'date-fns';
import { useAudioPreview } from '@/hooks/useAudioPreview';

interface ProductCardProps {
  product: any;
  onViewDetails: (product: any) => void;
  onBuyNow: (product: any) => Promise<void>;
  isBuying: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  const firstTrackUrl = product.track_urls?.[0]?.url || null;
  const { isPlaying, togglePlay, audioRef, handleEnded, hasAudio } = useAudioPreview(firstTrackUrl);
  const isNew = isWithinInterval(new Date(product.created_at), { start: subDays(new Date(), 14), end: new Date() });

  const getQualityBadge = (type?: string) => {
    switch (type) {
      case 'quick': 
        return { 
          label: 'Quick Ref', 
          icon: Mic2, 
          class: 'bg-blue-500/10 text-blue-600 border-blue-200/50 backdrop-blur-md',
          desc: 'Fast reference voice memo'
        };
      case 'one-take': 
        return { 
          label: 'One-Take', 
          icon: Headphones, 
          class: 'bg-amber-500/10 text-amber-700 border-amber-200/50 backdrop-blur-md',
          desc: 'Single-pass authentic recording'
        };
      case 'polished': 
        return { 
          label: 'Polished', 
          icon: Sparkles, 
          class: 'bg-[#F538BC]/10 text-[#F538BC] border-[#F538BC]/20 backdrop-blur-md',
          desc: 'Studio-grade multi-layer mix'
        };
      default: 
        return { label: 'Standard', icon: Music, class: 'bg-gray-100 text-gray-700', desc: '' };
    }
  };

  const quality = getQualityBadge(product.track_type);

  return (
    <Card className="group flex flex-col overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 h-full bg-white rounded-2xl">
      <CardHeader className="p-0 relative overflow-hidden bg-[#1C0357]">
        <AspectRatio ratio={2.2 / 1}>
          {product.image_url ? (
            <>
              <img 
                src={product.image_url} 
                alt={product.title} 
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#1C0357] via-[#2D0B8C] to-[#D1AAF2]/40 text-white p-6">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            </div>
          )}
        </AspectRatio>

        <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-20">
          {isNew && (
            <Badge className="bg-[#F538BC] text-white border-none text-[10px] font-black h-6 px-2 shadow-lg">
              NEW
            </Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("border px-2 py-0.5 text-[10px] font-bold uppercase h-6 shadow-sm", quality.class)}>
                  <quality.icon size={12} className="mr-1.5" />
                  {quality.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{quality.desc}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {hasAudio && (
          <div className="absolute bottom-3 right-3 z-30">
            <Button
              size="icon"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className={cn(
                "rounded-full shadow-2xl transition-all transform hover:scale-110 h-10 w-10 border-2",
                isPlaying 
                  ? "bg-red-500 border-red-400 text-white animate-pulse" 
                  : "bg-white/95 border-white text-[#1C0357] hover:bg-white"
              )}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-1" fill="currentColor" />}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-5 space-y-4 cursor-pointer" onClick={() => onViewDetails(product)}>
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-[#1C0357] leading-tight line-clamp-2 group-hover:text-[#F538BC] transition-colors duration-300">
            {product.title}
          </h3>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-[#F538BC]/10">
              <Theater size={12} className="text-[#F538BC]" />
            </div>
            <p className="text-xs font-bold text-gray-500 truncate">
              {product.artist_name || 'Various Artists'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {product.key_signature && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-gray-200 bg-gray-50/50 text-gray-600 font-bold">
              <Key size={10} className="mr-1.5 text-gray-400" /> {product.key_signature}
            </Badge>
          )}
          {product.vocal_ranges?.slice(0, 2).map((range: string) => (
            <Badge key={range} variant="secondary" className="bg-[#D1AAF2]/10 text-[#1C0357] text-[10px] px-2 py-0.5 border-none font-bold">
              {range}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed h-10 italic">
          {product.description}
        </p>

        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-baseline text-[#1C0357]">
            <span className="text-sm font-black mr-0.5">$</span>
            <span className="text-2xl font-black tracking-tighter">{product.price.toFixed(2)}</span>
            <span className="ml-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">{product.currency}</span>
          </div>
        </div
      </CardContent>

      {hasAudio && <audio ref={audioRef} src={firstTrackUrl!} onEnded={handleEnded} preload="none" />}

      <CardFooter className="px-5 pb-5 pt-0">
        <Button
          onClick={() => onBuyNow(product)}
          disabled={isBuying}
          className="w-full h-11 text-sm font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-xl group/btn shadow-xl shadow-[#1C0357]/10 active:scale-[0.98] transition-all"
        >
          {isBuying ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              Instant Purchase
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;