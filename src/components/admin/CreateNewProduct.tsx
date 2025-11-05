"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo

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
  const { toast } = useToast();
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
  const truncateUrl = (url: string, maxLength: number = 40) => {
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
      // Ensure the track object has a 'file' property if it's being set
      if (field === 'file') {
        newTrackUrls[index] = { ...newTrackUrls[index], file: value as File | null, url: value ? '' : newTrackUrls[index].url }; // Clear URL if file is set
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
      track_urls: [...prev.track_urls, { url: '', caption: '', selected: true, file: null }] // Default to selected, include file
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
      if (!track.url.trim() && !track.file) { // Require either URL or file
        errors[`track_urls[${index}].url`] = `Track URL or file ${index + 1} is required.`;
      }
      if (!String(track.caption || '').trim()) {
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
        .map(({ selected, file, ...rest }) => rest); // Destructure 'selected' and 'file' here

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
    }

    // Process track_urls: upload files if present, otherwise use existing URL
    const processedTrackUrls: TrackInfo[] = [];
    for (const track of productForm.track_urls) {
      if (track.selected) {
        let trackUrlToSave = track.url;
        if (track.file) {
          try {
            trackUrlToSave = await uploadFileToStorage(track.file, 'product-tracks', 'shop-tracks');
          } catch (uploadError: any) {
            toast({
              title: "Track Upload Error",
              description: `Failed to upload track "${track.file.name}": ${uploadError.message}`,
              variant: "destructive",
            });
            return; // Stop product creation if any track upload fails
          }
        }
        processedTrackUrls.push({ url: trackUrlToSave, caption: track.caption });
      }
    }

    const newProduct = {
      ...productForm,
      price: parseFloat(productForm.price),
      image_url: imageUrlToSave,
      sheet_music_url: sheetMusicUrlToSave,
      track_urls: processedTrackUrls, // Use processed track URLs
    };
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
              />
              {productForm.sheet_music_url && sheetMusicFile && (
                <div className="mt-2">
                  <Label className="text-xs text-gray-500">Preview:</Label>
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
                      value={track.url}
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
                      value={String(track.caption || '')}
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
      </CardContent>
    </Card>
  );
};

export default CreateNewProduct;