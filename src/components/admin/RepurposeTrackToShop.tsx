"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Switch } from "@/components/ui/switch"; // Import Switch
import { Loader2, Music, DollarSign, Image, Link, PlusCircle, Search, CheckCircle, XCircle, MinusCircle, UploadCloud, FileText, Key } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { format } from 'date-fns';
import { getSafeBackingTypes } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import FileInput from '../FileInput';
import { TrackInfo } from '@/utils/helpers';
import { FileAudio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateProductDescriptionFromRequest } from '@/utils/productDescriptionGenerator';

interface BackingRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  song_title: string;
  musical_or_artist: string;
  backing_type: string[]; 
  delivery_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  is_paid: boolean;
  track_urls?: { url: string; caption: string | boolean | null | undefined }[];
  special_requests?: string;
  youtube_link?: string;
  additional_links?: string;
  track_purpose: string; 
  additional_services: string[];
  sheet_music_url?: string;
  song_key: string;
  track_type: string;
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
  master_download_link: string; // NEW FIELD
}

// Helper to truncate URL for display
const truncateUrl = (url: string | null, maxLength: number = 40) => {
  if (!url) return 'N/A';
  if (url.length <= maxLength) return url;
  const start = url.substring(0, maxLength / 2 - 2);
  const end = url.substring(url.length - maxLength / 2 + 2);
  return `${start}...${end}`;
};

// Helper to derive filename from URL
const getFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const filenameWithQuery = parts[parts.length - 1];
    const filename = filenameWithQuery.split('?')[0];
    return decodeURIComponent(filename);
  } catch (e) {
    return 'Unnamed Track';
  }
};

// Function to generate a descriptive caption (kept for Option B)
const generateDescriptiveCaption = (request: BackingRequest, originalCaption: string | boolean | null | undefined, trackUrl: string): string => {
  // Start with Song Title - Artist Name
  const parts = [];
  if (request.song_title) parts.push(request.song_title);
  if (request.musical_or_artist) parts.push(request.musical_or_artist);

  let descriptiveDetails = [];
  
  // 1. Include the original caption (e.g., "Full Mix", "Audition Cut")
  // This is crucial for distinguishing multiple tracks from the same request.
  const originalCaptionString = typeof originalCaption === 'string' ? originalCaption.trim() : '';
  if (originalCaptionString) descriptiveDetails.push(originalCaptionString);
    
  // 2. Include Key and Track Type
  if (request.song_key) descriptiveDetails.push(request.song_key);
  if (request.track_type) descriptiveDetails.push(request.track_type.replace('-', ' '));

  // Remove duplicates if the original caption already contains the key/type info
  const uniqueDetails = [...new Set(descriptiveDetails)];

  let newCaption = '';
  if (parts.length > 0) {
    newCaption = parts.join(' - ');
    if (uniqueDetails.length > 0) {
      newCaption += ` (${uniqueDetails.join(', ')})`;
    }
  } else {
    newCaption = 'Untitled Track';
  }

  // 3. Append file extension if missing
  const urlParts = trackUrl.split('/');
  const filenameWithExt = urlParts[urlParts.length - 1].split('?')[0];
  const urlExtensionMatch = filenameWithExt.match(/\.([0-9a-z]+)$/i);
  const urlExtension = urlExtensionMatch?.[1] || '';
  
  if (urlExtension && !newCaption.toLowerCase().endsWith(`.${urlExtension.toLowerCase()}`)) {
    newCaption += `.${urlExtension}`;
  } else if (!urlExtension && trackUrl.includes('/tracks/') && !newCaption.includes('.')) {
    newCaption += '.mp3';
  }

  return newCaption;
};


const RepurposeTrackToShop: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isFormPreFilled, setIsFormPreFilled] = useState(false);
  const [useFilenameCaption, setUseFilenameCaption] = useState(true); // NEW: Caption toggle state
  
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
    master_download_link: '', // NEW FIELD
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sheetMusicFile, setSheetMusicFile] = useState<File | null>(null);
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
      // Ensure required fields are present and typed correctly when fetched
      return data?.map(req => ({
        ...req,
        backing_type: getSafeBackingTypes(req.backing_type),
        song_key: req.song_key || '',
        additional_services: req.additional_services || [],
        track_type: req.track_type || '',
      })) || [];
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

  // Filter requests based on search term
  const filteredRequests = requests?.filter(req => 
    req.song_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.musical_or_artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Derived state for selected requests objects
  const selectedRequests = useMemo(() => {
    return requests?.filter(req => selectedRequestIds.includes(req.id)) || [];
  }, [selectedRequestIds, requests]);

  // --- Function to pre-fill the form based on current selection ---
  const preFillForm = useCallback(() => {
    if (selectedRequests.length === 0) {
      setIsFormPreFilled(false);
      return;
    }

    const firstRequest = selectedRequests[0];
    const isBundle = selectedRequests.length > 1;
    
    // 1. Aggregate ALL Track URLs from ALL selected requests
    const aggregatedTrackUrls: TrackInfo[] = [];
    selectedRequests.forEach(req => {
      req.track_urls?.forEach(track => {
        if (track.url) {
          // Use the current caption logic based on the toggle state
          const captionToUse = useFilenameCaption 
            ? getFilenameFromUrl(track.url)
            : generateDescriptiveCaption(req, track.caption, track.url);

          aggregatedTrackUrls.push({ 
            url: track.url, 
            caption: captionToUse, 
            selected: true, 
            file: null 
          });
        }
      });
    });

    // 2. Determine Title and Artist
    let autoTitle = firstRequest.song_title;
    let autoArtist = firstRequest.musical_or_artist;
    let autoCategory = getSafeBackingTypes(firstRequest.backing_type).length > 0 ? getSafeBackingTypes(firstRequest.backing_type)[0] : 'general';
    let autoTrackType = firstRequest.track_type || '';
    let autoKeySignature = firstRequest.song_key || '';
    let autoSheetMusicUrl = firstRequest.sheet_music_url || '';

    if (isBundle) {
      const artistNames = [...new Set(selectedRequests.map(r => r.musical_or_artist))];
      const songTitles = selectedRequests.map(r => r.song_title);
      
      autoTitle = `Bundle: ${songTitles.join(', ').substring(0, 100)}...`;
      autoArtist = artistNames.join(', ');
      autoCategory = 'full-song'; // Default bundle category
      autoTrackType = 'polished'; // Default bundle track type
      autoKeySignature = 'Various';
      autoSheetMusicUrl = ''; // Clear sheet music for bundles unless manually set
    } else {
      // Single request logic (kept for clarity)
      const hyphenIndex = firstRequest.song_title.indexOf(' - ');
      if (hyphenIndex !== -1) {
        autoTitle = firstRequest.song_title.substring(0, hyphenIndex).trim();
        autoArtist = firstRequest.song_title.substring(hyphenIndex + 3).trim();
      } else {
        autoTitle = firstRequest.song_title;
        autoArtist = firstRequest.musical_or_artist;
      }
    }
    
    // 3. Generate Description (using the first request as a template if not a bundle)
    const descriptionSource = isBundle ? firstRequest : firstRequest;
    const generatedDescription = generateProductDescriptionFromRequest({ ...descriptionSource, track_purpose: descriptionSource.track_purpose || '' });
    
    setProductForm(prev => ({
      ...prev,
      title: autoTitle,
      description: generatedDescription,
      price: isBundle ? '50.00' : '25.00', // Suggest a higher price for bundles
      track_urls: aggregatedTrackUrls,
      artist_name: autoArtist,
      category: autoCategory,
      sheet_music_url: autoSheetMusicUrl,
      key_signature: autoKeySignature,
      track_type: autoTrackType,
      master_download_link: '', // Clear master link on pre-fill
    }));
    setImageFile(null);
    setSheetMusicFile(null);
    setFormErrors({});
    setIsFormPreFilled(true); // Mark form as pre-filled
  }, [selectedRequests, useFilenameCaption]); // Depend on useFilenameCaption

  // Effect to re-run preFillForm when the caption toggle changes, if the form is already filled
  useEffect(() => {
    if (isFormPreFilled && selectedRequestIds.length > 0) {
      preFillForm();
    }
  }, [useFilenameCaption, isFormPreFilled, selectedRequestIds, preFillForm]); // Only run when the toggle changes or form is filled

  // --- End Function to pre-fill the form based on current selection ---

  const handleToggleRequestSelection = (requestId: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleClearSourceRequest = () => {
    setSelectedRequestIds([]);
    setIsFormPreFilled(false); // Reset form visibility
    setProductForm({
      title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
      artist_name: '', category: '', vocal_ranges: [], sheet_music_url: '', key_signature: '', show_key_signature: true, show_sheet_music_url: true,
      track_type: '', master_download_link: '',
    });
    setImageFile(null);
    setSheetMusicFile(null);
    toast({
      title: "Source Cleared",
      description: "The form has been reset.",
    });
  };

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

  const handleVocalRangeChange = useCallback((range: string, checked: boolean | 'indeterminate') => {
    setProductForm(prev => {
      const newRanges = checked
        ? [...prev.vocal_ranges, range]
        : prev.vocal_ranges.filter(r => r !== range);
      setFormErrors(prevErrors => ({ ...prevErrors, vocal_ranges: '' }));
      return { ...prev, vocal_ranges: newRanges };
    });
  }, [setProductForm, setFormErrors]);

  const handleTrackChange = (index: number, field: keyof TrackInfo | 'selected' | 'file', value: string | boolean | File | null) => {
    setProductForm(prev => {
      const newTrackUrls = [...prev.track_urls];
      const currentTrack = { ...newTrackUrls[index] }; // Create a copy to modify

      if (field === 'file') {
        currentTrack.file = value as File | null;
        if (value) { // If a file is selected, clear the URL
          currentTrack.url = null;
        }
      } else if (field === 'url') {
        currentTrack.url = value as string | null;
        if (value) { // If a URL is entered, clear the file
          currentTrack.file = null;
        }
      } else {
        (currentTrack as any)[field] = value; 
      }
      newTrackUrls[index] = currentTrack;
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
      // If clearing the file input, revert to the original URL if a request was selected, otherwise clear
      setProductForm(prev => ({ ...prev, sheet_music_url: selectedRequests.length > 0 ? selectedRequests[0].sheet_music_url || '' : '' }));
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
      if (!track.url && !track.file) {
        errors[`track_urls[${index}].url`] = `Track URL or file ${index + 1} is required.`
      }
      if (!track.caption.trim()) {
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
        .map(({ selected, file, ...rest }) => rest);

      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...fieldsToCreate,
          track_urls: tracksToSave,
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
      setSelectedRequestIds([]);
      setIsFormPreFilled(false); // Reset form visibility
      setProductForm({
        title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
        artist_name: '', category: '', vocal_ranges: [], sheet_music_url: '', key_signature: '', show_key_signature: true, show_sheet_music_url: true,
        track_type: '', master_download_link: '',
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
        console.log('Image upload error:', uploadError);
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
      console.log('Starting sheet music upload...');
      try {
        sheetMusicUrlToSave = await uploadFileToStorage(sheetMusicFile, 'sheet-music', 'shop-sheet-music');
        console.log('Sheet music upload successful, URL:', sheetMusicUrlToSave);
      } catch (uploadError: any) {
        console.log('Sheet music upload error:', uploadError);
        toast({
          title : "Sheet Music Upload Error",
          description: `Failed to upload sheet music: ${uploadError.message}`,
          variant: "destructive",
        });
        return;
      }
    } else if (productForm.sheet_music_url === '' && sheetMusicFile === null) {
      sheetMusicUrlToSave = null;
    }

    // Process track URLs: upload files and replace with URLs
    const processedTrackUrls: TrackInfo[] = [];
    for (const track of productForm.track_urls) {
      if (track.selected) {
        console.log('Processing track:', track.caption || 'Unnamed');
        let trackUrlToSave = track.url;
        if (track.file) {
          console.log('Starting track file upload:', track.caption || 'Unnamed');
          try {
            trackUrlToSave = await uploadFileToStorage(track.file, 'product-tracks', 'shop-tracks');
            console.log('Track file upload successful, URL:', trackUrlToSave);
          } catch (uploadError: any) {
            console.log('Track upload error:', uploadError);
            toast({
              title: "Track Upload Error",
              description: `Failed to upload track ${track.caption || track.file.name}: ${uploadError.message}`,
              variant: "destructive",
            });
            return;
          }
        }
        processedTrackUrls.push({ url: trackUrlToSave, caption: track.caption, selected: track.selected });
      }
    }

    const newProduct = {
      ...productForm,
      price: parseFloat(productForm.price),
      image_url: imageUrlToSave,
      sheet_music_url: sheetMusicUrlToSave,
      track_urls: processedTrackUrls,
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
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Select one or more completed backing track requests to create a new product or bundle for your shop.
        </p>

        <div className="mb-6 border-b pb-6">
          <h3 className="font-semibold text-md text-[#1C0357] mb-2 flex items-center">
            <span className="bg-[#D1AAF2] text-[#1C0357] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs">1</span>
            Select Completed Request(s)
          </h3>
          
          {/* Selection List */}
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
                
                const isSelected = selectedRequestIds.includes(req.id);

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-md transition-colors cursor-pointer",
                      isSelected ? 'bg-[#D1AAF2]/20 border-[#1C0357]' : 'bg-gray-50 hover:bg-gray-100'
                    )}
                    onClick={() => handleToggleRequestSelection(req.id)}
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
                      <Checkbox
                        checked={isSelected}
                        // The click handler on the div handles the state change
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Action Buttons for Selection */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {selectedRequestIds.length} request(s) selected.
            </p>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={handleClearSourceRequest}
                disabled={selectedRequestIds.length === 0}
              >
                Clear Selection
              </Button>
              <Button 
                onClick={preFillForm}
                disabled={selectedRequestIds.length === 0 || isFormPreFilled}
                className="bg-[#1C0357] hover:bg-[#1C0357]/90"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {selectedRequestIds.length > 1 ? 'Create Bundle' : 'Define Product'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Conditional rendering of the product form */}
      {isFormPreFilled ? (
        <CardContent>
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
                      <SelectValue />
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
                    note="Upload a PDF for the sheet music. This will be available for preview."
                    error={formErrors.sheet_music_url}
                    file={sheetMusicFile}
                  />
                  {productForm.sheet_music_url && sheetMusicFile && (
                    <div className="mt-2">
                      <Label className="text-xs text-gray-500">Preview:</Label>
                      <a href={productForm.sheet_music_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline text-sm truncate mt-1">
                        {truncateUrl(productForm.sheet_music_url, 30)}
                      </a>
                    </div>
                  )}
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
                    placeholder="e.g., C Major, A Minor, Various"
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
              
              {/* NEW: Master Download Link Override */}
              <div className="border-t pt-4">
                <Label htmlFor="master_download_link" className="flex items-center text-base font-medium">
                  <Link className="mr-2 h-5 w-5" />
                  Master Download Link (Optional Override)
                </Label>
                <Input
                  id="master_download_link"
                  name="master_download_link"
                  value={productForm.master_download_link}
                  onChange={handleFormChange}
                  placeholder="https://dropbox.com/sh/..."
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">If provided, this link will be used instead of individual track downloads on the purchase confirmation page and delivery email.</p>
              </div>

              <div className="col-span-2 space-y-3 border p-3 rounded-md bg-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Product Tracks ({productForm.track_urls.filter(t => t.selected).length} selected)</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="caption-toggle"
                        checked={useFilenameCaption}
                        onCheckedChange={setUseFilenameCaption}
                      />
                      <Label htmlFor="caption-toggle" className="text-sm">
                        {useFilenameCaption ? 'Use MP3 Filename' : 'Use Rewritten Name'}
                      </Label>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addTrackUrl}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Track
                    </Button>
                  </div>
                </div>
                {productForm.track_urls.length === 0 && (
                  <p className="text-sm text-gray-500">No tracks added yet. Click "Add Track" to start.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {productForm.track_urls.map((track, index) => (
                    <Card key={index} className={cn("p-3 flex flex-col gap-2 bg-white shadow-sm", !track.selected && "opacity-50")}>
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
                          disabled={!!track.file}
                        />
                        {formErrors[`track_urls[${index}].url`] && <p className="text-red-500 text-xs mt-1">{formErrors[`track_urls[${index}].url`]}</p>}
                      </div>
                      
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
                            disabled={!!track.url}
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
                          value={track.caption}
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
                  file={imageFile}
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
                    Add Product
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
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-center text-gray-500 py-4">Select one or more completed requests above to define a new product or bundle.</p>
        </CardContent>
      )}
    </Card>
  );
};

export default RepurposeTrackToShop;