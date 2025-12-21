"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  DollarSign, 
  ShoppingCart, 
  Link as LinkIcon, 
  Loader2, 
  Music, 
  Theater, 
  Key, 
  Play, 
  Pause,
  FileAudio,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  onOpenChange,
  product,
  onBuyNow,
  isBuying,
}) => {
  const firstTrackUrl = product.track_urls?.[0]?.url || null;
  const { isPlaying, togglePlay, audioRef, handleEnded } = useAudioPreview(firstTrackUrl);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Map track types to distinct styles
  const getTrackTypeInfo = (type?: string) => {
    switch (type) {
      case 'quick': return { label: 'Quick Reference', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'one-take': return { label: 'One-Take', icon: FileAudio, color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'polished': return { label: 'Polished', icon: Sparkles, color: 'text-[#F538BC]', bg: 'bg-pink-50' };
      default: return { label: 'Standard', icon: Music, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const typeInfo = getTrackTypeInfo(product.track_type);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden border-none shadow-2xl bg-white flex flex-col sm:rounded-2xl">
        {/* Sticky Header Image/Gradient */}
        <div className="relative flex-shrink-0 group">
          <AspectRatio ratio={21 / 9} className="bg-[#1C0357]">
            {product.image_url ? (
              <>
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C0357] via-[#1C0357]/40 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1C0357] to-[#F538BC]/20 flex items-center justify-center" />
            )}
          </AspectRatio>

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className={cn("px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]", typeInfo.bg, typeInfo.color, "border-none")}>
                <typeInfo.icon size={12} className="mr-1 inline" />
                {typeInfo.label}
              </Badge>
              {product.category && (
                <Badge className="bg-white/20 backdrop-blur-md text-white border-none px-3 py-1 rounded-full font-medium text-[10px] uppercase tracking-wider">
                  {product.category.replace('-', ' ')}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tight drop-shadow-sm">
              {product.title}
            </h1>
            {product.artist_name && (
              <p className="text-lg md:text-xl text-white/80 mt-2 font-medium flex items-center gap-2">
                <Theater className="h-5 w-5 text-[#F538BC]" />
                {product.artist_name}
              </p>
            )}
          </div>

          <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-all">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Scrollable Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Description & Included */}
            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <Info size={16} /> Product Overview
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed font-medium">
                  {product.description}
                </p>
              </section>

              <Separator className="bg-gray-100" />

              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" /> What's Included
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <ShieldCheck className="h-5 w-5 text-[#F538BC] flex-shrink-0" />
                    <span className="text-sm font-semibold">Stripe-Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Zap className="h-5 w-5 text-[#F538BC] flex-shrink-0" />
                    <span className="text-sm font-semibold">Instant Digital Delivery</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <FileAudio className="h-5 w-5 text-[#F538BC] flex-shrink-0" />
                    <span className="text-sm font-semibold">High-Quality Audio File</span>
                  </div>
                  {product.show_sheet_music_url && product.sheet_music_url && (
                    <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <LinkIcon className="h-5 w-5 text-[#F538BC] flex-shrink-0" />
                      <span className="text-sm font-semibold">Sheet Music PDF Included</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Technical Specs */}
            <div className="space-y-6">
              <div className="bg-[#1C0357]/5 rounded-2xl p-6 border border-[#1C0357]/10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#1C0357] mb-6">Technical Specs</h3>
                
                <div className="space-y-5">
                  {product.show_key_signature && product.key_signature && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm flex items-center gap-2"><Key size={16} /> Key</span>
                      <span className="font-bold text-[#1C0357]">{product.key_signature}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm flex items-center gap-2"><FileAudio size={16} /> Quality</span>
                    <span className="font-bold text-[#1C0357] capitalize">{product.track_type}</span>
                  </div>

                  {product.vocal_ranges && product.vocal_ranges.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-gray-500 text-sm flex items-center gap-2"><Theater size={16} /> Ideal Range</span>
                      <div className="flex flex-wrap gap-1">
                        {product.vocal_ranges.map((range) => (
                          <Badge key={range} variant="secondary" className="bg-white text-[#1C0357] border-gray-200">
                            {range}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {product.show_sheet_music_url && product.sheet_music_url && (
                <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full h-12 border-gray-300 rounded-xl hover:bg-gray-50 font-bold">
                    <LinkIcon className="mr-2 h-4 w-4" /> Preview PDF
                  </Button>
                </a>
              )}
            </div>

          </div>
        </div>

        {/* Footer: Audio Sample & Buy Action */}
        <div className="bg-gray-50 border-t p-6 md:px-10">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Audio Preview Integrated */}
            {firstTrackUrl && (
              <div className="flex items-center gap-4 w-full md:w-auto bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex-1 max-w-sm">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePlay}
                  className={cn(
                    "rounded-full h-12 w-12 flex-shrink-0 transition-all",
                    isPlaying ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#F538BC]/10 text-[#F538BC] hover:bg-[#F538BC]/20"
                  )}
                >
                  {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                </Button>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">10s Audio Preview</p>
                  <p className="text-sm font-bold text-[#1C0357] truncate">Listen to track quality</p>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
              </div>
            )}

            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5 text-right">Price</p>
                <div className="flex items-center justify-end text-3xl font-black text-[#1C0357]">
                  <span className="text-lg mr-0.5 font-bold">{product.currency}</span>
                  {product.price.toFixed(2)}
                </div>
              </div>

              <Button
                onClick={() => onBuyNow(product)}
                disabled={isBuying}
                className="h-14 px-8 text-lg font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-2xl shadow-xl shadow-[#1C0357]/20 flex-1 md:flex-none"
              >
                {isBuying ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-6 w-6" />
                    Buy Now
                  </>
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