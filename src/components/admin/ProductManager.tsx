"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from "@/utils/toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Music, DollarSign, Image, Link, PlusCircle, Search, CheckCircle, XCircle, MinusCircle, UploadCloud, FileText, Key, Edit, Trash2 } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } from '@/lib/utils';
import FileInput from '../FileInput';
import { TrackInfo } from '@/utils/helpers';
import ProductDetailDialog from '../shop/ProductDetailDialog';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  track_urls: TrackInfo[];
  is_active: boolean;
  created_at: string;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string | null;
  key_signature: string | null;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
}

interface ProductForm {
  title: string;
  description: string;
  price: string; // Keep as string for input
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

const ProductManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({
    title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
    artist_name: '', category: '', vocal_ranges: [], sheet_music_url: '', key_signature: '',
    show_sheet_music_url: true, show_key_signature: true, track_type: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sheetMusicFile, setSheetMusicFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productDetailDialogOpen, setProductDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Helper to truncate URL for display
  const truncateUrl = (url: string | null, maxLength: number = 40) => {
    if (!url) return 'N/A';
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength / 2 - 2);
    const end = url.substring(url.length - maxLength / 2 + 2);
    return `${start}...${end}`;
  };

  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['shopProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredProducts = products?.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.artist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        title: editingProduct.title,
        description: editingProduct.description,
        price: editingProduct.price.toFixed(2),
        currency: editingProduct.currency,
        image_url: editingProduct.image_url,
        track_urls: editingProduct.track_urls.map(track => ({ ...track, selected: true, file: null })), // Add selected and file for editing
        is_active: editingProduct.is_active,
        artist_name: editingProduct.artist_name,
        category: editingProduct.category,
        vocal_ranges: editingProduct.vocal_ranges,
        sheet_music_url: editingProduct.sheet_music_url || '',
        key_signature: editingProduct.key_signature || '',
        show_sheet_music_url: editingProduct.show_sheet_music_url,
        show_key_signature: editingProduct.show_key_signature,
        track_type: editingProduct.track_type,
      });
      setImageFile(null); // Clear file input for new upload
      setSheetMusicFile(null);
      setFormErrors({});
    } else {
      // Reset form when not editing
      setProductForm({
        title: '', description: '', price: '', currency: 'AUD', image_url: '', track_urls: [], is_active: true,
        artist_name: '', category: '', vocal_ranges: [], sheet_music_url: '', key_signature: '',
        show_sheet_music_url: true, show_key_signature: true, track_type: '',
      });
      setImageFile(null);
      setSheetMusicFile(null);
      setFormErrors({});
    }
  },