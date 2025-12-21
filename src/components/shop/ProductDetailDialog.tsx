"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
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
      <DialogContent className="max-w-4xl w-[95vw] h-[92vh] p-0 overflow-hidden border-none shadow-2xl bg-white flex flex-col sm:rounded-2xl">
        
        {/* Compact Header - Reduced height to maximize scroll area */}
        <div className="relative flex-shrink-0 h-48 md:h-64 overflow-hidden bg-[#1C0357]">
          {product.image_url ? (
            <>
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C0357] via-[#1C0357]/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1C0357] to-[#F538BC]/20" />
          )}

          <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={cn("px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]", typeInfo.bg, typeInfo.color, "border-none")}>
                <typeInfo.icon size={10} className="mr-1 inline" />
                {typeInfo.label}
              </Badge>
              {product.category && (
                <Badge className="bg-white/10 backdrop-blur-md text-white border-white/20 px-2 py-0.5 rounded-full font-medium text-[9px] uppercase tracking-wider">
                  {product.category.replace('-', ' ')}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {product.title}
            </h1>
            {product.artist_name && (
              <p className="text-sm md:text-base text-white/90 mt-1 font-medium flex items-center gap-1.5">
                <Theater className="h-4 w-4 text-[#F538BC]" />
                {product.artist_name}
              </p>
            )}
          </div>

          <DialogClose className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-all z-10">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Maximized Scrollable Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left/Main Column */}
            <div className="md:col-span-8 space-y-6">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 flex items-center gap-2">
                  <Info size={14} /> Description
                </h3>
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  {product.description}
                </p>
              </section>

              <Separator className="bg-gray-100" />

              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" /> Professional Features
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    <ShieldCheck className="h-4 w-4 text-[#F538BC] flex-shrink-0" />
                    <span className="text-xs font-bold">Stripe-Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    <Zap className="h-4 w-4 text-[#F538BC] flex-shrink-0" />
                    <span className="text-xs font-bold">Instant Download</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    <FileAudio className="h-4 w-4 text-[#F538BC] flex-shrink-0" />
                    <span className="text-xs font-bold">High-Fidelity Audio</span>
                  </div>
                  {product.show_sheet_music_url && product.sheet_music_url && (
                    <div className="flex items-center gap-3 text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                      <LinkIcon className="h-4 w-4 text-[#F538BC] flex-shrink-0" />
                      <span className="text-xs font-bold">Sheet Music Included</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right/Sidebar Column */}
            <div className="md:col-span-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1C0357] mb-4">Specifications</h3>
                
                <div className="space-y-4">
                  {product.show_key_signature && product.key_signature && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs flex items-center gap-2"><Key size={14} /> Key</span>
                      <span className="font-bold text-[#1C0357] text-sm">{product.key_signature}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs flex items-center gap-2"><FileAudio size={14} /> Format</span>
                    <span className="font-bold text-[#1C0357] text-sm capitalize">{product.track_type}</span>
                  </div>

                  {product.vocal_ranges && product.vocal_ranges.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500 text-xs flex items-center gap-2 mb-2"><Theater size={14} /> Vocal Range</span>
                      <div className="flex flex-wrap gap-1">
                        {product.vocal_ranges.map((range) => (
                          <Badge key={range} variant="outline" className="text-[10px] py-0 px-2 border-gray-300 text-gray-600">
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
                  <Button variant="outline" className="w-full h-10 text-xs border-gray-300 rounded-lg hover:bg-gray-50 font-bold">
                    <LinkIcon className="mr-2 h-3.5 w-3.5" /> View Sheet Music
                  </Button>
                </a>
              )}
            </div>

          </div>
        </div>

        {/* Slimmer Footer */}
        <div className="bg-white border-t p-4 md:px-10 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Audio Preview */}
            {firstTrackUrl && (
              <div className="flex items-center gap-3 w-full md:w-auto bg-gray-50 p-2 rounded-xl border border-gray-100 flex-1 max-w-sm">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePlay}
                  className={cn(
                    "rounded-full h-10 w-10 flex-shrink-0 transition-all shadow-sm",
                    isPlaying ? "bg-red-50 text-red-600" : "bg-white text-[#F538BC]"
                  )}
                >
                  {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                </Button>
                <div className="overflow-hidden flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Preview Quality</p>
                  <p className="text-xs font-bold text-[#1C0357] truncate">10-second sample</p>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleEnded} preload="none" />
              </div>
            )}

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total</p>
                <div className="text-2xl font-black text-[#1C0357]">
                  <span className="text-sm mr-0.5 font-bold">{product.currency}</span>
                  {product.price.toFixed(2)}
                </div>
              </div>

              <Button
                onClick={() => onBuyNow(product)}
                disabled={isBuying}
                className="h-12 px-8 text-base font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-xl shadow-lg shadow-[#1C0357]/10 flex-1 md:flex-none"
              >
                {isBuying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Buy Now — {product.currency}{product.price.toFixed(2)}
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