import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showError } from '@/utils/toast'; // Updated import
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
        showError("Error", `Failed to load track details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="ml-4 text-lg text-gray-600">Loading track details...</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 text-center">
          <ErrorDisplay error={error} title="Track Loading Error" />
          <Button onClick={() => navigate('/shop')} className="mt-6 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
            Return to Shop
          </Button>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p>Product not found.</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  const firstTrackUrl = product.track_urls && product.track_urls.length > 0 ? product.track_urls[0].url : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#1C0357]">{product.title}</h1>
          <p className="text-lg text-[#1C0357]/90">{product.description}</p>
        </div>
        
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-[#D1AAF2]/20">
            <CardTitle className="text-2xl text-[#1C0357] flex items-center">
              <Music className="mr-2 h-5 w-5" />
              Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Pricing
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="font-medium">{product.currency} {product.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Musical Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Key</p>
                    <p className="font-medium">{product.key}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vocal Range</p>
                    <p className="font-medium">{product.vocal_range.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Track Type</p>
                    <p className="font-medium capitalize">{product.track_type.replace('-', ' ')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {firstTrackUrl && (
              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <Headphones className="mr-2 h-5 w-5" />
                  Audio Sample
                </h3>
                <audio controls src={firstTrackUrl} className="w-full" />
              </div>
            )}
            
            {product.sheet_music_url && (
              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg mb-4 text-[#1C0357] flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Sheet Music
                </h3>
                <a 
                  href={product.sheet_music_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:underline"
                >
                  View Sheet Music PDF <LinkIcon className="ml-1 h-4 w-4" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-center mt-8">
          <Link to="/shop">
            <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3">
              <ShoppingCart className="mr-2 h-4 w-4" /> Back to Shop
            </Button>
          </Link>
        </div>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TrackDetails;