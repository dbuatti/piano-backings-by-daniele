"use client";

import React, { useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Fixed: Changed single quote to double quote
import { Loader2, Edit, Trash2, Store, DollarSign, Link, Image, CheckCircle, XCircle, MinusCircle, UploadCloud, Search, ArrowUpDown, Tag, User, FileText, Key } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } from '@/lib/utils';
import FileInput from '../FileInput'; // Import FileInput
import { PlusCircle } from 'lucide-react'; // Ensure PlusCircle is imported

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
  selected?: boolean; // Added for UI state management
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  artist_name?: string;
  category?: string;
  vocal_ranges?: string[];
  sheet_music_url?: string | null; // New field
  key_signature?: string | null; // New field
  show_sheet_music_url?: boolean; // New field
  show_key_signature?: boolean; // New field
  track_type?: string; // Add track_type here
}

interface ProductFormState {
  id?: string;
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

const ProductManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>({
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
  const [imageFile, setImageFile] = useState<File | null>(null); // State for image file upload in edit dialog
  const [editSheetMusicFile, setEditSheetMusicFile] = useState<File | null>(null); // New state for sheet music file upload in edit dialog
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Helper to truncate URL for display
  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength / 2 - 2);
    const end = url.substring(url.length - maxLength / 2 + 2);
    return `${start}...${end}`;
  };

  // Fetch all products
  const { data: products, isLoading, isError, error: fetchError } = useQuery<Product[], Error>({
    queryKey: ['shopProducts', searchTerm, categoryFilter, sortOption], // Include filters/sort in query key
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*');

      // Apply search term
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,artist_name.ilike.%${searchTerm}%`);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply sorting
      switch (sortOption) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        case 'artist_name_asc':
          query = query.order('artist_name', { ascending: true });
          break;
        case 'artist_name_desc':
          query = query.order('artist_name', { ascending: false });
          break;
        case 'created_at_desc':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for updating a product
  const updateProductMutation = useMutation({
    mutationFn: async (updatedProduct: ProductFormState) => {
      const { id, track_urls, ...fieldsToUpdate } = updatedProduct;
      
      // Filter out unselected tracks and remove the 'selected' property for DB storage
      const tracksToSave = track_urls
        .filter(track => track.selected)
        .map(({ selected, ...rest }) => rest);

      const { data, error } = await supabase
        .from('products')
        .update({
          ...fieldsToUpdate,
          price: parseFloat(fieldsToUpdate.price),
          track_urls: tracksToSave, // Save filtered tracks
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Product Updated", description: "Product details saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] });
      setEditDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: `Failed to update product: ${err.message}`, variant: "destructive" });
    }
  });

  // Mutation for deleting a product
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Product Deleted", description: "Product has been permanently removed." });
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: `Failed to delete product: ${err.message}`, variant: "destructive" });
    }
  });

  // Mutation for toggling product active status
  const toggleProductStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Status Updated", description: `Product marked as ${variables.is_active ? 'active' : 'inactive'}.` });
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: `Failed to update status: ${err.message}`, variant: "destructive" });
    }
  });

  const openEditDialog = (product: Product) => {
    setCurrentProduct(product);
    setProductForm({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price.toFixed(2),
      currency: product.currency,
      image_url: product.image_url || '',
      // Map existing tracks to include 'selected: true' for the UI
      track_urls: product.track_urls?.map(track => ({ ...track, selected: true })) || [],
      is_active: product.is_active,
      artist_name: product.artist_name || '',
      category: product.category || '',
      vocal_ranges: product.vocal_ranges || [],
      sheet_music_url: product.sheet_music_url || '', // Set new field
      key_signature: product.key_signature || '', // Set new field
      show_sheet_music_url: product.show_sheet_music_url ?? true, // Set new field with default
      show_key_signature: product.show_key_signature ?? true, // Set new field with default
      track_type: product.track_type || '', // Set new field with default
    });
    setImageFile(null); // Clear image file state for new edit
    setEditSheetMusicFile(null); // Clear sheet music file state for new edit
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
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
      // If file is cleared, reset image_url to original if it exists, or empty
      setProductForm(prev => ({ ...prev, image_url: currentProduct?.image_url || '' }));
    }
    setFormErrors(prev => ({ ...prev, image_url: '' }));
  };

  const handleEditSheetMusicFileChange = (file: File | null) => {
    setEditSheetMusicFile(file);
    if (file) {
      setProductForm(prev => ({ ...prev, sheet_music_url: URL.createObjectURL(file) })); // For immediate preview
    } else {
      // If file is cleared, reset sheet_music_url to original if it exists, or empty
      setProductForm(prev => ({ ...prev, sheet_music_url: currentProduct?.sheet_music_url || '' }));
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
    if (!productForm.track_type.trim()) errors.track_type = 'Track Type is required.'; // Add validation for track_type
    
    // Validate only selected tracks
    productForm.track_urls.filter(track => track.selected).forEach((track, index) => {
      if (!track.url.trim()) {
        errors[`track_urls[${index}].url`] = `Track URL ${index + 1} is required.`;
      }
      if (!String(track.caption || '').trim()) { // Explicitly convert caption to string for validation
        errors[`track_urls[${index}].caption`] = `Caption for track ${index + 1} is required.`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProduct = async () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please correct the errors in the form.", variant: "destructive" });
      return;
    }
    if (currentProduct) {
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
          return; // Stop update if image upload fails
        }
      } else if (productForm.image_url === '' && currentProduct.image_url) {
        // If image_url is cleared in form but existed before, it means user wants to remove it
        imageUrlToSave = null;
      }

      let sheetMusicUrlToSave = productForm.sheet_music_url;
      if (editSheetMusicFile) {
        try {
          sheetMusicUrlToSave = await uploadFileToStorage(editSheetMusicFile, 'sheet-music', 'shop-sheet-music');
        } catch (uploadError: any) {
          toast({
            title: "Sheet Music Upload Error",
            description: `Failed to upload sheet music: ${uploadError.message}`,
            variant: "destructive",
          });
          return; // Stop update if sheet music upload fails
        }
      } else if (productForm.sheet_music_url === '' && currentProduct.sheet_music_url) {
        // If sheet_music_url is cleared in form but existed before, it means user wants to remove it
        sheetMusicUrlToSave = null;
      }

      updateProductMutation.mutate({ ...productForm, image_url: imageUrlToSave, sheet_music_url: sheetMusicUrlToSave });
    }
  };

  const handleDeleteProduct = () => {
    if (currentProduct?.id) {
      deleteProductMutation.mutate(currentProduct.id);
    }
  };

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <ErrorDisplay error={fetchError} title="Failed to Load Shop Products" />
      </div>
    );
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center">
          <Store className="mr-2 h-5 w-5" />
          Manage Shop Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Edit or delete existing products in your shop.
        </p>

        {/* Filter and Sort Controls for Product Manager */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products by title, artist, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative w-full sm:w-1/3">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="full-song">Full Song</SelectItem>
                <SelectItem value="audition-cut">Audition Cut</SelectItem>
                <SelectItem value="note-bash">Note Bash</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:w-1/3">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="title_asc">Title: A-Z</SelectItem>
                <SelectItem value="title_desc">Title: Z-A</SelectItem>
                <SelectItem value="artist_name_asc">Artist: A-Z</SelectItem>
                <SelectItem value="artist_name_desc">Artist: Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
            <p className="ml-3 text-lg text-gray-600">Loading products...</p>
          </div>
        ) : products && products.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-[#D1AAF2]/20">
                <TableRow><TableHead className="w-[200px]">Title</TableHead><TableHead className="w-[150px]">Artist</TableHead><TableHead className="w-[100px]">Price</TableHead><TableHead className="w-[100px]">Category</TableHead><TableHead className="w-[120px]">Vocal Ranges</TableHead><TableHead className="w-[100px]">Key</TableHead><TableHead className="w-[100px]">PDF</TableHead><TableHead className="w-[100px]">Type</TableHead><TableHead className="w-[100px]">Status</TableHead><TableHead>Tracks</TableHead><TableHead className="text-right w-[150px]">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell className="text-sm text-gray-700">{product.artist_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                        {product.currency} {product.price.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm text-gray-700">{product.category?.replace('-', ' ') || 'N/A'}</TableCell>
                    <TableCell> 
                      {product.vocal_ranges && product.vocal_ranges.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.vocal_ranges.map((range, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {range}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell> {/* New Table Cell for Key Signature */}
                      {product.key_signature && product.show_key_signature ? (
                        <Badge variant="outline" className="text-xs">
                          {product.key_signature}
                        </Badge>
                      ) : (
                        <span className="text-gray-500 text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell> {/* New Table Cell for Sheet Music URL */}
                      {product.sheet_music_url && product.show_sheet_music_url ? (
                        <a href={product.sheet_music_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center text-sm">
                          <FileText className="h-3 w-3 mr-1" /> PDF
                        </a>
                      ) : (
                        <span className="text-gray-500 text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize text-sm text-gray-700"> {/* New Table Cell for Track Type */}
                      {product.track_type?.replace('-', ' ') || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {product.track_urls && product.track_urls.length > 0 ? (
                        <div className="flex flex-col space-y-1">
                          {product.track_urls.map((track, index) => (
                            <a key={index} href={track.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center text-sm max-w-[200px] truncate">
                              <Link className="h-3 w-3 mr-1 flex-shrink-0" />
                              {String(track.caption || truncateUrl(track.url))}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(product)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Products in Shop</h3>
            <p className="mt-1 text-gray-500">
              Add products using the "Repurpose Tracks" section above or manually.
            </p>
          </div>
        )}
      </CardContent>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Edit Product: {currentProduct?.title}
            </DialogTitle>
            <DialogDescription>
              Make changes to the product details, pricing, and associated tracks.
            </DialogDescription>
          </DialogHeader>
          {currentProduct && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-title">Product Title</Label>
                <Input
                  id="edit-title"
                  name="title"
                  value={productForm.title}
                  onChange={handleFormChange}
                  className={cn("mt-1", formErrors.title && "border-red-500")}
                />
                {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
              </div>
              <div>
                <Label htmlFor="edit-artist-name">Artist Name</Label>
                <Input
                  id="edit-artist-name"
                  name="artist_name"
                  value={productForm.artist_name}
                  onChange={handleFormChange}
                  placeholder="e.g., Stephen Schwartz"
                  className={cn("mt-1", formErrors.artist_name && "border-red-500")}
                />
                {formErrors.artist_name && <p className="text-red-500 text-xs mt-1">{formErrors.artist_name}</p>}
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={productForm.description}
                  onChange={handleFormChange}
                  rows={4}
                  className={cn("mt-1", formErrors.description && "border-red-500")}
                />
                {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Price</Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={handleFormChange}
                    className={cn("mt-1", formErrors.price && "border-red-500")}
                  />
                  {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-currency">Currency</Label>
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
                <Label htmlFor="edit-category">Category</Label>
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

              {/* New: Track Type Select in Edit Dialog */}
              <div>
                <Label htmlFor="edit-track_type">Track Type</Label>
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

              {/* New: Vocal Ranges Checkboxes in Edit Dialog */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Vocal Ranges</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Soprano', 'Alto', 'Tenor', 'Bass'].map(range => (
                    <div key={range} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-vocal-range-${range}`}
                        checked={productForm.vocal_ranges.includes(range)}
                        onCheckedChange={(checked) => handleVocalRangeChange(range, checked)}
                      />
                      <Label htmlFor={`edit-vocal-range-${range}`}>{range}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* New: Sheet Music Upload and Key Signature in Edit Dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FileInput
                    id="edit-sheet_music_file_upload"
                    label="Sheet Music (PDF)"
                    icon={FileText}
                    accept=".pdf"
                    onChange={handleEditSheetMusicFileChange}
                    note="Upload a PDF for the sheet music. This will override any existing URL."
                    error={formErrors.sheet_music_url}
                  />
                  {productForm.sheet_music_url && !editSheetMusicFile && (
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
                      id="edit-show_sheet_music_url"
                      name="show_sheet_music_url"
                      checked={productForm.show_sheet_music_url}
                      onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, show_sheet_music_url: checked as boolean }))}
                    />
                    <Label htmlFor="edit-show_sheet_music_url">Show PDF in Shop</Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-key_signature" className="flex items-center">
                    <Key className="mr-2 h-4 w-4" />
                    Key Signature
                  </Label>
                  <Input
                    id="edit-key_signature"
                    name="key_signature"
                    value={productForm.key_signature}
                    onChange={handleFormChange}
                    placeholder="e.g., C Major, A Minor"
                    className={cn("mt-1", formErrors.key_signature && "border-red-500")}
                  />
                  {formErrors.key_signature && <p className="text-red-500 text-xs mt-1">{formErrors.key_signature}</p>}
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="edit-show_key_signature"
                      name="show_key_signature"
                      checked={productForm.show_key_signature}
                      onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, show_key_signature: checked as boolean }))}
                    />
                    <Label htmlFor="edit-show_key_signature">Show Key in Shop</Label>
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
                            id={`edit-track-selected-${index}`}
                            checked={track.selected}
                            onCheckedChange={(checked) => handleTrackChange(index, 'selected', checked as boolean)}
                          />
                          <Label htmlFor={`edit-track-selected-${index}`} className="font-semibold text-sm">
                            Track {index + 1}
                          </Label>
                        </div>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeTrackUrl(index)}>
                          <MinusCircle className="h-4 w-4" /> Remove
                        </Button>
                      </div>
                      
                      <div>
                        <Label htmlFor={`edit-track-url-${index}`} className="text-xs text-gray-500">URL (Not Editable)</Label>
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
                        <Label htmlFor={`edit-track-caption-${index}`} className="text-xs text-gray-500">Caption</Label>
                        <Input
                          id={`edit-track-caption-${index}`}
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
                  id="edit-product-image-upload"
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
                  id="edit-is-active"
                  name="is_active"
                  checked={productForm.is_active}
                  onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, is_active: checked as boolean }))}
                />
                <Label htmlFor="edit-is-active">Active in Shop</Label>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProduct}
              disabled={updateProductMutation.isPending}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90"
            >
              {updateProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Trash2 className="mr-2 h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentProduct?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              disabled={deleteProductMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ProductManager;