"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from "@/utils/toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Music, DollarSign, Image, Link, PlusCircle, UploadCloud, FileText, Key, MinusCircle, FileAudio } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } from '@/lib/utils';
import FileInput from '../FileInput';
import { TrackInfo } from '@/utils/helpers';

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

const CreateNewProduct: React.FC = () => {
  const queryClient = useQueryClient();

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
      setProductForm(prev => ({ ...prev, sheet_music_url: '' }));
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
        errors[`track_urls[${index}].url`] = `Track URL or file ${index + 1} is required.`
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
          track_urls: tracksToSave,
        }])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`${productForm.title} has been added to the shop!`);
      setProductForm({ // Reset form
        title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
        artist_name: '', category: '', vocal_ranges: [],
        sheet_music_url: '', key_signature: '', show_sheet_music_url: true, show_key_signature: true,
        track_type: '',
      });
      setImageFile(null);
      setSheetMusicFile(null);
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] }); // Invalidate shop products to refresh ProductManager
      queryClient.invalidateQueries({ queryKey: ['shopProductsForRepurpose'] }); // Invalidate for repurpose component
    },
    onError: (err: any) => {
      showError(`Failed to add product: ${err.message}`);
    }
  });

  const handleCreateProduct = async () => {
    if (!validateForm()) {
      showError("Please correct the errors in the form.");
      return;
    }

    let imageUrlToSave = productForm.image_url;
    if (imageFile) {
      try {
        imageUrlToSave = await uploadFileToStorage(imageFile, 'product-images', 'product-images');
      } catch (uploadError: any) {
        console.log('Image upload error:', uploadError);
        showError(`Failed to upload image: ${uploadError.message}`);
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
        showError(`Failed to upload sheet music: ${uploadError.message}`);
        return;
      }
    } else if (productForm.sheet_music_url === '' && sheetMusicFile === null) {
      sheetMusicUrlToSave = null;
    }

    // Process track URLs: upload files and replace with URLs
    const processedTrackUrls: TrackInfo[] = [];
    for (const track of productForm.track_urls) {
      if (track.selected) { // Only process selected tracks
        console.log('Processing track:', track.caption || 'Unnamed');
        let trackUrlToSave = track.url;
        if (track.file) {
          console.log('Starting track file upload:', track.caption || 'Unnamed');
          try {
            trackUrlToSave = await uploadFileToStorage(track.file, 'product-tracks', 'shop-tracks'); // Use 'shop-tracks' folder within 'product-tracks' bucket
            console.log('Track file upload successful, URL:', trackUrlToSave);
          } catch (uploadError: any) {
            console.log('Track upload error:', uploadError);
            showError(`Failed to upload track ${track.caption || track.file.name}: ${uploadError.message}`);
            return; // Stop if any track upload fails
          }
        }
        // Add the processed track (with URL and without file) to the list
        processedTrackUrls.push({ url: trackUrlToSave, caption: track.caption, selected: track.selected });
      }
    }

    console.log('Constructing new product object');
    const newProduct = {
      ...productForm,
      price: parseFloat(productForm.price),
      image_url: imageUrlToSave,
      sheet_music_url: sheetMusicUrlToSave,
      track_urls: processedTrackUrls, // Use the processed track URLs
    }; 
    console.log('Calling createProductMutation.mutate with:', newProduct);
    createProductMutation.mutate(newProduct);
  };

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create New Shop Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Manually add a new product to your shop.
        </p>

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