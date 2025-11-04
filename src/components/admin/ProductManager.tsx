import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash2, Store, DollarSign, Link, PlusCircle, MinusCircle } from 'lucide-react'; // Removed unused icons
import ErrorDisplay from '@/components/ErrorDisplay';
import { cn } from '@/lib/utils';

interface TrackInfo {
  url: string;
  caption: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string | null;
  track_urls?: TrackInfo[]; // Changed to array of TrackInfo objects
  is_active: boolean;
}

const ProductManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackCaption, setNewTrackCaption] = useState('');

  const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('title', { ascending: true });
    if (error) throw error;
    return data;
  };

  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const addProductMutation = useMutation<Product, Error, Omit<Product, 'id'>>({
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Product Added", description: "New product created successfully." });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (err) => {
      toast({ title: "Error", description: `Failed to add product: ${err.message}`, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation<Product, Error, Product>({
    mutationFn: async (updatedProduct) => {
      const { data, error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', updatedProduct.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Product Updated", description: "Product details saved successfully." });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (err) => {
      toast({ title: "Error", description: `Failed to update product: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Product Deleted", description: "Product removed successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: `Failed to delete product: ${err.message}`, variant: "destructive" });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (editingProduct) {
      if (!editingProduct.title || !editingProduct.description || !editingProduct.price || !editingProduct.currency) {
        toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
        return;
      }
      if (editingProduct.id) {
        updateProductMutation.mutate(editingProduct);
      } else {
        addProductMutation.mutate(editingProduct);
      }
    }
  };

  const handleAddTrack = () => {
    if (editingProduct && newTrackUrl && newTrackCaption) {
      const updatedTracks = [...(editingProduct.track_urls || []), { url: newTrackUrl, caption: newTrackCaption }];
      setEditingProduct({ ...editingProduct, track_urls: updatedTracks });
      setNewTrackUrl('');
      setNewTrackCaption('');
    } else {
      toast({ title: "Validation Error", description: "Please provide both URL and caption for the track.", variant: "destructive" });
    }
  };

  const handleRemoveTrack = (indexToRemove: number) => {
    if (editingProduct) {
      const updatedTracks = editingProduct.track_urls?.filter((_, index) => index !== indexToRemove) || [];
      setEditingProduct({ ...editingProduct, track_urls: updatedTracks });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
        <p className="ml-4 text-lg text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (isError) {
    return <ErrorDisplay message={error?.message || "Failed to load products."} />;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-[#1C0357] flex items-center justify-between">
          <span className="flex items-center">
            <Store className="mr-2" />
            Product Manager
          </span>
          <Button onClick={() => { setEditingProduct({ id: '', title: '', description: '', price: 0, currency: 'AUD', is_active: true, track_urls: [] }); setIsDialogOpen(true); }} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Tracks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">{product.description}</TableCell>
                  <TableCell>{product.currency} {product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? "default" : "destructive"} className={product.is_active ? "bg-green-500" : "bg-red-500"}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.track_urls && product.track_urls.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {product.track_urls.map((track, index) => (
                          <li key={index} className="truncate">{track.caption}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500 text-sm">No tracks</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct?.id ? 'Make changes to your product here.' : 'Create a new product to sell in the shop.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={editingProduct?.title || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={editingProduct?.description || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={editingProduct?.price || 0}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>
              <Input
                id="currency"
                value={editingProduct?.currency || 'AUD'}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, currency: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image_url" className="text-right">
                Image URL
              </Label>
              <Input
                id="image_url"
                value={editingProduct?.image_url || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                Active
              </Label>
              <Checkbox
                id="is_active"
                checked={editingProduct?.is_active || false}
                onCheckedChange={(checked) => setEditingProduct(prev => prev ? { ...prev, is_active: checked as boolean } : null)}
                className="col-span-3"
              />
            </div>

            {/* Track URLs Section */}
            <div className="col-span-4 border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">Tracks</h3>
              {editingProduct?.track_urls?.map((track, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input value={track.caption} readOnly className="flex-1" />
                  <Input value={track.url} readOnly className="flex-1" />
                  <Button variant="destructive" size="icon" onClick={() => handleRemoveTrack(index)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-2 mt-4">
                <Input
                  placeholder="Track Caption"
                  value={newTrackCaption}
                  onChange={(e) => setNewTrackCaption(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Track URL"
                  value={newTrackUrl}
                  onChange={(e) => setNewTrackUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddTrack} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={addProductMutation.isPending || updateProductMutation.isPending}>
              {addProductMutation.isPending || updateProductMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProductManager;