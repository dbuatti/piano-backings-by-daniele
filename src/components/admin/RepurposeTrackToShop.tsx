import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Music, Link, PlusCircle, Search, CheckCircle, MinusCircle } from 'lucide-react'; // Removed unused icons
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } from '@/lib/utils';

interface TrackInfo {
  url: string;
  caption: string;
}

interface BackingRequest {
  id: string;
  song_title: string;
  musical_or_artist: string;
  track_urls?: TrackInfo[];
  description?: string; // Assuming description might be present or derived
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[];
  is_active: boolean;
}

interface RepurposeTrackToShopProps {
  requestId: string;
  onClose: () => void;
}

const RepurposeTrackToShop: React.FC<RepurposeTrackToShopProps> = ({ requestId, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState(0);
  const [productCurrency, setProductCurrency] = useState('AUD');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedTracks, setSelectedTracks] = useState<TrackInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Create a lookup for existing product titles for quick checking (Removed as it was unused)
  // const [existingProductTitles, setExistingProductTitles] = useState<Set<string>>(new Set());

  const fetchRequestDetails = async (): Promise<BackingRequest> => {
    const { data, error } = await supabase
      .from('backing_requests')
      .select('id, song_title, musical_or_artist, track_urls, special_requests')
      .eq('id', requestId)
      .single();
    if (error) throw error;
    return data;
  };

  const fetchExistingProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('title')
      .order('title', { ascending: true });
    if (error) throw error;
    return data;
  };

  const { data: request, isLoading: isLoadingRequest, error: requestError } = useQuery<BackingRequest, Error>({
    queryKey: ['requestDetailsForRepurpose', requestId],
    queryFn: fetchRequestDetails,
    enabled: !!requestId,
  });

  const { data: existingProducts, isLoading: isLoadingExistingProducts } = useQuery<Product[], Error>({
    queryKey: ['existingProductTitles'],
    queryFn: fetchExistingProducts,
    onSuccess: (data) => {
      // setExistingProductTitles(new Set(data.map(p => p.title.toLowerCase()))); // Removed as it was unused
    },
  });

  useEffect(() => {
    if (request) {
      setProductTitle(`${request.song_title} Backing Track`);
      setProductDescription(request.description || `A high-quality piano backing track for ${request.song_title} by ${request.musical_or_artist}.`);
      setSelectedTracks(request.track_urls || []);
    }
  }, [request]);

  const createProductMutation = useMutation<Product, Error, Omit<Product, 'id'>>({
    mutationFn: async (newProduct) => {
      const { data, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate product list in ProductManager
      toast({ title: "Product Created", description: "Track successfully repurposed to a shop product." });
      onClose();
    },
    onError: (err) => {
      toast({ title: "Error", description: `Failed to create product: ${err.message}`, variant: "destructive" });
    },
  });

  const handleCreateProduct = () => {
    if (!productTitle || !productDescription || productPrice <= 0 || selectedTracks.length === 0) {
      toast({ title: "Validation Error", description: "Please fill all required fields and add at least one track.", variant: "destructive" });
      return;
    }

    // if (existingProductTitles.has(productTitle.toLowerCase())) { // Removed as it was unused
    //   toast({ title: "Validation Error", description: "A product with this title already exists. Please choose a unique title.", variant: "destructive" });
    //   return;
    // }

    createProductMutation.mutate({
      title: productTitle,
      description: productDescription,
      price: productPrice,
      currency: productCurrency,
      image_url: productImageUrl || null,
      track_urls: selectedTracks,
      is_active: isActive,
    });
  };

  const handleToggleTrack = (track: TrackInfo) => {
    setSelectedTracks(prev =>
      prev.some(t => t.url === track.url)
        ? prev.filter(t => t.url !== track.url)
        : [...prev, track]
    );
  };

  const filteredTracks = request?.track_urls?.filter(track =>
    track.caption.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Music className="mr-2 h-5 w-5" /> Repurpose Track to Shop
          </DialogTitle>
          <DialogDescription>
            Create a new shop product from this backing request's tracks.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoadingRequest ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
              <p className="ml-3 text-gray-600">Loading request details...</p>
            </div>
          ) : requestError ? (
            <ErrorDisplay message={requestError.message || "Failed to load request details."} />
          ) : (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productTitle" className="text-right">
                  Title
                </Label>
                <Input
                  id="productTitle"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productDescription" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="productDescription"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productPrice" className="text-right">
                  Price
                </Label>
                <Input
                  id="productPrice"
                  type="number"
                  value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productCurrency" className="text-right">
                  Currency
                </Label>
                <Input
                  id="productCurrency"
                  value={productCurrency}
                  onChange={(e) => setProductCurrency(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productImageUrl" className="text-right">
                  Image URL
                </Label>
                <Input
                  id="productImageUrl"
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Active
                </Label>
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked as boolean)}
                  className="col-span-3"
                />
              </div>

              <div className="col-span-4 border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <Link className="mr-2 h-5 w-5" /> Select Tracks
                </h3>
                <div className="relative mb-3">
                  <Input
                    placeholder="Search tracks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
                {request.track_urls && request.track_urls.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    {filteredTracks.map((track, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`track-${index}`}
                          checked={selectedTracks.some(t => t.url === track.url)}
                          onCheckedChange={() => handleToggleTrack(track)}
                        />
                        <Label htmlFor={`track-${index}`} className="flex-1 text-sm">
                          {track.caption}
                        </Label>
                        <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">View</a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No tracks available for this request.</p>
                )}
                {selectedTracks.length === 0 && (
                  <p className="text-red-500 text-xs mt-2">Please select at least one track.</p>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreateProduct}
            disabled={createProductMutation.isPending || !request || selectedTracks.length === 0}
          >
            {createProductMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" /> Create Product
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepurposeTrackToShop;