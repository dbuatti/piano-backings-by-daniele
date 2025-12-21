"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import ProductCard from '@/components/shop/ProductCard';
import ProductDetailDialog from '@/components/shop/ProductDetailDialog';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Headphones, Mic, Search, Filter, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Seo from '@/components/Seo';

const Shop = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isBuying, setIsBuying] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchTerm, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,artist_name.ilike.%${searchTerm}%`);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleBuyNow = async (product: any) => {
    setIsBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session ? `Bearer ${session.access_token}` : `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ product_id: product.id })
        }
      );

      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to create checkout session');
      }
    } catch (error: any) {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2]/10 to-[#F1E14F]/5">
      <Seo 
        title="Shop Backing Tracks | Piano Backings by Daniele"
        description="Browse and purchase high-quality piano backing tracks for your next performance or practice session."
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1C0357] mb-4">The Backing Track Shop</h1>
          <p className="text-xl text-[#1C0357]/80">Instant downloads for classic and contemporary tracks</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input 
              placeholder="Search by song or artist..." 
              className="pl-10 h-12 text-lg shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="full-song">Full Songs</SelectItem>
              <SelectItem value="audition-cut">Audition Cuts</SelectItem>
              <SelectItem value="note-bash">Note Bash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products?.length ? (
            products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onViewDetails={setSelectedProduct}
                onBuyNow={handleBuyNow}
                isBuying={isBuying}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <Music className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-2xl font-bold text-[#1C0357]">No tracks found</h3>
              <p className="text-gray-600">Try adjusting your filters or check back later.</p>
            </div>
          )}
        </div>

        {/* Track Quality Legend Overlay */}
        <div className="my-16 px-4">
          <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm border border-[#D1AAF2]/50 rounded-2xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-[#1C0357] mb-6 text-center">
              Track Quality Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-pink-100 rounded-full mb-4 shadow-lg">
                  <Sparkles className="h-10 w-10 text-[#F538BC]" />
                </div>
                <h4 className="font-semibold text-[#1C0357] text-lg mb-2">Polished Backing</h4>
                <p className="text-gray-700 text-sm">
                  Fully produced, multi-layered piano accompaniment with professional mixing and effects.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-yellow-100 rounded-full mb-4 shadow-lg">
                  <Headphones className="h-10 w-10 text-yellow-600" />
                </div>
                <h4 className="font-semibold text-[#1C0357] text-lg mb-2">One-Take Recording</h4>
                <p className="text-gray-700 text-sm">
                  Live single-take piano performance — authentic feel with minimal editing.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-blue-100 rounded-full mb-4 shadow-lg">
                  <Mic className="h-10 w-10 text-blue-600" />
                </div>
                <h4 className="font-semibold text-[#1C0357] text-lg mb-2">Quick Reference</h4>
                <p className="text-gray-700 text-sm">
                  Basic piano guide track — fast and simple for quick practice or reference.
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-6">
              Higher quality tracks take more time to produce — thank you for supporting the craft!
            </p>
          </div>
        </div>
      </main>

      {selectedProduct && (
        <ProductDetailDialog 
          isOpen={!!selectedProduct} 
          onOpenChange={() => setSelectedProduct(null)} 
          product={selectedProduct}
          onBuyNow={handleBuyNow}
          isBuying={isBuying}
        />
      )}

      <MadeWithDyad />
    </div>
  );
};

export default Shop;