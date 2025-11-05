import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, XCircle, CheckCircle, ShoppingCart, Music, DollarSign, Key, FileText, ArrowUpDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ProductCard from '@/components/shop/ProductCard';
import ProductDetailDialog from '@/components/shop/ProductDetailDialog';
import { TrackInfo } from '@/utils/helpers'; // Import TrackInfo
import { Badge } from '@/components/ui/badge'; // Import Badge
import { Label } from '@/components/ui/label'; // Import Label

// Define the Product interface, ensuring it uses the imported TrackInfo
interface Product {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  track_urls: TrackInfo[]; // Use the imported TrackInfo
  is_active: boolean;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string | null;
  key_signature: string | null;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
}

const Shop = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // Changed default to 'all'
  const [vocalRangeFilter, setVocalRangeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [sortOption, setSortOption] = useState('category_asc'); // New state for sort option, default to category_asc

  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['shopProducts', searchTerm, categoryFilter, vocalRangeFilter, priceRange, sortOption], // Include sortOption in query key
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      // Apply search term
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,artist_name.ilike.%${searchTerm}%`);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply vocal range filter
      if (vocalRangeFilter !== 'all') {
        query = query.contains('vocal_ranges', [vocalRangeFilter]);
      }

      // Apply price range filter
      query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);

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
        case 'category_asc': // New sort option
          query = query.order('category', { ascending: true }).order('title', { ascending: true });
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const filteredProducts = products?.filter(product => {
    const matchesSearchTerm = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              product.artist_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesVocalRange = vocalRangeFilter === 'all' || product.vocal_ranges.includes(vocalRangeFilter);
    const matchesPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];

    return matchesSearchTerm && matchesCategory && matchesVocalRange && matchesPriceRange;
  }) || [];

  const handleViewDetails = useCallback((product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailDialogOpen(true);
  }, []);

  const handleBuyNow = useCallback(async (product: Product) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({ product_id: product.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to create checkout session: ${response.status} ${response.statusText}`);
      }

      if (result.url) {
        window.location.href = result.url; // Redirect to Stripe Checkout
      } else {
        throw new Error('Stripe checkout URL not received.');
      }

    } catch (err: any) {
      console.error('Error during buy now:', err);
      toast({
        title: "Purchase Error",
        description: `Failed to initiate purchase: ${err.message}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setVocalRangeFilter('all');
    setPriceRange([0, 100]);
    setSortOption('category_asc'); // Reset sort option as well
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'all' || vocalRangeFilter !== 'all' || priceRange[0] !== 0 || priceRange[1] !== 100 || sortOption !== 'category_asc';

  // Group products by category for display
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    filteredProducts.forEach(product => {
      const categoryName = product.category?.replace(/-/g, ' ') || 'Uncategorized';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(product);
    });

    // Sort categories alphabetically
    const sortedCategoryNames = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorized') return 1; // Push 'Uncategorized' to the end
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return sortedCategoryNames.map(categoryName => ({
      category: categoryName,
      products: groups[categoryName],
    }));
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-[#1C0357] mb-4">Shop</h1>
        <p className="text-lg text-gray-700 mb-8">Browse our collection of high-quality backing tracks.</p>

        <div className="flex flex-col md:flex-row gap-4 mb-8 items-end">
          <div className="relative flex-grow w-full md:w-auto">
            <Label htmlFor="search-input" className="text-sm font-medium text-gray-700 mb-1 block">Search Title or Artist</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="search-input"
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full"
              />
            </div>
          </div>
          
          {/* PROMINENT VOCAL RANGE FILTER */}
          <div className="w-full md:w-[180px]">
            <Label htmlFor="vocal-range-filter-main" className="text-sm font-medium text-gray-700 mb-1 block">Filter by Vocal Range</Label>
            <Select value={vocalRangeFilter} onValueChange={setVocalRangeFilter}>
              <SelectTrigger id="vocal-range-filter-main">
                <SelectValue placeholder="All Ranges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranges</SelectItem>
                <SelectItem value="Soprano">Soprano</SelectItem>
                <SelectItem value="Alto">Alto</SelectItem>
                <SelectItem value="Tenor">Tenor</SelectItem>
                <SelectItem value="Bass">Bass</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 w-full md:w-auto h-10">
                <Filter className="h-5 w-5" /> More Filters
                {hasActiveFilters && <Badge className="ml-1 px-2 py-0.5 rounded-full bg-[#D1AAF2] text-[#1C0357]">Active</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Refine your search results by price, category, and sort options.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-6">
                {/* CATEGORY FILTER */}
                <div>
                  <Label htmlFor="category-filter" className="mb-2 block">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="Select a category" />
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

                {/* PRICE RANGE FILTER */}
                <div>
                  <Label htmlFor="price-range" className="mb-2 block">Price Range: ${priceRange[0].toFixed(2)} - ${priceRange[1].toFixed(2)}</Label>
                  <Slider
                    id="price-range"
                    min={0}
                    max={100}
                    step={5}
                    value={priceRange}
                    onValueChange={(value: number[]) => setPriceRange([value[0], value[1]])}
                    className="w-full"
                  />
                </div>

                {/* SORT OPTION */}
                <div>
                  <Label htmlFor="sort-option" className="mb-2 block">Sort By</Label>
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger id="sort-option">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category_asc">Category: A-Z</SelectItem>
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

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="w-full flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#1C0357] mb-4" />
            <p className="text-lg text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No products found matching your criteria.</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-4">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-10"> {/* Added space-y for separation between categories */}
            {groupedProducts.map(group => (
              <div key={group.category}>
                <h2 className="text-2xl font-bold text-[#1C0357] mb-6 capitalize">
                  {group.category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.products.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProductForDetail && (
        <ProductDetailDialog
          isOpen={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          product={selectedProductForDetail}
          onBuyNow={handleBuyNow}
        />
      )}
      
      <MadeWithDyad />
    </div>
  );
};

export default Shop;