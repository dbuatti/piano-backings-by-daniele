import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from '@/hooks/use-toast';
import {
  Store, AlertCircle, CheckCircle, Search, ArrowUpDown
} from 'lucide-react'; // Removed Loader2
import ProductCard from '@/components/ProductCard';
import ProductDetailDialog from '@/components/ProductDetailDialog';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

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
  image_url?: string;
  track_urls?: TrackInfo[];
  is_active: boolean;
}

const Shop = () => {
  const { toast } = useToast();
  const [isProductDetailDialogOpen, setIsProductDetailDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title-asc'); // Default sort by title ascending

  const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true) // Only fetch active products
      .order('title', { ascending: true }); // Default order
    if (error) throw error;
    return data;
  };

  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['shopProducts'],
    queryFn: fetchProducts,
  });

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDetailDialogOpen(true);
  };

  const handleBuyNow = async (product: Product) => {
    setIsBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const customerEmail = session?.user?.email || 'guest@example.com'; // Fallback for guest

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          productId: product.id,
          userId: userId,
          customerEmail: customerEmail,
          amount: product.price,
          currency: product.currency,
        },
      });

      if (error) throw error;

      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased "${product.title}". Check your email for download links or your dashboard if logged in.`,
        variant: "default",
      });

      // Optionally redirect to user dashboard or a confirmation page
      if (userId) {
        // navigate('/user-dashboard?tab=my-purchases');
      }

    } catch (err: any) {
      console.error('Error during purchase:', err);
      toast({
        title: "Purchase Failed",
        description: err.message || "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
      setIsProductDetailDialogOpen(false);
    }
  };

  const sortedAndFilteredProducts = (products || [])
    .filter(product =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      } else if (sortBy === 'price-asc') {
        return a.price - b.price;
      } else if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Our Shop</h1>
          <p className="text-xl font-light text-[#1C0357]/90">Browse and purchase high-quality backing tracks</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-1/2">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-gray-700 text-sm">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p>Loading products...</p>
          </div>
        ) : isError ? (
          <Card className="border-red-300 bg-red-50 text-red-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Error Loading Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error?.message || 'Failed to load products.'}</p>
              <p className="mt-2 text-sm">Please try again later.</p>
            </CardContent>
          </Card>
        ) : sortedAndFilteredProducts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-8">
            <Store className="mx-auto h-20 w-20 text-gray-400 mb-4" />
            <h3 className="mt-4 text-2xl font-semibold text-gray-900">No Products Found</h3>
            <p className="mt-2 text-lg text-gray-600">
              We couldn't find any products matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedAndFilteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={handleViewDetails}
                onBuyNow={handleBuyNow}
                isBuying={isBuying}
              />
            ))}
          </div>
        )}

        <ProductDetailDialog
          isOpen={isProductDetailDialogOpen}
          onOpenChange={setIsProductDetailDialogOpen}
          product={selectedProduct}
          onBuyNow={handleBuyNow}
          isBuying={isBuying}
        />

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Shop;