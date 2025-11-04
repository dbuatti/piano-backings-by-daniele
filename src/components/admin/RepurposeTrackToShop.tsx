"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Music, DollarSign, Image, Link, PlusCircle, Search, CheckCircle, XCircle } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { format } from 'date-fns';
import { getSafeBackingTypes } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import ProductManager from './ProductManager'; // Import the new ProductManager

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string | string[];
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: { url: string; caption: string }[];
  special_requests?: string;
  youtube_link?: string;
  additional_links?: string;
}

interface ProductForm {
  title: string;
  description: string;
  price: string; // Use string for input, convert to number for DB
  currency: string;
  image_url: string;
  track_url: string;
  is_active: boolean;
}

const RepurposeTrackToShop: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<BackingRequest | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({
    title: '',
    description: '',
    price: '',
    currency: 'AUD',
    image_url: '',
    track_url: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch completed backing requests
  const { data: requests, isLoading: isLoadingRequests, isError: isErrorRequests, error: requestsError } = useQuery<BackingRequest[], Error>({
    queryKey: ['completedBackingRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backing_requests')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter requests based on search term
  const filteredRequests = requests?.filter(req => 
    req.song_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.musical_or_artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pre-fill form when a request is selected
  useEffect(() => {
    if (selectedRequest) {
      const defaultTitle = `${selectedRequest.song_title} - ${selectedRequest.musical_or_artist} Backing Track`;
      const defaultDescription = `A high-quality piano backing track for "${selectedRequest.song_title}" from ${selectedRequest.musical_or_artist}. Originally created for ${selectedRequest.name || selectedRequest.email}. Perfect for auditions, practice, or performance.`;
      const defaultTrackUrl = selectedRequest.track_urls && selectedRequest.track_urls.length > 0 
        ? selectedRequest.track_urls[0].url 
        : '';

      setProductForm({
        title: defaultTitle,
        description: defaultDescription,
        price: '25.00', // Default price, user can change
        currency: 'AUD',
        image_url: '', // Explicitly empty by default
        track_url: defaultTrackUrl,
        is_active: true,
      });
      setFormErrors({});
    }
  }, [selectedRequest]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setProductForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setProductForm(prev => ({ ...prev, [name]: value }));
    }
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!productForm.title.trim()) errors.title = 'Title is required.';
    if (!productForm.description.trim()) errors.description = 'Description is required.';
    if (!productForm.price.trim() || isNaN(parseFloat(productForm.price))) errors.price = 'Valid price is required.';
    if (!productForm.currency.trim()) errors.currency = 'Currency is required.';
    // track_url is optional for now, as it might be a preview or full track
    // if (!productForm.track_url.trim()) errors.track_url = 'Track URL is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Mutation to create a new product
  const createProductMutation = useMutation({
    mutationFn: async (newProduct: Omit<ProductForm, 'price'> & { price: number }) => {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Product Added",
        description: `${productForm.title} has been added to the shop!`,
      });
      setSelectedRequest(null); // Clear selection
      setProductForm({ // Reset form
        title: '', description: '', price: '', currency: 'AUD', image_url: '', track_url: '', is_active: true,
      });
      queryClient.invalidateQueries({ queryKey: ['completedBackingRequests'] }); // Refresh requests
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] }); // Invalidate shop products to refresh ProductManager
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: `Failed to add product: ${err.message}`,
        variant: "destructive",
      });
    }
  });

  const handleCreateProduct = () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    const newProduct = {
      ...productForm,
      price: parseFloat(productForm.price),
    };
    createProductMutation.mutate(newProduct);
  };

  if (isErrorRequests) {
    return (
      <div className="container mx-auto py-8">
        <ErrorDisplay error={requestsError} title="Failed to Load Backing Requests" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8"> {/* Added space-y-8 for spacing between sections */}
      <Card className="shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1C0357] flex items-center">
            <Music className="mr-2 h-5 w-5" />
            Repurpose Tracks to Shop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Select a completed backing track request to create a new product for your shop.
          </p>

          {/* Step 1: Select a Completed Request */}
          <div className="mb-6 border-b pb-6">
            <h3 className="font-semibold text-md text-[#1C0357] mb-2 flex items-center">
              <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">1</span>
              Select Completed Request
            </h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search completed requests by song, artist, or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoadingRequests}
              />
            </div>

            {isLoadingRequests ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-[#1C0357]" />
                <p className="ml-2 text-gray-600">Loading completed requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No completed requests found matching your search.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-2">
                {filteredRequests.map(req => (
                  <div
                    key={req.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors",
                      selectedRequest?.id === req.id ? 'bg-[#D1AAF2]/20 border-[#1C0357]' : 'bg-gray-50 hover:bg-gray-100'
                    )}
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div>
                      <p className="font-medium text-sm">{req.song_title} by {req.musical_or_artist}</p>
                      <p className="text-xs text-gray-500">Client: {req.name || req.email} | Submitted: {format(new Date(req.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                    {selectedRequest?.id === req.id && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Define Product Details */}
          {selectedRequest && (
            <div>
              <h3 className="font-semibold text-md text-[#1C0357] mb-2 flex items-center">
                <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">2</span>
                Define Product Details
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Product Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={productForm.title}
                    onChange={handleFormChange}
                    placeholder="e.g., Defying Gravity - Piano Backing Track"
                    className={cn("mt-1", formErrors.title && "border-red-500")}
                  />
                  {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={productForm.description}
                    onChange={handleFormChange}
                    placeholder="A detailed description of the product..."
                    rows={4}
                    className={cn("mt-1", formErrors.description && "border-red-500")}
                  />
                  {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={handleFormChange}
                      placeholder="e.g., 25.00"
                      className={cn("mt-1", formErrors.price && "border-red-500")}
                    />
                    {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select onValueChange={(value) => setProductForm(prev => ({ ...prev, currency: value }))} value={productForm.currency}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="track_url">Track URL (for direct download/preview)</Label>
                  <Input
                    id="track_url"
                    name="track_url"
                    value={productForm.track_url}
                    onChange={handleFormChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">This is the URL for the actual track file that customers will download. It can be a preview or the full track.</p>
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL (optional)</Label>
                  <Input
                    id="image_url"
                    name="image_url"
                    value={productForm.image_url}
                    onChange={handleFormChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use the auto-generated text image. Provide a URL for a custom cover image.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    name="is_active"
                    checked={productForm.is_active}
                    onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, is_active: checked as boolean }))}
                  />
                  <Label htmlFor="is_active">Active in Shop</Label>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleCreateProduct}
                  disabled={createProductMutation.isPending}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  {createProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Product...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add to Shop
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Manager Section */}
      <ProductManager />
    </div>
  );
};

export default RepurposeTrackToShop;