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
import { Loader2, Music, DollarSign, Image, Link, PlusCircle, Search, CheckCircle, XCircle, MinusCircle, UploadCloud, FileText, Key } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { format } from 'date-fns';
import { getSafeBackingTypes } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import ProductManager from './ProductManager';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import FileInput from '../FileInput'; // Import FileInput

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
  selected?: boolean; // Added for UI state management
}

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
  track_urls?: { url: string; caption: string | boolean | null | undefined }[]; // Updated here too
  special_requests?: string;
  youtube_link?: string;
  additional_links?: string;
  track_purpose?: string; // Added for dynamic description
  additional_services?: string[]; // Added for dynamic description
  sheet_music_url?: string; // Added for pre-filling
  song_key?: string; // Added for pre-filling
  track_type?: string; // Add track_type here
}

interface Product {
  id: string;
  title: string;
  // Only need title for comparison here
}

interface ProductForm {
  title: string;
  description: string;
  price: string;
  currency: string;
  image_url: string;
  track_urls: TrackInfo[];
  is_active: boolean;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string; // New field
  key_signature: string; // New field
  show_sheet_music_url: boolean; // New field
  show_key_signature: boolean; // New field
  track_type: string; // Add track_type here
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
    track_urls: [],
    is_active: true,
    artist_name: '',
    category: '',
    vocal_ranges: [],
    sheet_music_url: '', // Initialize new field
    key_signature: '', // Initialize new field
    show_sheet_music_url: true, // Default to true
    show_key_signature: true, // Default to true
    track_type: '', // Initialize new field
  });
  const [imageFile, setImageFile] = useState<File | null>(null); // State for image file upload
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Helper to truncate URL for display
  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength / 2 - 2);
    const end = url.substring(url.length - maxLength / 2 + 2);
    return `${start}...${end}`;
  };

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

  // Fetch all shop products (only title and ID for comparison)
  const { data: shopProducts, isLoading: isLoadingShopProducts } = useQuery<Product[], Error>({
    queryKey: ['shopProductsForRepurpose'], // Unique query key
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title'); // Only need ID and title for this purpose
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create a lookup for existing product titles for quick checking
  const [existingProductTitles, setExistingProductTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (shopProducts) {
      const titles = new Set<string>();
      shopProducts.forEach(product => {
        titles.add(product.title.toLowerCase());
      });
      setExistingProductTitles(titles);
    }
  }, [shopProducts]);

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
      const firstName = selectedRequest.name ? selectedRequest.name.split(' ')[0] : selectedRequest.email.split('@')[0];
      
      let autoTitle = selectedRequest.song_title;
      let autoArtist = selectedRequest.musical_or_artist;

      // Auto-populate logic: if song_title contains a hyphen, split it
      const hyphenIndex = selectedRequest.song_title.indexOf(' - ');
      if (hyphenIndex !== -1) {
        autoTitle = selectedRequest.song_title.substring(0, hyphenIndex).trim();
        autoArtist = selectedRequest.song_title.substring(hyphenIndex + 3).trim();
      } else {
        // If no hyphen, use musical_or_artist as artist name
        autoTitle = selectedRequest.song_title;
        autoArtist = selectedRequest.musical_or_artist;
      }

      let defaultDescription = `A high-quality piano backing track for "${autoTitle}" from ${autoArtist}.`;
      
      if (firstName) {
        defaultDescription += ` Originally created for ${firstName}.`;
      }

      const normalizedBackingTypes = getSafeBackingTypes(selectedRequest.backing_type);
      if (normalizedBackingTypes.length > 0) {
        defaultDescription += ` This track is a ${normalizedBackingTypes.map(type => type.replace('-', ' ')).join(' and ')} backing.`;
      }

      if (selectedRequest.track_purpose) {
        defaultDescription += ` It's perfect for ${selectedRequest.track_purpose.replace('-', ' ')}.`;
      } else {
        defaultDescription += ` It's perfect for auditions, practice, or performance.`;
      }

      if (selectedRequest.special_requests) {
        defaultDescription += ` Special notes from the original request: "${selectedRequest.special_requests}".`;
      }

      if (selectedRequest.additional_services && selectedRequest.additional_services.length > 0) {
        defaultDescription += ` Additional services included: ${selectedRequest.additional_services.map(service => service.replace('-', ' ')).join(', ')}.`;
      }
      
      setProductForm({
        title: autoTitle, // Auto-populated title
        description: defaultDescription,
        price: '25.00', // Default price, user can change
        currency: 'AUD',
        image_url: '', // Explicitly empty by default
        // Map existing tracks to include 'selected: true' for the UI
        track_urls: selectedRequest.track_urls?.map(track => ({ ...track, selected: true })) || [],
        is_active: true,
        artist_name: autoArtist, // Auto-populated artist name
        category: normalizedBackingTypes.length > 0 ? normalizedBackingTypes[0] : 'general', // Pre-fill category
        vocal_ranges: [], // Initialize vocal ranges as empty
        sheet_music_url: selectedRequest.sheet_music_url || '', // Pre-fill sheet music URL
        key_signature: selectedRequest.song_key || '', // Pre-fill key signature
        show_sheet_music_url: true, // Default to true
        show_key_signature: true, // Default to true
        track_type: selectedRequest.track_type || '', // Pre-fill track_type from request
      });
      setImageFile(null); // Clear image file when new request is selected
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

  const handleSelectChange = (name: string, value: string) => {
    setProductForm(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleVocalRangeChange = (range: string, checked: boolean | 'indeterminate') => {
    setProductForm(prev => {
      const newRanges = checked
        ? [...prev.vocal_ranges, range]
        : prev.vocal_ranges.filter(r => r !== range);
      setFormErrors(prevErrors => ({ ...prevErrors, vocal_ranges: '' }));
      return { ...prev, vocal_ranges: newRanges };
    });
  };

  const handleTrackChange = (index: number, field: keyof TrackInfo | 'selected', value: string | boolean) => {
    setProductForm(prev => {
      const newTrackUrls = [...prev.track_urls];
      if (field === 'selected') {
        newTrackUrls[index] = { ...newTrackUrls[index], [field]: value as boolean };
      } else {
        newTrackUrls[index] = { ...newTrackUrls[index], [field]: value as string };
      }
      return { ...prev, track_urls: newTrackUrls };
    });
  };

  const addTrackUrl = () => {
    setProductForm(prev => ({
      ...prev,
      track_urls: [...prev.track_urls, { url: '', caption: '', selected: true }] // Default to selected
    }));
  };

  const removeTrackUrl = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      track_urls: prev.track_urls.filter((_, i) => i !== index)
    }));
  };

  const handleImageFileChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      setProductForm(prev => ({ ...prev, image_url: URL.createObjectURL(file) })); // For immediate preview
    } else {
      setProductForm(prev => ({ ...prev, image_url: '' }));
    }
    setFormErrors(prev => ({ ...prev, image_url: '' }));
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `product-images/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!productForm.title.trim()) errors.title = 'Title is required.';
    if (!productForm.description.trim()) errors.description = 'Description is required.';
    if (!productForm.price.trim() || isNaN(parseFloat(productForm.price))) errors.price = 'Valid price is required.';
    if (!productForm.currency.trim()) errors.currency = 'Currency is required.';
    if (!productForm.artist_name.trim()) errors.artist_name = 'Artist Name is required.';
    if (!productForm.category.trim()) errors.category = 'Category is required.';
    if (!productForm.track_type.trim()) errors.track_type = 'Track Type is required.'; // Add validation for track_type
    
    // Validate only selected tracks
    productForm.track_urls.filter(track => track.selected).forEach((track, index) => {
      if (!track.url.trim()) {
        errors[`track_urls[${index}].url`] = `Track URL ${index + 1} is required.`;
      }
      if (!String(track.caption || '').trim()) { // Explicitly convert caption to string for validation
        errors[`track_urls[${index}].caption`] = `Caption for track ${index + 1} is required.`
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Mutation to create a new product
  const createProductMutation = useMutation({
    mutationFn: async (newProduct: Omit<ProductForm, 'price'> & { price: number }) => {
      const { track_urls, ...fieldsToCreate } = newProduct;

      // Filter out unselected tracks and remove the 'selected' property for DB storage
      const tracksToSave = track_urls
        .filter(track => track.selected)
        .map(({ selected, ...rest }) => rest);

      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...fieldsToCreate,
          track_urls: tracksToSave, // Save filtered tracks
        }])
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
        title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
        artist_name: '', category: '', vocal_ranges: [],
        sheet_music_url: '', key_signature: '', show_sheet_music_url: true, show_key_signature: true,
        track_type: '', // Reset new field
      });
      setImageFile(null); // Clear image file
      queryClient.invalidateQueries({ queryKey: ['completedBackingRequests'] }); // Refresh requests
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] }); // Invalidate shop products to refresh ProductManager
      queryClient.invalidateQueries({ queryKey: ['shopProductsForRepurpose'] }); // Invalidate for this component's check
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: `Failed to add product: ${err.message}`,
        variant: "destructive",
      });
    }
  });

  const handleCreateProduct = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    let imageUrlToSave = productForm.image_url;
    if (imageFile) {
      try {
        imageUrlToSave = await uploadImage(imageFile);
      } catch (uploadError: any) {
        toast({
          title: "Image Upload Error",
          description: `Failed to upload image: ${uploadError.message}`,
          variant: "destructive",
        });
        return; // Stop creation if image upload fails
      }
    }

    const newProduct = {
      ...productForm,
      price: parseFloat(productForm.price),
      image_url: imageUrlToSave,
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
    <div className="container mx-auto py-8 space-y-8">
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

            {isLoadingRequests || isLoadingShopProducts ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-[#1C0357]" />
                <p className="ml-2 text-gray-600">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No completed requests found matching your search.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-2">
                {filteredRequests.map(req => {
                  // MODIFICATION 2: Check if request is already in shop
                  const isAlreadyInShop = shopProducts?.some(product =>
                    product.title.toLowerCase().includes(req.song_title.toLowerCase()) &&
                    product.title.toLowerCase().includes(req.musical_or_artist.toLowerCase())
                  );

                  return (
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
                      <div className="flex items-center gap-2">
                        {isAlreadyInShop && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" /> In Shop
                          </Badge>
                        )}
                        {selectedRequest?.id === req.id && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                    </div>
                  );
                })}
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
                  <Label htmlFor="artist_name">Artist Name</Label>
                  <Input
                    id="artist_name"
                    name="artist_name"
                    value={productForm.artist_name}
                    onChange={handleFormChange}
                    placeholder="e.g., Stephen Schwartz"
                    className={cn("mt-1", formErrors.artist_name && "border-red-500")}
                  />
                  {formErrors.artist_name && <p className="text-red-500 text-xs mt-1">{formErrors.artist_name}</p>}
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
                    <Select onValueChange={(value) => handleSelectChange('currency', value)} value={productForm.currency}>
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
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => handleSelectChange('category', value)} value={productForm.category}>
                    <SelectTrigger className={cn("mt-1", formErrors.category && "border-red-500")}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-song">Full Song</SelectItem>
                      <SelectItem value="audition-cut">Audition Cut</SelectItem>
                      <SelectItem value="note-bash">Note Bash</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
                </div>

                {/* New: Track Type Select */}
                <div>
                  <Label htmlFor="track_type">Track Type</Label>
                  <Select onValueChange={(value) => handleSelectChange('track_type', value)} value={productForm.track_type}>
                    <SelectTrigger className={cn("mt-1", formErrors.track_type && "border-red-500")}>
                      <SelectValue placeholder="Select track type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick Reference</SelectItem>
                      <SelectItem value="one-take">One-Take Recording</SelectItem>
                      <SelectItem value="polished">Polished Backing</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.track_type && <p className="text-red-500 text-xs mt-1">{formErrors.track_type}</p>}
                </div>

                {/* New: Vocal Ranges Checkboxes */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Vocal Ranges</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Soprano', 'Alto', 'Tenor', 'Bass'].map(range => (
                      <div key={range} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vocal-range-${range}`}
                          checked={productForm.vocal_ranges.includes(range)}
                          onCheckedChange={(checked) => handleVocalRangeChange(range, checked)}
                        />
                        <Label htmlFor={`vocal-range-${range}`}>{range}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New: Sheet Music URL and Key Signature */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sheet_music_url" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Sheet Music URL (PDF)
                    </Label>
                    <Input
                      id="sheet_music_url"
                      name="sheet_music_url"
                      value={productForm.sheet_music_url}
                      onChange={handleFormChange}
                      placeholder="https://example.com/sheet-music.pdf"
                      className={cn("mt-1", formErrors.sheet_music_url && "border-red-500")}
                    />
                    {formErrors.sheet_music_url && <p className="text-red-500 text-xs mt-1">{formErrors.sheet_music_url}</p>}
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="show_sheet_music_url"
                        name="show_sheet_music_url"
                        checked={productForm.show_sheet_music_url}
                        onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, show_sheet_music_url: checked as boolean }))}
                      />
                      <Label htmlFor="show_sheet_music_url">Show PDF in Shop</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="key_signature" className="flex items-center">
                      <Key className="mr-2 h-4 w-4" />
                      Key Signature
                    </Label>
                    <Input
                      id="key_signature"
                      name="key_signature"
                      value={productForm.key_signature}
                      onChange={handleFormChange}
                      placeholder="e.g., C Major, A Minor"
                      className={cn("mt-1", formErrors.key_signature && "border-red-500")}
                    />
                    {formErrors.key_signature && <p className="text-red-500 text-xs mt-1">{formErrors.key_signature}</p>}
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="show_key_signature"
                        name="show_key_signature"
                        checked={productForm.show_key_signature}
                        onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, show_key_signature: checked as boolean }))}
                      />
                      <Label htmlFor="show_key_signature">Show Key in Shop</Label>
                    </div>
                  </div>
                </div>
                
                {/* Multiple Track URLs Section */}
                <div className="col-span-2 space-y-3 border p-3 rounded-md bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Product Tracks</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTrackUrl}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Track
                    </Button>
                  </div>
                  {productForm.track_urls.length === 0 && (
                    <p className="text-sm text-gray-500">No tracks added yet. Click "Add Track" to start.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {productForm.track_urls.map((track, index) => (
                      <Card key={index} className="p-3 flex flex-col gap-2 bg-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`track-selected-${index}`}
                              checked={track.selected}
                              onCheckedChange={(checked) => handleTrackChange(index, 'selected', checked as boolean)}
                            />
                            <Label htmlFor={`track-selected-${index}`} className="font-semibold text-sm">
                              Track {index + 1}
                            </Label>
                          </div>
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeTrackUrl(index)}>
                            <MinusCircle className="h-4 w-4" /> Remove
                          </Button>
                        </div>
                        
                        <div>
                          <Label htmlFor={`track-url-${index}`} className="text-xs text-gray-500">URL (Not Editable)</Label>
                          <a 
                            href={track.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block text-blue-600 hover:underline text-sm truncate mt-1"
                          >
                            <Link className="h-3 w-3 mr-1 inline-block" />
                            {truncateUrl(track.url, 30)}
                          </a>
                          {formErrors[`track_urls[${index}].url`] && <p className="text-red-500 text-xs mt-1">{formErrors[`track_urls[${index}].url`]}</p>}
                        </div>
                        <div>
                          <Label htmlFor={`track-caption-${index}`} className="text-xs text-gray-500">Caption</Label>
                          <Input
                            id={`track-caption-${index}`}
                            name={`track_urls[${index}].caption`}
                            value={String(track.caption || '')} // Explicitly convert caption to string
                            onChange={(e) => handleTrackChange(index, 'caption', e.target.value)}
                            placeholder="Track Caption (e.g., Main Mix, Instrumental)"
                            className={cn("mt-1", formErrors[`track_urls[${index}].caption`] && "border-red-500")}
                          />
                          {formErrors[`track_urls[${index}].caption`] && <p className="text-red-500 text-xs mt-1">{formErrors[`track_urls[${index}].caption`]}</p>}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <FileInput
                    id="product-image-upload"
                    label="Product Image (optional)"
                    icon={UploadCloud}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    note="Upload a cover image for your product. If left empty, a text-based image will be generated."
                    error={formErrors.image_url}
                  />
                  {productForm.image_url && (
                    <div className="mt-2">
                      <Label className="text-xs text-gray-500">Image Preview:</Label>
                      <img src={productForm.image_url} alt="Product Preview" className="mt-1 h-24 w-auto object-cover rounded-md border" />
                    </div>
                  )}
                  {formErrors.image_url && <p className="text-red-500 text-xs mt-1">{formErrors.image_url}</p>}
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