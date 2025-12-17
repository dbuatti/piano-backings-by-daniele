"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, ShoppingCart, Loader2, Theater, Key, Mic, Headphones, Sparkles, PlayCircle, PauseCircle, Link as LinkIcon, Music, Heart, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { TrackInfo } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface Product {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_urls?: TrackInfo[];
  is_active: boolean;
  artist_name?: string;
  category?: string;
  vocal_ranges?: string[];
  sheet_music_url?: string | null;
  key_signature?: string | null;
  show_sheet_music_url?: boolean;
  show_key_signature?: boolean;
  track_type?: string;
  master_download_link?: string | null;
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onBuyNow: (product: Product) => Promise<void>;
  isBuying: boolean;
}

const getTrackTypeIcon = (type: string | undefined) => {
  switch (type) {
    case 'quick':
      return { Icon: Mic, color: 'text-blue-500', tooltip: 'Quick Reference' };
    case 'one-take':
    case 'one-take-recording':
      return { Icon: Headphones, color: 'text-yellow-500', tooltip: 'One-Take Recording' };
    case 'polished':
      return { Icon: Sparkles, color: 'text-[#F538BC]', tooltip: 'Polished Backing' };
    default:
      return null;
  }
};

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  product, 
  onBuyNow, 
  isBuying 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const PREVIEW_DURATION = 10; // seconds
  const { toast } = useToast(); // Initialize useToast

  const firstTrackUrl = product.track_urls && product.track_urls.length > 0 ? product.track_urls[0].url : null;
  const trackIcon = getTrackTypeIcon(product.track_type);

  // Reset audio state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isOpen]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const newProgress = (currentTime / PREVIEW_DURATION) * 100;
      setProgress(Math.min(newProgress, 100));
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !firstTrackUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      setProgress(0);

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setProgress(0);
        timeoutRef.current = null;
      }, PREVIEW_DURATION * 1000) as unknown as number;
    }
  };

  const handleAudioEnded = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  };

  // Helper to display descriptive quality terms
  const getTrackQualityDescription = (type: string | undefined) => {
    switch (type) {
      case 'quick': return 'Quick Reference (Basic Quality)';
      case 'one-take': return 'One-Take Recording (Good Quality)';
      case 'polished': return 'Polished Backing (Studio Quality)';
      default: return 'Not specified';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* Left Column: Image & Audio Player */}
          <div className="lg:w-1/2 p-6 bg-gray-50 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="relative mb-4">
              <AspectRatio ratio={16 / 9}>
                {/* Image or Placeholder */}
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title} 
                    className="w-full h-full object-cover rounded-lg shadow-md" 
                  />
                ) : (
                  <div 
                    className="flex items-center justify-center w-full h-full text-white p-4 text-center rounded-lg shadow-md"
                    style={{ backgroundColor: '#1C0357', fontFamily: '"Playfair Display", serif' }}
                  >
                    <h3 className="text-3xl font-bold leading-snug">
                      {product.title}
                    </h3>
                  </div>
                )}
              </AspectRatio>
            </div>

            {/* Audio Player Section */}
            {firstTrackUrl && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow-inner border border-gray-200">
                <h4 className="text-lg font-semibold text-[#1C0357] mb-2 flex items-center">
                  <Music className="h-5 w-5 mr-2 text-[#F538BC]" /> Preview Track (10s Sample)
                </h4>
                <div className="flex items-center space-x-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handlePlayPause}
                        className={cn(
                          "h-12 w-12 rounded-full transition-colors shadow-lg flex-shrink-0",
                          isPlaying 
                            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-fast" 
                            : "bg-[#D1AAF2] hover:bg-[#D1AAF2]/80 text-[#1C0357]"
                        )}
                      >
                        {isPlaying ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPlaying ? 'Pause Sample' : 'Play 10-sec Sample'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <div className="flex-1">
                    {/* Removed indicatorClassName and applied indicator color via className (default Shadcn behavior) */}
                    <Progress value={progress} className="h-2 bg-gray-200 [&>div]:bg-[#F538BC]" />
                    <p className="text-xs text-gray-500 mt-1">
                      {isPlaying ? `Playing... (${Math.round(progress * PREVIEW_DURATION / 100)}s / ${PREVIEW_DURATION}s)` : 'Ready to play'}
                    </p>
                  </div>
                </div>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleAudioEnded} onTimeUpdate={handleTimeUpdate} preload="none" className="hidden" />
              </div>
            )}
            
            {/* Wishlist Placeholder */}
            <div className="mt-4 flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-[#F538BC] transition-colors"
                    onClick={(e) => { e.stopPropagation(); toast({ title: "Wishlist", description: "Feature coming soon!" }); }}
                  >
                    <Heart className="h-6 w-6 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save to Wishlist</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Right Column: Details & CTA */}
          <div className="lg:w-1/2 p-6 flex flex-col overflow-y-auto">
            <DialogHeader className="mb-4 flex-shrink-0">
              <DialogTitle className="text-3xl font-extrabold text-[#1C0357] leading-tight">{product.title}</DialogTitle>
              {product.artist_name && (
                <DialogDescription className="text-xl text-gray-700 flex items-center mt-1">
                  <Theater className="h-5 w-5 mr-2 text-[#F538BC]" /> {product.artist_name}
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 border-b pb-4 flex-shrink-0">
              {/* Show/Source */}
              <div className="flex items-center">
                <Theater className="h-4 w-4 mr-2 text-[#1C0357]" />
                <div>
                  <p className="text-xs text-gray-500">Show/Source</p>
                  <p className="font-medium text-sm">{product.artist_name || 'N/A'}</p>
                </div>
              </div>
              
              {/* Key */}
              {product.show_key_signature && product.key_signature && (
                <div className="flex items-center">
                  <Key className="h-4 w-4 mr-2 text-[#1C0357]" />
                  <div>
                    <p className="text-xs text-gray-500">Musical Key</p>
                    <p className="font-medium text-sm">{product.key_signature}</p>
                  </div>
                </div>
              )}
              
              {/* Track Quality */}
              <div className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-[#1C0357]" />
                <div>
                  <p className="text-xs text-gray-500">Track Quality</p>
                  <p className="font-medium text-sm">{getTrackQualityDescription(product.track_type)}</p>
                </div>
              </div>
              
              {/* File Type (Simulated) */}
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-[#1C0357]" />
                <div>
                  <p className="text-xs text-gray-500">File Type</p>
                  <p className="font-medium text-sm">High-Quality MP3</p>
                </div>
              </div>
              
              {/* Vocal Ranges */}
              {product.vocal_ranges && product.vocal_ranges.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Vocal Ranges</p>
                  <div className="flex flex-wrap gap-1">
                    {product.vocal_ranges.map(range => (
                      <Badge 
                        key={range} 
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          range === 'Soprano' && 'bg-pink-100 text-pink-800 border border-pink-300',
                          range === 'Alto' && 'bg-purple-100 text-purple-800 border border-purple-300',
                          range === 'Tenor' && 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                          range === 'Bass' && 'bg-blue-100 text-blue-800 border border-blue-300',
                        )}
                      >
                        {range}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex-1 overflow-y-auto pr-2 mb-4">
              <h4 className="text-xl font-semibold text-[#1C0357] mb-2">Description</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
              
              {/* Sheet Music Link */}
              {product.show_sheet_music_url && product.sheet_music_url && (
                <div className="mt-4">
                  <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                    <Button 
                      variant="link" 
                      className="p-0 text-[#1C0357] hover:text-[#F538BC] font-semibold"
                    >
                      <LinkIcon className="h-4 w-4 mr-2 text-[#F538BC]" /> View Sheet Music PDF
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Sticky Footer CTA */}
            <div className="flex-shrink-0 pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-[#1C0357] mr-2" />
                  <span className="text-xl font-medium text-gray-600 mr-1">{product.currency}</span>
                  <span className="text-4xl font-extrabold text-[#1C0357]">{product.price.toFixed(2)}</span>
                </div>
              </div>
              <Button 
                onClick={() => onBuyNow(product)} 
                className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white w-full justify-center shadow-xl text-xl h-14"
                disabled={isBuying}
              >
                {isBuying ? (
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                  product.master_download_link ? (
                    <LinkIcon className="mr-2 h-6 w-6" />
                  ) : (
                    <ShoppingCart className="mr-2 h-6 w-6" />
                  )
                )}
                {isBuying ? 'Processing...' : `Buy Now (${product.currency} ${product.price.toFixed(2)})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;