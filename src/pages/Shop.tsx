import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import ProductCard from '@/components/ProductCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Import Input for search
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select for sorting
import { Loader2, Store, AlertCircle, CheckCircle, Search, ArrowUpDown } from 'lucide-react'; // Added Search and ArrowUpDown icons

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
  track_urls?: TrackInfo[]; // Changed from track_url to track_urls (array of TrackInfo)
  is_active: boolean;
}

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const { toast } = useToast();

  // New state for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('created_at_desc'); // Default to newest first

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('products')
          .select('*')
          .eq('is_active', true); // Only fetch active products

        // Apply search term
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
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
          case 'created_at_desc': // Newest first (default)
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        const { data, error } = await query;

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
  }, [toast, searchTerm, sortOption]); // Re-fetch when search term or sort option changes

  // Handle Stripe Checkout success/cancel redirects
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      toast({
        title: "Payment Successful!",
        description: "Your purchase was completed successfully. Check your email for details.",
        action: <CheckCircle className="text-green-500" />,
      });
      // Clear query params
      window.history.replaceState({}, document.title, "/shop");
    }

    if (query.get('canceled')) {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. You can try again anytime.",
        variant: "destructive",
        action: <AlertCircle className="text-red-500" />,
      });
      // Clear query params
      window.history.replaceState({}, document.title, "/shop");
    }
  }, [toast]);

  const handleViewDetails = (product: Product) => {
    // For now, we'll just show a toast. In a real app, this would navigate to a product detail page.
    toast({
      title: `Viewing ${product.title}`,
      description: `Details for product ID: ${product.id}. This would navigate to a product detail page.`,
    });
    console.log('View details for:', product);
  };

  const handleBuyNow = async (product: Product) => {
    setIsBuying(true);
    try {
      // Call your Supabase Edge Function to create a Stripe Checkout Session
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ product_id: product.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create checkout session: ${response.status}`);
      }

      // Redirect to the Stripe Checkout URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Stripe Checkout URL not received.');
      }
      
    } catch (err: any) {
      console.error('Error during checkout:', err);
      toast({
        title: "Checkout Error",
        description: err.message || "Something went wrong during checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Our Shop</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Browse our available backing tracks and resources</p>
        </div>

        {/* Filter and Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
              </SelectContent>
            </Select>
          </div>
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
                onBuyNow={handleBuyNow}
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