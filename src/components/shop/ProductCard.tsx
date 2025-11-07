import React, { useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Music, DollarSign, Eye, ShoppingCart, Loader2, Mask, Tag, Key, Mic, Headphones, Sparkles, PlayCircle, PauseCircle, FileText } from 'lucide-react'; // Added FileText
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrackInfo } from '@/utils/helpers';
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

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => Promise<void>;
  isBuying: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, onBuyNow, isBuying }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
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
    <Card className="group flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full border border-gray-200 bg-white min-h-[400px]">
      <CardHeader className="p-0 relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            />
          ) : (
            <div 
              className="flex items-center justify-center w-full h-full text-white p-4 text-center transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundColor: '#ff08b0', fontFamily: '"Playfair Display", serif' }}
            >
              <h3 className="text-2xl md:text-3xl font-bold leading-snug">
                {product.title} {product.artist_name && `- ${product.artist_name}`}
              </h3>
            </div>
          )}
        </AspectRatio>
        
        {/* Top Right: Track Type Icon (New) */}
        {trackIcon && (
          <div className="absolute top-2 right-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "p-2 rounded-full bg-white/90 shadow-lg",
                  trackIcon.color
                )}>
                  <trackIcon.Icon className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{trackIcon.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

      </CardHeader>
      <CardContent className="flex-1 p-4 bg-[#D1AAF2]/10"> {/* Lighter purple background */}
        <CardTitle className="text-xl font-bold text-[#1C0357] mb-0 leading-tight">{product.title}</CardTitle>
        {product.artist_name && (
          <p className="text-sm text-gray-700 mb-2 leading-tight flex items-center">
            <Mask className="h-4 w-4 mr-2 text-gray-500" /> {product.artist_name}
          </p>
        )}
        
        {/* Moved Category and Vocal Ranges here */}
        <div className="flex flex-wrap gap-1 mb-2">
          {product.category && (
            <Badge 
              variant="default" 
              className="bg-[#1C0357] text-white capitalize text-xs px-2 py-0.5 rounded-full font-semibold"
            >
              {product.category.replace('-', ' ')}
            </Badge>
          )}
          {product.vocal_ranges && product.vocal_ranges.length > 0 && product.vocal_ranges.map(range => (
            <Badge key={range} variant="secondary" className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
              {range}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-gray-600 line-clamp-3 mb-3">{product.description}</p>
        
        {product.key_signature && product.show_key_signature && (
          <div className="flex items-center text-gray-700 text-sm mb-1">
            <Key className="h-4 w-4 mr-2 text-purple-500" /> {product.key_signature}
          </div>
        )}
        {product.show_sheet_music_url && product.sheet_music_url && (
          <div className="flex items-center text-gray-700 text-sm mb-3">
            <FileText className="h-4 w-4 mr-2 text-green-500" /> Sheet Music Available
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-[#1C0357] mr-1" />
            <span className="text-xl font-bold text-[#1C0357]">{product.currency} {product.price.toFixed(2)}</span>
          </div>
          {firstTrackUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePlayPause} 
                  className="text-[#1C0357] hover:bg-[#1C0357]/10"
                >
                  {isPlaying ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
                  <span className="sr-only">{isPlaying ? 'Pause Sample' : 'Play Sample'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? 'Pause Sample' : 'Play 10-sec Sample'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {firstTrackUrl && (
          <audio ref={audioRef} src={firstTrackUrl} onEnded={handleAudioEnded} preload="none" className="hidden" />
        )}
      </CardContent>
      <CardFooter className="p-4 border-t bg-[#D1AAF2]/30 flex flex-col gap-2 w-full">
        <Button 
          variant="secondary" 
          onClick={() => onViewDetails(product)}
          className="bg-white hover:bg-gray-100 text-[#1C0357] border border-[#1C0357]/20 w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        <Button 
          onClick={() => onBuyNow(product)} 
          className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white w-full"
          disabled={isBuying}
        >
          {isBuying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" />
          )}
          {isBuying ? 'Processing...' : 'Buy Now'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;