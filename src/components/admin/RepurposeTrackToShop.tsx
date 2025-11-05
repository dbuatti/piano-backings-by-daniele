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
import { Badge } from '@/components/ui/badge';
import FileInput from '../FileInput';
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo
import { FileAudio } from 'lucide-react'; // Added FileAudio import

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
  track_urls?: { url: string; caption: string | boolean | null | undefined }[];
  special_requests?: string;
  youtube_link?: string;
  additional_links?: string;
  track_purpose?: string;
  additional_services?: string[];
  sheet_music_url?: string;
  song_key?: string;
  track_type?: string;
  category?: string;
}

interface Product {
  id: string;
  title: string;
  artist_name?: string;
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
  sheet_music_url: string;
  key_signature: string;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
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
    sheet_music_url: '',
    key_signature: '',
    show_sheet_music_url: true,
    show_key_signature: true,
    track_type: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sheetMusicFile, setSheetMusicFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Helper to truncate URL for display
  const truncateUrl = (url: string | null, maxLength: number = 40) => {
    if (!url) return 'N/A';
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength / 2 - 2);
    const end = url.substring(url.length - maxLength / 2 + 2);
    return `${start}...${end}`;
  };

  // Function to generate a descriptive caption
  const generateDescriptiveCaption = (request: BackingRequest, originalCaption: string | boolean | null | undefined, trackUrl: string): string => {
    const normalizedBackingTypes = getSafeBackingTypes(request.backing_type);
    const primaryCategory = normalizedBackingTypes.length > 0 ? normalizedBackingTypes[0] : request.category || 'general';

    const parts = [];
    if (request.song_title) parts.push(request.song_title);
    if (request.musical_or_artist) parts.push(request.musical_or_artist);

    let descriptiveDetails = [];
    if (primaryCategory && primaryCategory !== 'general') descriptiveDetails.push(primaryCategory.replace('-', ' '));
    if (request.song_key) descriptiveDetails.push(request.song_key);
    if (request.track_type) descriptiveDetails.push(request.track_type.replace('-', ' '));

    let newCaption = '';
    if (parts.length > 0) {
      newCaption = parts.join(' - ');
      if (descriptiveDetails.length > 0) {
        newCaption += ` (${descriptiveDetails.join(', ')})`;
      }
    } else {
      newCaption = 'Untitled Track';
    }

    const urlExtensionMatch = trackUrl.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
    const urlExtension = urlExtensionMatch?.[1] || ''; // Safely access urlExtensionMatch[1]
    
    if (urlExtension && !newCaption.toLowerCase().endsWith(`.${urlExtension.toLowerCase()}`)) {
      newCaption += `.${urlExtension}`;
    } else if (!urlExtension && trackUrl.includes('/tracks/') && !newCaption.includes('.')) {
      newCaption += '.mp3';
    }

    return newCaption;
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
    queryKey: ['shopProductsForRepurpose'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, artist_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
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

      const hyphenIndex = selectedRequest.song_title.indexOf(' - ');
      if (hyphenIndex !== -1) {
        autoTitle = selectedRequest.song_title.substring(0, hyphenIndex).trim();
        autoArtist = selectedRequest.song_title.substring(hyphenIndex + 3).trim();
      } else {
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
      
      const newTrackUrls = selectedRequest.track_urls?.map(track => {
        const originalCaption = track.caption;
        let captionToUse = String(originalCaption || ''); // Ensure caption is a string

        const urlParts = track.url.split('/');
        const filenameFromUrlWithExt = urlParts[urlParts.length - 1].split('?')[0];
        const filenameFromUrlWithoutExt = filenameFromUrlWithExt.split('.').slice(0, -1).join('.');

        const isGenericCaption = 
          captionToUse === '' || 
          captionToUse.toLowerCase() === 'true' ||
          captionToUse === filenameFromUrlWithExt ||
          captionToUse === filenameFromUrlWithoutExt;

        if (isGenericCaption) {
          captionToUse = generateDescriptiveCaption(selectedRequest, originalCaption, track.url);
        }
        
        return { url: track.url, caption: captionToUse, selected: true };
      }) || [];

      setProductForm({
        title: autoTitle,
        description: defaultDescription,
        price: '25.00',
        currency: 'AUD',
        image_url: '',
        track_urls: newTrackUrls,
        is_active: true,
        artist_name: autoArtist,
        category: normalizedBackingTypes.length > 0 ? normalizedBackingTypes[0] : 'general',
        vocal_ranges: [],
        sheet_music_url: selectedRequest.sheet_music_url || '',
        key_signature: selectedRequest.song_key || '',
        show_sheet_music_url: true,
        show_key_signature: true,
        track_type: selectedRequest.track_type || '',
      });
      setImageFile(null);
      setSheetMusicFile(null);
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

  const handleTrackChange = (index: number, field: keyof TrackInfo | 'selected' | 'file', value: string | boolean | File | null) => {
    setProductForm(prev => {
      const newTrackUrls = [...prev.track_urls];
      // Ensure the track object has a 'file' property if it's being set
      if (field === 'file') {
        newTrackUrls[index] = { ...newTrackUrls[index], file: value as File | null, url: value ? null : newTrackUrls[index].url }; // Clear URL if file is set, set to null
      } else if (field === 'url') {
        newTrackUrls[index] = { ...newTrackUrls[index], url: value as string, file: value ? null : newTrackUrls[index].file }; // Clear file if URL is set
      } else {
        (newTrackUrls[index] as any)[field] = value; 
      }
      return { ...prev, track_urls: newTrackUrls };
    });
  };

  const addTrackUrl = () => {
    setProductForm(prev => ({
      ...prev,
      track_urls: [...prev.track_urls, { url: null, caption: '', selected: true, file: null }] // Default to selected, include file, url is null
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
      setProductForm(prev => ({ ...prev, image_url: URL.createObjectURL(file) }));
    } else {
      setProductForm(prev => ({ ...prev, image_url: '' }));
    }
    setFormErrors(prev => ({ ...prev, image_url: '' }));
  };

  const handleSheetMusicFileChange = (file: File | null) => {
    setSheetMusicFile(file);
    if (file) {
      setProductForm(prev => ({ ...prev, sheet_music_url: URL.createObjectURL(file) }));
    } else {
      setProductForm(prev => ({ ...prev, sheet_music_url: selectedRequest?.sheet_music_url || '' }));
    }
    setFormErrors(prev => ({ ...prev, sheet_music_url: '' }));
  };

  const uploadFileToStorage = async (file: File, bucketName: string, folderName: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderName}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
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
    if (!productForm.track_type.trim()) errors.track_type = 'Track Type is required.';
    
    productForm.track_urls.filter(track => track.selected).forEach((track, index) => {
      if (!track.url && !track.file) { // Require either URL or file
        errors[`track_urls[${index}].url`] = `Track URL or file ${index + 1} is required.`;
      }
      if (!track.caption.trim()) { // Caption must be a non-empty string
        errors[`track_urls[${index}].caption`] = `Caption for track ${index + 1} is required.`
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createProductMutation = useMutation({
    mutationFn: async (newProduct: Omit<ProductForm, 'price'> & { price: number }) => {
      const { track_urls, ...fieldsToCreate } = newProduct;

      const tracksToSave = track_urls
        .filter(track => track.selected)
        .map(({ selected, file, ...rest }) => rest); // Destructures 'selected' and 'file'

      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...fieldsToCreate,
          track_urls: tracksToSave, // This is the array being inserted
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
      setSelectedRequest(null);
      setProductForm({
        title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
        artist_name: '', category: '', vocal_ranges: [],
        sheet_music_url: '', key_signature: '', show_sheet_music_url: true, show_key_signature: true,
        track_type: '',
      });
      setImageFile(null);
      setSheetMusicFile(null);
      queryClient.invalidateQueries({ queryKey: ['completedBackingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] });
      queryClient.invalidateQueries({ queryKey: ['shopProductsForRepurpose'] });
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
        imageUrlToSave = await uploadFileToStorage(imageFile, 'product-images', 'product-images');
      } catch (uploadError: any) {
        toast({
          title: "Image Upload Error",
          description: `Failed to upload image: ${uploadError.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    let sheetMusicUrlToSave = productForm.sheet_music_url;
    if (sheetMusicFile) {
      try {
        sheetMusicUrlToSave = await uploadFileToStorage(sheetMusicFile, 'sheet-music', 'shop-sheet-music');
      } catch (uploadError: any) {
        toast({
          title: "Sheet Music Upload Error",
          description: `Failed to upload sheet music: ${uploadError.message}`,
          variant: "destructive",
        });
        return;
      }
    } else if (productForm.sheet_music_url === '' && selectedRequest?.sheet_music_url) {
      sheetMusicUrlToSave = null;
    }


    const newProduct = {
      ...productForm,
      price: parseFloat(productForm.price),
      image_url: imageUrlToSave,
      sheet_music_url: sheetMusicUrlToSave,
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
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <Music className="mr-2 h-5 w-5" />
          Repurpose Tracks to Shop
        </CardTitle>
      </CardHeader>
      <CardContent> {/* This CardContent wraps the request selection */}
        <p className="text-sm text-gray-600 mb-4">
          Select a completed backing track request to create a new product for your shop.
        </p>

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
                let derivedTitle = req.song_title;
                let derivedArtist = req.musical_or_artist;

                const hyphenIndex = req.song_title.indexOf(' - ');
                if (hyphenIndex !== -1) {
                  derivedTitle = req.song_title.substring(0, hyphenIndex).trim();
                  derivedArtist = req.song_title.substring(hyphenIndex + 3).trim();
                }

                const isAlreadyInShop = shopProducts?.some(product =>
                  product.title.toLowerCase().trim() === derivedTitle.toLowerCase().trim() &&
                  product.artist_name?.toLowerCase().trim() === derivedArtist.toLowerCase().trim()
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
      </CardContent> {/* Closing CardContent for request selection */}

      {/* Conditional rendering of the product form or placeholder message, each wrapped in its own CardContent */}
      {selectedRequest ? (
        <CardContent> {/* This CardContent contains the form */}
          <div> {/* This div contains the h3 and form fields */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FileInput
                    id="sheet_music_file_upload"
                    label="Sheet Music (PDF)"
                    icon={FileText}
                    accept=".pdf"
                    onChange={handleSheetMusicFileChange}
                    note="Upload a PDF for the sheet music. This will override any existing URL."
                    error={formErrors.sheet_music_url}
                  />
                  {productForm.sheet_music_url && !sheetMusicFile && (
                    <div className="mt-2">
                      <Label className="text-xs text-gray-500">Existing URL:</Label>
                      <a href={productForm.sheet_music_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline text-sm truncate mt-1">
                        {truncateUrl(productForm.sheet_music_url, 30)}
                      </a>
                    </div>
                  )}
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
                        <Label htmlFor={`track-url-${index}`} className="text-xs text-gray-500">URL (Optional, if uploading file)</Label>
                        <Input
                          id={`track-url-${index}`}
                          name={`track_urls[${index}].url`}
                          value={track.url || ''}
                          onChange={(e) => handleTrackChange(index, 'url', e.target.value)}
                          placeholder="https://example.com/track.mp3"
                          className={cn("mt-1", formErrors[`track_urls[${index}].url`] && "border-red-500")}
                          disabled={!!track.file} // Disable if a file is selected
                        />
                        {formErrors[`track_urls[${index}].url`] && <p className="text-red-500 text-xs mt-1">{formErrors[`track_urls[${index}].url`]}</p>}
                      </div>
                      
                      {/* Replaced FileInput with standard input for audio upload */}
                      <div className="space-y-1">
                        <Label htmlFor={`track-file-upload-${index}`} className="flex items-center text-sm mb-1">
                              <FileAudio className="mr-1" size={14} />
                              Upload Audio File (Optional)
                            </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`track-file-upload-${index}`}
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleTrackChange(index, 'file', e.target.files ? e.target.files[0] : null)}
                            className="flex-1"
                            disabled={!!track.url} // Disable if a URL is entered
                          />
                        </div>
                        {track.file && (
                          <p className="text-xs text-gray-500 mt-1">Selected: {track.file.name}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Upload an audio file (e.g., MP3) for this track. This will override any URL above.</p>
                      </div>

                      <div>
                        <Label htmlFor={`track-caption-${index}`} className="text-xs text-gray-500">Caption</Label>
                        <Input
                          id={`track-caption-${index}`}
                          name={`track_urls[${index}].caption`}
                          value={track.caption} // Caption is now always a string
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
          </div> {/* Closing div for form content */}
        </CardContent>
      ) : (
        <CardContent> {/* This CardContent contains the "select a request" message */}
          <p className="text-center text-gray-500 py-4">Select a completed request above to define a new product.</p>
        </CardContent>
      )}
    </Card>
  );
};

export default RepurposeTrackToShop;