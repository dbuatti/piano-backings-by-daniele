import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DollarSign, Music, ShoppingCart, X, Link as LinkIcon, PlayCircle, PauseCircle, Theater, Tag, Key, FileText, Loader2, Mic, Headphones, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrackInfo } from '@/utils/helpers';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Product {
  id: string;
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
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
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
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // Reset audio state when dialog closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isOpen]);

  if (!product) return null;

  const handlePlayPause = () => {
    if (!audioRef.current || !product.track_urls || product.track_urls.length === 0) return;

    if (isPlaying) {
      // Pause immediately
      audioRef.current.pause();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playing from the beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);

      // Set timeout to stop after 10 seconds
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0; // Reset for next play
        }
        setIsPlaying(false);
        timeoutRef.current = null;
      }, 10000); // 10 seconds
    }
  };

  const handleAudioEnded = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePreviewPdf = () => {
    if (product.sheet_music_url) {
      const deidentifiedFilename = `${product.title} - ${product.artist_name || 'Sheet Music'}.pdf`;
      let previewUrl = product.sheet_music_url;

      if (product.sheet_music_url.includes('supabase.co/storage')) {
        const baseUrl = product.sheet_music_url.split('?')[0];
        previewUrl = `${baseUrl}?download=${encodeURIComponent(deidentifiedFilename)}`;
        window.open(previewUrl, '_blank');
      } else {
        window.open(previewUrl, '_blank');
        toast({
          title: "External PDF Viewer",
          description: "The PDF is hosted externally. The filename displayed in the new tab cannot be de-identified by this application.",
          variant: "default",
        });
      }
    }
  };
  
  const getTrackTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'quick':
        return { Icon: Mic, color: 'text-blue-500', tooltip: 'Quick Reference' };
      case 'one-take':
        return { Icon: Headphones, color: 'text-yellow-500', tooltip: 'One-Take Recording' };
      case 'polished':
        return { Icon: Sparkles, color: 'text-[#F538BC]', tooltip: 'Polished Backing' };
      default:
        return null;
    }
  };

  const trackIcon = getTrackTypeIcon(product.track_type);
  const firstTrackUrl = product.track_urls && product.track_urls.length > 0 ? product.track_urls[0].url : null;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* FIX: Added max-h-[90vh] and overflow-y-auto to DialogContent */}
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden max-h-[90vh] [&>button]:hidden">
        <div className="relative flex flex-col h-full">
          {/* Image Header */}
          <div className="relative flex-shrink-0">
            <AspectRatio ratio={16 / 9}>
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.title} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div 
                  className="flex items-center justify-center w-full h-full text-white p-4 text-center"
                  style={{ backgroundColor: '#ff08b0', fontFamily: '"Playfair Display", serif' }}
                >
                  <h1 className="text-3xl md:text-4xl font-bold italic leading-tight">
                    {product.title}
                  </h1>
                </div>
              )}
            </AspectRatio>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-white hover:bg-white/20 hover:text-white z-10"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          {/* Scrollable Content Area */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <DialogHeader>
              <h1 className="text-3xl font-bold text-[#1C0357]">{product.title}</h1>
              
              {product.artist_name && (
                <p className="text-lg text-gray-700 flex items-center">
                  <Theater className="h-5 w-5 mr-2" /> {product.artist_name}
                </p>
              )}
              
              {/* Key Details Group */}
              <div className="flex flex-wrap gap-4 pt-2 border-b pb-4 border-gray-100">
                {product.category && (
                  <div className="text-md text-gray-600 flex items-center capitalize">
                    <Tag className="h-4 w-4 mr-2" /> <strong>Category:</strong> {product.category.replace('-', ' ')}
                  </div>
                )}
                {product.key_signature && product.show_key_signature && (
                  <div className="text-md text-gray-600 flex items-center">
                    <Key className="h-4 w-4 mr-2" /> <strong>Key:</strong> {product.key_signature}
                  </div>
                )}
                {product.track_type && (
                  <div className="text-md text-gray-600 flex items-center capitalize">
                    {trackIcon && <trackIcon.Icon className={cn("h-4 w-4 mr-2", trackIcon.color)} />}
                    <strong>Type:</strong> {product.track_type.replace('-', ' ')}
                  </div>
                )}
              </div>

              {product.vocal_ranges && product.vocal_ranges.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-md font-semibold text-[#1C0357] mb-1">Vocal Ranges:</h3>
                  <div className="flex flex-wrap gap-1">
                    {product.vocal_ranges.map((range, index) => (
                      <Badge key={index} variant="secondary" className="bg-white text-[#1C0357] border-2 border-[#F538BC] text-base px-3 py-1.5 rounded-full font-bold">
                        {range}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogDescription className="text-lg text-gray-700 pt-4">
                {product.description}
              </DialogDescription>
            </DialogHeader>

            {/* Audio Sample Section */}
            {firstTrackUrl && (
              <div className="space-y-3 p-4 border rounded-lg bg-[#D1AAF2]/10">
                <h2 className="text-xl font-semibold text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-5 w-5" />
                  Audio Sample
                </h2>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                    {String(product.track_urls[0].caption || 'Main Track Sample')}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handlePlayPause} 
                        className="text-[#1C0357] hover:bg-[#1C0357]/10"
                        disabled={isBuying}
                      >
                        {isPlaying ? <PauseCircle className="h-8 w-8" /> : <PlayCircle className="h-8 w-8" />}
                        <span className="sr-only">{isPlaying ? 'Pause Sample' : 'Play 10-sec Sample'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPlaying ? 'Pause Sample' : 'Play 10-sec Sample'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-gray-600">Note: This is a 10-second audio sample. Full access is granted upon purchase.</p>
                <audio ref={audioRef} src={firstTrackUrl} onEnded={handleAudioEnded} preload="none" className="hidden" />
              </div>
            )}

            {product.sheet_music_url && product.show_sheet_music_url && (
              <div className="border-t pt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePreviewPdf}
                  className="w-full bg-[#D1AAF2]/30 hover:bg-[#D1AAF2]/50 text-[#1C0357]"
                  disabled={isBuying}
                >
                  <FileText className="h-4 w-4 mr-2" /> Preview Sheet Music (PDF)
                </Button>
              </div>
            )}
          </div>
          
          {/* Fixed Footer/Action Bar */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-[#1C0357] mr-2" />
              <span className="text-2xl font-bold text-[#1C0357]">{product.currency} {product.price.toFixed(2)}</span>
            </div>
            <Button 
              onClick={() => onBuyNow(product)}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-6 py-3"
              disabled={isBuying}
            >
              {isBuying ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="ml-2 h-5 w-5" />
              )}
              {isBuying ? 'Processing...' : 'Buy Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;