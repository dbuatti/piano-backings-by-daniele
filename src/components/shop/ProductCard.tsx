"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, ShoppingCart, Loader2, Theater, Key, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { isWithinInterval, subDays } from 'date-fns';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { getTrackTypeInfo, getCategoryInfo } from '@/utils/trackTypes';
import { formatDuration } from '@/utils/helpers';

interface ShopProduct {
  id: string;
  created_at: string;
  title: string;
  price: number;
  currency: string;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  key_signature: string | null;
  track_type: string;
  duration_seconds?: number | null;
  track_urls?: { url: string | null }[];
}

interface ProductCardProps {
  variants: ShopProduct[];
  onViewDetails: (product: ShopProduct, variants?: ShopProduct[]) => void;
  onBuyNow: (product: ShopProduct) => Promise<void>;
  isBuying: boolean;
}

const MAX_VISIBLE_VOICES = 2;

export const PreviewButton: React.FC<{ variant: ShopProduct }> = ({ variant }) => {
  const firstTrackUrl = variant.track_urls?.[0]?.url || null;
  const { isPlaying, togglePlay, audioRef, handleEnded, hasAudio } = useAudioPreview(firstTrackUrl);

  if (!hasAudio) return null;

  return (
    <>
      <Button
        size="icon"
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        aria-label={`${isPlaying ? 'Pause' : 'Play'} preview of ${variant.title}`}
        className={cn(
          "rounded-full shadow-sm transition-all shrink-0 h-10 w-10 border-2",
          isPlaying
            ? "bg-[#F538BC] border-[#F538BC] text-white animate-pulse"
            : "bg-white border-[#F538BC]/40 text-[#F538BC] hover:bg-[#F538BC] hover:text-white hover:scale-105"
        )}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
      </Button>
      <audio ref={audioRef} src={firstTrackUrl!} onEnded={handleEnded} preload="none" />
    </>
  );
};

const ProductCard: React.FC<ProductCardProps> = ({ variants, onViewDetails, onBuyNow, isBuying }) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(variants[0]?.id);

  useEffect(() => {
    if (selectedId && !variants.some(v => v.id === selectedId)) {
      setSelectedId(variants[0]?.id);
    }
  }, [variants, selectedId]);

  const selected = variants.find(v => v.id === selectedId) || variants[0];
  if (!selected) return null;

  const isMulti = variants.length > 1;
  const isNew = isWithinInterval(new Date(selected.created_at), { start: subDays(new Date(), 14), end: new Date() });

  const quality = getTrackTypeInfo(selected.track_type);
  const cat = getCategoryInfo(selected.category);
  const vocalRanges = selected.vocal_ranges || [];
  const visibleVoices = vocalRanges.slice(0, MAX_VISIBLE_VOICES);
  const hiddenVoices = vocalRanges.length - visibleVoices.length;
  const duration = formatDuration(selected.duration_seconds);

  const handleCardClick = () => onViewDetails(selected, variants);

  const variantLabel = (v: ShopProduct) =>
    (v.vocal_ranges || []).join('/') || v.key_signature || getTrackTypeInfo(v.track_type).label;

  return (
    <Card
      onClick={handleCardClick}
      className="group flex flex-col overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 bg-white rounded-2xl cursor-pointer h-full"
    >
      <CardContent className="flex-1 p-5 flex flex-col gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-[#1C0357] leading-snug line-clamp-2 group-hover:text-[#F538BC] transition-colors duration-300">
            {selected.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Theater size={13} className="text-[#F538BC] flex-shrink-0" />
            <p className="text-xs font-bold text-gray-500 truncate">
              {selected.artist_name || 'Various Artists'}
            </p>
          </div>
        </div>

        {isMulti && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a version">
            {variants.map(v => {
              const active = v.id === selected.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedId(v.id); }}
                  className={cn(
                    "px-2.5 h-6 rounded-full text-[10px] font-black uppercase border transition-colors",
                    active
                      ? "bg-[#1C0357] text-white border-[#1C0357] shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#1C0357]/40 hover:text-[#1C0357]"
                  )}
                >
                  {variantLabel(v)}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {isNew && (
            <Badge className="bg-[#F538BC] text-white border-none text-[10px] font-black h-5 px-2 shadow-sm">
              NEW
            </Badge>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase h-6", cat.badgeClass)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", cat.dotClass)} />
            {cat.label}
          </span>
          {quality.showBadge && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase h-6", quality.badgeClass)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", quality.dotClass)} />
                    {quality.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{quality.desc || quality.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {selected.key_signature && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-gray-200 bg-gray-50/50 text-gray-600 font-bold">
              <Key size={10} className="mr-1.5 text-gray-400" /> {selected.key_signature}
            </Badge>
          )}
          {!isMulti && visibleVoices.map((range: string) => (
            <Badge key={range} variant="secondary" className="bg-[#D1AAF2]/10 text-[#1C0357] text-[10px] px-2 py-0.5 border-none font-bold">
              {range}
            </Badge>
          ))}
          {!isMulti && hiddenVoices > 0 && (
            <Badge variant="secondary" className="bg-[#D1AAF2]/10 text-[#1C0357] text-[10px] px-2 py-0.5 border-none font-bold">
              +{hiddenVoices}
            </Badge>
          )}
          {duration && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-gray-200 bg-gray-50/50 text-gray-600 font-bold">
              <Clock size={10} className="mr-1.5 text-gray-400" /> {duration}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0 mt-auto">
        <div className="flex items-center gap-3 w-full">
          <PreviewButton key={selected.id} variant={selected} />

          <div className="flex items-baseline text-[#1C0357]">
            <span className="text-sm font-black mr-0.5">$</span>
            <span className="text-xl font-black tracking-tighter">{selected.price.toFixed(2)}</span>
            <span className="ml-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">{selected.currency}</span>
          </div>

          <div className="ml-auto">
            <Button
              onClick={(e) => { e.stopPropagation(); onBuyNow(selected); }}
              disabled={isBuying}
              className="h-10 px-4 text-xs font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-xl shadow-lg shadow-[#1C0357]/10 active:scale-[0.98] transition-all"
            >
              {isBuying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <ShoppingCart size={15} />
                  Buy
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
