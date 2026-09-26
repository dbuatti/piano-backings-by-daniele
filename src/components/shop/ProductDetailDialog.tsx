"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ShoppingCart, 
  Link as LinkIcon, 
  Check,
  FileText,
  Scissors,
  ExternalLink,
  Theater, 
  Key, 
  Play, 
  Pause,
  FileAudio,
  Clock,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  Info,
  Share2,
  Music,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { getTrackTypeInfo } from '@/utils/trackTypes';
import { formatDuration } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import VisuallyHidden from '@/components/VisuallyHidden';
import { useToast } from '@/hooks/use-toast';
import { SHOP_SHEET_MUSIC_PRICE } from '@/utils/pricing';

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
  duration_seconds?: number | null;
  sheet_music_url?: string | null;
  show_sheet_music_url?: boolean;
  master_download_link?: string | null;
  product_type?: string | null;
  cut_description?: string | null;
  official_score_url?: string | null;
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  variants?: Product[];
  related?: Product[];
  relatedShow?: string | null;
  onOpenProduct?: (product: Product, variants?: Product[]) => void;
  onAddToCart: (product: Product, includeSheetMusic: boolean) => void;
  isInCart: (productId: string) => boolean;
  onViewCart: () => void;
  navIndex?: number;
  navTotal?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

const variantLabel = (v: { vocal_ranges?: string[]; key_signature?: string | null; track_type?: string }) =>
  (v.vocal_ranges || []).join('/') || v.key_signature || getTrackTypeInfo(v.track_type).label;

const PreviewPlayer: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  const { isPlaying, togglePlay, audioRef, handleEnded } = useAudioPreview(url);

  return (
    <div className="flex items-center gap-3 w-full md:w-auto bg-gray-50 p-2 rounded-xl border border-gray-100 flex-1 max-w-sm">
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        aria-label={`${isPlaying ? 'Pause' : 'Play'} preview of ${title}`}
        className={cn(
          "rounded-full h-10 w-10 flex-shrink-0 transition-all shadow-sm",
          isPlaying ? "bg-[#F538BC] text-white" : "bg-white text-[#F538BC] hover:bg-[#F538BC] hover:text-white"
        )}
      >
        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
      </Button>
      <div className="overflow-hidden flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Preview Quality</p>
        <p className="text-xs font-bold text-[#1C0357] truncate">{isPlaying ? 'Playing sample' : '10-second sample'}</p>
      </div>
      <audio ref={audioRef} src={url} onEnded={handleEnded} preload="none" />
    </div>
  );
};

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  onOpenChange,
  product,
  variants,
  related,
  relatedShow,
  onOpenProduct,
  onAddToCart,
  isInCart,
  onViewCart,
  navIndex,
  navTotal,
  onNavigate,
}) => {
  const { toast } = useToast();

  const hasVariants = (variants?.length || 0) > 1;
  const [selectedId, setSelectedId] = useState(product.id);
  const [wantsSheetMusic, setWantsSheetMusic] = useState(false);

  useEffect(() => {
    setSelectedId(product.id);
    setWantsSheetMusic(false);
  }, [product.id]);

  const selected = hasVariants ? (variants!.find(v => v.id === selectedId) || product) : product;

  const handleSelectVariant = (id: string) => {
    if (id === selected.id) return;
    setSelectedId(id);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [product.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate?.('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate?.('next');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onNavigate]);

  const handleShare = () => {
    const url = `${window.location.origin}/shop/${selected.id}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Link Copied!", description: "Product link copied to clipboard." }),
      () => toast({ title: "Couldn't copy link", description: url }),
    );
  };

  const typeInfo = getTrackTypeInfo(selected.track_type);
  const firstTrackUrl = selected.track_urls?.[0]?.url || null;
  const offersSheetMusic = selected.product_type !== 'credit_pack';
  const includeSheetMusic = offersSheetMusic && wantsSheetMusic;
  const displayPrice = selected.price + (includeSheetMusic ? SHOP_SHEET_MUSIC_PRICE : 0);
  const inCart = isInCart(selected.id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-4xl w-[95vw] h-[92vh] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white flex flex-col sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            <VisuallyHidden>Product Details for {product.title}</VisuallyHidden>
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex-shrink-0 h-48 md:h-64 overflow-hidden bg-[#1C0357]">
          {selected.image_url ? (
            <>
              <img
                src={selected.image_url}
                alt={selected.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C0357] via-[#1C0357]/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1C0357] to-[#F538BC]/20 relative">
              <Music className="absolute -right-8 -bottom-6 h-48 w-48 text-white/5" />
              <Music className="absolute right-28 -top-4 h-32 w-32 text-white/5" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={cn("px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]", typeInfo.badgeClass, "border-none")}>
                <typeInfo.icon size={10} className="mr-1 inline" />
                {typeInfo.label}
              </Badge>
              {selected.category && (
                <Badge className="bg-white/10 backdrop-blur-md text-white border-white/20 px-2 py-0.5 rounded-full font-medium text-[9px] uppercase tracking-wider">
                  {selected.category.replace('-', ' ')}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {selected.title}
            </h1>
            {selected.artist_name && (
              <p className="text-sm md:text-base text-white/90 mt-1 font-medium flex items-center gap-1.5">
                <Theater className="h-4 w-4 text-[#F538BC]" />
                {selected.artist_name}
              </p>
            )}
          </div>

          <div className="absolute top-4 right-14 z-10">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              aria-label="Copy link to this track"
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-all"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {typeof navTotal === 'number' && navTotal > 1 && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-black/25 backdrop-blur-md rounded-full p-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onNavigate?.('prev')}
                disabled={typeof navIndex !== 'number' || navIndex <= 0}
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 disabled:opacity-40"
                aria-label="Previous song"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[10px] font-black text-white/80 tabular-nums px-1">
                {typeof navIndex === 'number' && navIndex >= 0 ? navIndex + 1 : '-'}/{navTotal}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onNavigate?.('next')}
                disabled={typeof navIndex !== 'number' || navIndex >= navTotal - 1}
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 disabled:opacity-40"
                aria-label="Next song"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <DialogClose aria-label="Close" className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-all z-10">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
            
            <div className="md:col-span-8 space-y-6">
              {hasVariants && (
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 flex items-center gap-2">
                    <Theater size={14} /> Choose Version
                  </h3>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a version">
                    {variants!.map(v => {
                      const active = v.id === selected.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVariant(v.id)}
                          className={cn(
                            "px-3 h-8 rounded-full text-[11px] font-black uppercase border transition-colors",
                            active
                              ? "bg-[#1C0357] text-white border-[#1C0357] shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#1C0357]/40 hover:text-[#1C0357]"
                          )}
                        >
                          {variantLabel(v)}
                          {v.price !== selected.price && (
                            <span className={cn("ml-1.5 font-bold", active ? "text-white/70" : "text-gray-400")}>
                              ${v.price.toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 flex items-center gap-2">
                  <Info size={14} /> Description
                </h3>
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  {selected.description}
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
                  {offersSheetMusic && (
                    <div className="flex items-center gap-3 text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                      <FileText className="h-4 w-4 text-[#F538BC] flex-shrink-0" />
                      <span className="text-xs font-bold">Custom sheet music available</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="md:col-span-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1C0357] mb-4">Specifications</h3>
                
                <div className="space-y-4">
                  {selected.show_key_signature && selected.key_signature && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs flex items-center gap-2"><Key size={14} /> Key</span>
                      <span className="font-bold text-[#1C0357] text-sm">{selected.key_signature}</span>
                    </div>
                  )}

                  {selected.cut_description && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-500 text-xs flex items-center gap-2 flex-shrink-0"><Scissors size={14} /> Cut</span>
                      <span className="font-bold text-[#1C0357] text-sm text-right">{selected.cut_description}</span>
                    </div>
                  )}

                  {selected.duration_seconds ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs flex items-center gap-2"><Clock size={14} /> Duration</span>
                      <span className="font-bold text-[#1C0357] text-sm">{formatDuration(selected.duration_seconds)}</span>
                    </div>
                  ) : null}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs flex items-center gap-2"><FileAudio size={14} /> Format</span>
                    <span className="font-bold text-[#1C0357] text-sm">{typeInfo.label}</span>
                  </div>

                  {selected.vocal_ranges && selected.vocal_ranges.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500 text-xs flex items-center gap-2 mb-2"><Theater size={14} /> Vocal Range</span>
                      <div className="flex flex-wrap gap-1">
                        {selected.vocal_ranges.map((range) => (
                          <Badge key={range} variant="outline" className="text-[10px] py-0 px-2 border-gray-300 text-gray-600">
                            {range}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selected.show_sheet_music_url && selected.sheet_music_url && (
                <a href={selected.sheet_music_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full h-10 text-xs border-gray-300 rounded-lg hover:bg-gray-50 font-bold">
                    <LinkIcon className="mr-2 h-3.5 w-3.5" /> Preview Sheet Music
                  </Button>
                </a>
              )}

              {selected.official_score_url && (
                <a href={selected.official_score_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full h-10 text-xs border-gray-300 rounded-lg hover:bg-gray-50 font-bold">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Buy the Official Score
                  </Button>
                </a>
              )}
            </div>

          </div>

          {related && related.length > 0 && onOpenProduct && (
            <section className="mt-10 pt-6 border-t border-gray-100">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                <Music size={14} /> More from {relatedShow || 'the Library'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {related.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpenProduct(r)}
                    className="group text-left rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-all hover:border-[#F538BC]/40 hover:bg-white hover:shadow-md"
                  >
                    <p className="text-sm font-black text-[#1C0357] leading-snug line-clamp-2 group-hover:text-[#F538BC] transition-colors">
                      {r.title}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 truncate">
                      {getTrackTypeInfo(r.track_type).label} · ${r.price.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="bg-white border-t p-4 md:px-10 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {firstTrackUrl && (
              <PreviewPlayer key={selected.id} url={firstTrackUrl} title={selected.title} />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              {offersSheetMusic && (
                <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 hover:border-[#F538BC]/40">
                  <Checkbox
                    checked={wantsSheetMusic}
                    onCheckedChange={(v) => setWantsSheetMusic(v === true)}
                    className="mt-0.5"
                    aria-label="Add custom sheet music"
                  />
                  <span className="text-xs leading-snug">
                    <span className="font-black text-[#1C0357] block">+ Custom sheet music ${SHOP_SHEET_MUSIC_PRICE.toFixed(0)}</span>
                    <span className="text-gray-500">Clean engraved score of this cut</span>
                  </span>
                </label>
              )}

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total</p>
                  <div className="text-2xl font-black text-[#1C0357] whitespace-nowrap">
                    ${displayPrice.toFixed(2)}
                    <span className="ml-1 text-[10px] font-bold text-gray-400">{selected.currency}</span>
                  </div>
                </div>

                {inCart ? (
                  <Button
                    onClick={() => {
                      if (includeSheetMusic) onAddToCart(selected, true);
                      onViewCart();
                    }}
                    variant="outline"
                    className="h-12 px-6 text-base font-black rounded-xl border-[#1C0357]/30 text-[#1C0357] flex-1 md:flex-none"
                  >
                    <Check className="mr-2 h-5 w-5" /> In cart · View
                  </Button>
                ) : (
                  <Button
                    onClick={() => onAddToCart(selected, includeSheetMusic)}
                    className="h-12 px-6 text-base font-black bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-xl shadow-lg shadow-[#1C0357]/10 flex-1 md:flex-none"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
