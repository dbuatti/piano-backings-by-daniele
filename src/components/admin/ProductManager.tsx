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
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash2, Store, DollarSign, Link, Image, CheckCircle, XCircle, Eye } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormState {
  id?: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  image_url: string;
  track_url: string;
  is_active: boolean;
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
    track_url: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch all products
  const { data: products, isLoading, isError, error: fetchError } = useQuery<Product[], Error>({
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

  // Mutation for updating a product
  const updateProductMutation = useMutation({
    mutationFn: async (updatedProduct: ProductFormState) => {
      const { id, ...fieldsToUpdate } = updatedProduct;
      const { data, error } = await supabase
        .from('products')
        .update({
          ...fieldsToUpdate,
          price: parseFloat(fieldsToUpdate.price),
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

  const openEditDialog = (product: Product) => {
    setCurrentProduct(product);
    setProductForm({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price.toFixed(2),
      currency: product.currency,
      image_url: product.image_url || '',
      track_url: product.track_url || '',
      is_active: product.is_active,
    });
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!productForm.title.trim()) errors.title = 'Title is required.';
    if (!productForm.description.trim()) errors.description = 'Description is required.';
    if (!productForm.price.trim() || isNaN(parseFloat(productForm.price))) errors.price = 'Valid price is required.';
    if (!productForm.currency.trim()) errors.currency = 'Currency is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProduct = () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please correct the errors in the form.", variant: "destructive" });
      return;
    }
    if (currentProduct) {
      updateProductMutation.mutate(productForm);
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

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
            <p className="ml-3 text-lg text-gray-600">Loading products...</p>
          </div>
        ) : products && products.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-[#D1AAF2]/20">
                <TableRow>
                  <TableHead className="w-[200px]">Title</TableHead>
                  <TableHead className="w-[100px]">Price</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Track URL</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                        {product.currency} {product.price.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"} className={cn(product.is_active ? "bg-green-500" : "bg-gray-400")}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.track_url ? (
                        <a href={product.track_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center text-sm max-w-[200px] truncate">
                          <Link className="h-3 w-3 mr-1 flex-shrink-0" />
                          {product.track_url.split('/').pop()}
                        </a>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Edit Product: {currentProduct?.title}
            </DialogTitle>
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
                  <Select onValueChange={(value) => setProductForm(prev => ({ ...prev, currency: value }))} value={productForm.currency}>
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
                <Label htmlFor="edit-track-url">Track URL</Label>
                <Input
                  id="edit-track-url"
                  name="track_url"
                  value={productForm.track_url}
                  onChange={handleFormChange}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-image-url">Image URL</Label>
                <Input
                  id="edit-image-url"
                  name="image_url"
                  value={productForm.image_url}
                  onChange={handleFormChange}
                  className="mt-1"
                />
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