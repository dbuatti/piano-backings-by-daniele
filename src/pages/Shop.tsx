import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import ProductCard from '@/components/ProductCard';
import ProductDetailDialog from '@/components/ProductDetailDialog'; // Import the new dialog
import ProductCardSkeleton from '@/components/ProductCardSkeleton'; // Import the new skeleton component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Store, AlertCircle, CheckCircle, Search, ArrowUpDown, Tag, User } from 'lucide-react'; // Added Tag and User icons
import Seo from "@/components/Seo"; // Import Seo component
import { Helmet } from 'react-helmet-async'; // Import Helmet for schema markup

interface TrackInfo {
  url: string;
  caption: string | boolean | null | undefined; // Updated to be more robust
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
  artist_name?: string;
  category?: string;
  vocal_ranges?: string[];
  sheet_music_url?: string | null; // New field
  key_signature?: string | null; // New field
  show_sheet_music_url?: boolean; // New field
  show_key_signature?: boolean; // New field
  track_type?: string; // Add track_type here
}

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const { toast } = useToast();

  // State for Product Detail Dialog
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // New state for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // Default to 'all' to show all categories initially
  const [trackTypeFilter, setTrackTypeFilter] = useState('all'); // New filter state for track_type
  const [sortOption, setSortOption] = useState('category_asc'); // Default to category_asc for grouping

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
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,artist_name.ilike.%${searchTerm}%`);
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
          query = query.eq('category', categoryFilter);
        }

        // Apply track type filter
        if (trackTypeFilter !== 'all') {
          query = query.eq('track_type', trackTypeFilter);
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
          case 'artist_name_asc': // New sort option
            query = query.order('artist_name', { ascending: true });
            break;
          case 'artist_name_desc': // New sort option
            query = query.order('artist_name', { ascending: false });
            break;
          case 'category_asc': // New sort option
            query = query.order('category', { ascending: true });
            break;
          case 'category_desc': // New sort option
            query = query.order('category', { ascending: false });
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
  }, [toast, searchTerm, categoryFilter, trackTypeFilter, sortOption]); // Re-fetch when search term, category filter, track type filter or sort option changes

  // Handle Stripe Checkout success/cancel redirects
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      // The success message is now handled by PurchaseConfirmation page
      // Clear query params to prevent re-triggering toast on refresh
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
    setSelectedProductForDetail(product);
    setIsDetailDialogOpen(true);
  };

  const handleBuyNow = async (product: Product) => {
    setIsBuying(true);
    try {
      // Get current session to pass auth token to Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Call your Supabase Edge Function to create a Stripe Checkout Session
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: headers, // Use the headers object
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

  // Group products by category if sorting by category
  const groupedProducts: { [key: string]: Product[] } = {};
  const isCategorySort = sortOption === 'category_asc' || sortOption === 'category_desc';

  if (isCategorySort && products.length > 0) {
    products.forEach(product => {
      const categoryName = product.category || 'Uncategorized';
      if (!groupedProducts[categoryName]) {
        groupedProducts[categoryName] = [];
      }
      groupedProducts[categoryName].push(product);
    });
  }

  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
    if (sortOption === 'category_desc') {
      return b.localeCompare(a);
    }
    return a.localeCompare(b);
  });

  // Generate Product Schema Markup
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": products.map((product, index) => ({
      "@type": "Product",
      "position": index + 1,
      "name": product.title,
      "description": product.description,
      "image": product.image_url || "/pasted-image-2025-09-19T05-15-20-729Z.png", // Use default if no image
      "url": `${window.location.origin}/shop`, // Link to the shop page for now
      "brand": product.artist_name ? { "@type": "Brand", "name": product.artist_name } : undefined,
      "offers": {
        "@type": "Offer",
        "priceCurrency": product.currency,
        "price": product.price.toFixed(2),
        "itemCondition": "https://schema.org/NewCondition",
        "availability": product.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `${window.location.origin}/shop`, // Link to the shop page for now
      },
      "sku": product.id,
      "category": product.category?.replace('-', ' ') || undefined,
    }))
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo 
        title="Shop - Piano Backings by Daniele"
        description="Browse and purchase high-quality piano backing tracks for instant download. Find tracks for musicals, auditions, and practice."
        keywords="piano backing tracks shop, buy backing tracks, digital music, audition music, performance tracks, sheet music, vocal ranges"
        ogImage="/pasted-image-2025-09-19T05-15-20-729Z.png"
        canonicalUrl={`${window.location.origin}/shop`}
      />
      <Helmet>
        {products.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(productSchema)}
          </script>
        )}
      </Helmet>
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Our Shop</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Browse our available backing tracks and resources</p>
        </div>

        {/* Filter and Sort Controls */}
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
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Select value={trackTypeFilter} onValueChange={setTrackTypeFilter}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Filter by Track Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Track Types</SelectItem>
                <SelectItem value="quick">Quick Reference</SelectItem>
                <SelectItem value="one-take">One-Take Recording</SelectItem>
                <SelectItem value="polished">Polished Backing</SelectItem>
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
                <SelectItem value="category_asc">Category: A-Z</SelectItem> {/* New sort option */}
                <SelectItem value="category_desc">Category: Z-A</SelectItem> {/* New sort option */}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
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
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-8">
            <Store className="mx-auto h-20 w-20 text-gray-400 mb-4" />
            <h3 className="mt-4 text-2xl font-semibold text-gray-900">No Products Available</h3>
            <p className="mt-2 text-lg text-gray-600">
              It looks like there are no active products in the shop right now. Please check back later!
            </p>
          </div>
        ) : (
          <>
            {isCategorySort ? (
              sortedCategories.map(category => (
                <div key={category} className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1C0357] mb-4 capitalize">
                    {category.replace('-', ' ')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts[category].map(product => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onViewDetails={handleViewDetails} 
                        onBuyNow={handleBuyNow}
                        isBuying={isBuying} // Pass loading state
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onViewDetails={handleViewDetails} 
                    onBuyNow={handleBuyNow}
                    isBuying={isBuying} // Pass loading state
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <MadeWithDyad />

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        product={selectedProductForDetail}
        onBuyNow={handleBuyNow}
        isBuying={isBuying}
      />
    </div>
  );
};

export default Shop;