"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, Play, Pause, ShoppingCart, Loader2, Music, Sparkles, Headphones, Mic2, Key } from 'lucide-react';
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
          class: 'bg-blue-100 text-blue-700 border-blue-200',
          desc: 'Fast reference voice memo'
        };
      case 'one-take': 
        return { 
          label: 'One-Take', 
          icon: Headphones, 
          class: 'bg-amber-100 text-amber-700 border-amber-200',
          desc: 'Single-pass authentic recording'
        };
      case 'polished': 
        return { 
          label: 'Polished', 
          icon: Sparkles, 
          class: 'bg-pink-100 text-[#F538BC] border-pink-200',
          desc: 'Studio-grade multi-layer mix'
        };
      default: 
        return { label: 'Standard', icon: Music, class: 'bg-gray-100 text-gray-700', desc: '' };
    }
  };

  const quality = getQualityBadge(product.track_type);

  return (
    <Card className="group flex flex-col overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 h-full bg-white rounded-xl">
      <CardHeader className="p-0 relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-[#1C0357] text-white p-6 text-center">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/music.png')]" />
              <h3 className="text-xl font-bold leading-tight relative z-10">{product.title}</h3>
            </div>
          )}
        </AspectRatio>

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-[#F538BC] text-white border-none text-[10px] font-bold">
              NEW
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={cn("backdrop-blur-md border px-2 py-0.5 text-[10px] font-bold uppercase", quality.class)}>
                <quality.icon size={10} className="mr-1" />
                {quality.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{quality.desc}</TooltipContent>
          </Tooltip>
        </div>

        {hasAudio && (
          <Button
            size="icon"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={cn(
              "absolute bottom-3 right-3 rounded-full shadow-lg transition-all transform scale-90 group-hover:scale-100",
              isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-white/90 hover:bg-white text-[#1C0357]"
            )}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-5 space-y-3 cursor-pointer" onClick={() => onViewDetails(product)}>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#1C0357] leading-tight line-clamp-1">{product.title}</h3>
          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <Music size={12} className="text-[#F538BC]" />
            {product.artist_name || 'Various Artists'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {product.vocal_ranges?.slice(0, 2).map((range: string) => (
            <Badge key={range} variant="secondary" className="bg-[#D1AAF2]/20 text-[#1C0357] text-[9px] px-1.5 py-0 border-none">
              {range}
            </Badge>
          ))}
          {product.key_signature && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-200">
              <Key size={8} className="mr-1" /> {product.key_signature}
            </Badge>
          )}
        </div>

        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed h-8">
          {product.description}
        </p>

        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center text-[#1C0357]">
            <span className="text-xs font-bold mr-0.5">$</span>
            <span className="text-2xl font-black">{product.price.toFixed(2)}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.currency}</span>
        </div>
      </CardContent>

      {hasAudio && <audio ref={audioRef} src={firstTrackUrl!} onEnded={handleEnded} preload="none" />}

      <CardFooter className="px-5 pb-5 pt-0">
        <Button
          onClick={() => onBuyNow(product)}
          disabled={isBuying}
          className="w-full h-10 text-sm font-bold bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-lg group/btn"
        >
          {isBuying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart size={16} className="group-hover/btn:scale-110 transition-transform" />
              Instant Purchase
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;