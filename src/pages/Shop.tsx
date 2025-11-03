import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import ProductCard from '@/components/ProductCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Store, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  track_url?: string;
  is_active: boolean;
}

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true) // Only fetch active products
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to load products.');
        toast({
          title: "Error",
          description: `Failed to load products: ${err.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  const handleViewDetails = (product: Product) => {
    // For now, we'll just show a toast. In a real app, this would navigate to a product detail page.
    toast({
      title: `Viewing ${product.title}`,
      description: `Details for product ID: ${product.id}. Implement navigation to product detail page here.`,
    });
    console.log('View details for:', product);
  };

  const handleAddToCart = (product: Product) => {
    // Placeholder for adding to cart functionality
    toast({
      title: `Added to Cart!`,
      description: `${product.title} has been added to your cart.`,
    });
    console.log('Add to cart:', product);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Our Shop</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Browse our available backing tracks and resources</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
            <p className="ml-4 text-lg text-gray-600">Loading products...</p>
          </div>
        ) : error ? (
          <Card className="border-red-300 bg-red-50 text-red-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Error Loading Shop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              <p className="mt-2 text-sm">Please try again later or contact support.</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Store className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Products Available</h3>
            <p className="mt-1 text-gray-500">
              It looks like there are no active products in the shop right now. Please check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onViewDetails={handleViewDetails} 
                onAddToCart={handleAddToCart} 
              />
            ))}
          </div>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Shop;