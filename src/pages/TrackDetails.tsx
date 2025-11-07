import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Info, // For tooltip
  ShoppingCart,
  PlayCircle, // For audio player
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
  description: string;
  price: number;
  currency: string;
  track_type: 'quick' | 'one-take' | 'polished';
  key: string;
  vocal_range: string[]; // Array of strings like ['Soprano', 'Alto']
  sheet_music_url: string | null;
  track_urls: TrackInfo[]; // Assuming this contains the sample
  created_at: string;
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
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex items-center justify-center">
        <p className="text-[#1C0357]">Loading track details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex items-center justify-center">
        <p className="text-[#1C0357]">Track not found.</p>
      </div>
    );
  }

  // Helper for track type tooltip
  const getTrackTypeDescription = (type: string) => {
    switch (type) {
      case 'quick': return 'Fast voice memo for quick learning.';
      case 'one-take': return 'Single-pass recording, may contain minor imperfections.';
      case 'polished': return 'Refined, accurate track with correct notes and rhythm.';
      default: return '';
    }
  };

  // Assuming the first track_url is the sample for preview
  const audioSample = product.track_urls && product.track_urls.length > 0 ? product.track_urls[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-[#1C0357] text-white py-4 px-6 rounded-t-lg">
            <CardTitle className="text-3xl font-bold flex items-center">
              <Music className="mr-3 h-7 w-7" />
              {product.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center text-gray-600 mb-4 gap-x-4 gap-y-2">
              <span className="flex items-center">
                <Key className="h-4 w-4 mr-1 text-[#F538BC]" />
                Key: {product.key}
              </span>
              <span className="flex items-center">
                <Headphones className="h-4 w-4 mr-1 text-[#F538BC]" />
                Type: {product.track_type.charAt(0).toUpperCase() + product.track_type.slice(1)}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTrackTypeDescription(product.track_type)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              {/* Vocal Range moved here */}
              {product.vocal_range && product.vocal_range.length > 0 && (
                <span className="flex items-center">
                  <Music className="h-4 w-4 mr-1 text-[#F538BC]" />
                  Vocal Range:
                  {product.vocal_range.map((range, index) => (
                    <Badge key={index} variant="secondary" className="ml-1 bg-[#D1AAF2] text-[#1C0357] hover:bg-[#D1AAF2]/80">
                      {range}
                    </Badge>
                  ))}
                </span>
              )}
            </div>

            {/* Audio Preview Section - Moved up */}
            {audioSample && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-3 flex items-center text-[#1C0357]">
                  <PlayCircle className="mr-2 h-5 w-5 text-[#F538BC]" />
                  10-Second Audio Sample
                </h3>
                <audio controls className="w-full">
                  <source src={audioSample.url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                {audioSample.caption && <p className="text-sm text-gray-600 mt-2">{audioSample.caption}</p>}
              </div>
            )}

            {product.sheet_music_url && (
              <div className="mb-6">
                <Link to={product.sheet_music_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full py-3 text-lg border-[#1C0357] text-[#1C0357] hover:bg-[#D1AAF2]/20">
                    <FileText className="mr-2 h-5 w-5" />
                    Preview Sheet Music (Preview Cut)
                  </Button>
                </Link>
              </div>
            )}

            <p className="text-gray-700 mb-6 leading-relaxed">
              {product.description}
            </p>

            <div className="flex items-center justify-between mb-6">
              <span className="text-4xl font-extrabold text-[#1C0357] flex items-center">
                <DollarSign className="h-8 w-8 mr-2 text-[#F538BC]" />
                {product.currency} {product.price.toFixed(2)}
              </span>
              <Button className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white text-lg px-8 py-3 rounded-lg">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Buy Now
              </Button>
            </div>

            <div className="text-sm text-gray-500 mt-8">
              Created on: {format(new Date(product.created_at), 'MMM dd, yyyy')}
            </div>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TrackDetails;