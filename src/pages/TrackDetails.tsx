import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Music,
  Key,
  Headphones,
  DollarSign,
  FileText,
  Info,
  ShoppingCart,
  PlayCircle,
  Calendar,
  Users,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined;
}

interface Product {
  id: string;
  title: string;
  artist_name?: string; // Added for better title (assuming it exists or can be added)
  description: string;
  price: number;
  currency: string;
  track_type: 'quick' | 'one-take' | 'polished';
  key_signature?: string; // Renamed to match common term
  vocal_ranges: string[]; // Renamed to array
  sheet_music_url: string | null;
  track_urls: TrackInfo[];
  created_at: string;
  image_url?: string; // Placeholder for future cover art
}

const TrackDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError("Track ID is missing.");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data as Product);
      } catch (err: any) {
        console.error("Error fetching product:", err);
        setError(`Failed to load track details: ${err.message}`);
        toast({
          title: "Error",
          description: `Failed to load track details: ${err.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <PlayCircle className="h-12 w-12 animate-pulse text-[#EC4899] mx-auto mb-4" />
          <p className="text-xl text-gray-700">Loading track details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-red-600 mb-4">{error || "Track not found."}</p>
          <Link to="/shop">
            <Button variant="outline" size="lg">Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getTrackTypeDescription = (type: string) => {
    switch (type) {
      case 'quick': return 'Fast voice memo-style recording for quick reference and learning.';
      case 'one-take': return 'Single-take live recording – authentic feel with possible minor imperfections.';
      case 'polished': return 'Professionally refined track with precise notes, rhythm, and dynamics.';
      default: return '';
    }
  };

  const audioSample = product.track_urls?.[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="overflow-hidden shadow-2xl border-0">
          {/* Hero Header */}
          <div className="bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] p-10 text-white">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              {product.title}
              {product.artist_name && <span className="block text-2xl md:text-4xl font-medium mt-2 opacity-90">by {product.artist_name}</span>}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm md:text-base">
              <span className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Key: {product.key_signature || product.key || 'N/A'}
              </span>
              <span className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Vocal Ranges:{' '}
                {product.vocal_ranges.map((range) => (
                  <Badge key={range} variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                    {range}
                  </Badge>
                ))}
              </span>
            </div>
          </div>

          <CardContent className="p-8 md:p-12">
            {/* Audio Preview - Prominent */}
            {audioSample && (
              <div className="mb-12 p-8 bg-gradient-to-r from-[#8B5CF6]/5 to-[#EC4899]/5 rounded-2xl border border-purple-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <PlayCircle className="mr-3 h-8 w-8 text-[#EC4899]" />
                  Listen to a Preview
                </h2>
                <audio controls controlsList="nodownload" className="w-full h-12">
                  <source src={audioSample.url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                {audioSample.caption && <p className="text-sm text-gray-600 mt-3 italic">{audioSample.caption}</p>}
                <p className="text-sm text-gray-500 mt-4">Full high-quality track available instantly after purchase.</p>
              </div>
            )}

            {/* Track Quality Badge */}
            <div className="mb-8 flex items-center">
              <Headphones className="h-6 w-6 mr-3 text-[#8B5CF6]" />
              <span className="text-lg font-semibold capitalize">{product.track_type.replace('-', ' ')} Quality</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-5 w-5 ml-2 text-gray-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{getTrackTypeDescription(product.track_type)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Separator className="my-10" />

            {/* Description */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">About This Track</h3>
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Price & CTA */}
            <div className="bg-gray-50 rounded-2xl p-8 mb-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <p className="text-5xl font-black text-[#8B5CF6] flex items-center">
                    {product.currency} {product.price.toFixed(2)}
                  </p>
                  <p className="text-gray-600 mt-2">Instant download • High-quality MP3 • No DRM</p>
                </div>
                <Button
                  size="lg"
                  className="bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-bold text-xl px-12 py-8 rounded-full shadow-xl transition-all hover:scale-105"
                  onClick={() => {
                    // Integrate your buy handler here (same as shop)
                    toast({ title: "Redirecting to checkout..." });
                  }}
                >
                  <ShoppingCart className="mr-3 h-7 w-7" />
                  Buy Now & Download Instantly
                </Button>
              </div>
            </div>

            {/* Sheet Music */}
            {product.sheet_music_url && (
              <div className="mb-10">
                <Button asChild variant="outline" size="lg" className="w-full py-8 text-lg border-2 border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/5 rounded-xl">
                  <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-3 h-7 w-7" />
                    Preview Sheet Music (PDF)
                  </a>
                </Button>
              </div>
            )}

            <Separator className="my-10" />

            {/* Footer Info */}
            <div className="text-sm text-gray-500 flex items-center justify-center">
              <Calendar className="h-4 w-4 mr-2" />
              Added on {format(new Date(product.created_at), 'MMMM d, yyyy')}
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <Link to="/shop">
            <Button variant="link" size="lg" className="text-[#8B5CF6] hover:text-[#EC4899]">
              ← Back to All Tracks
            </Button>
          </Link>
        </div>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default TrackDetails;