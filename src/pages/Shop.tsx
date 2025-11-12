import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { showError } from '@/utils/toast'; // Updated import
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
import ProductCard from '@/components/shop/ProductCard'; // Use the updated ProductCard
import ProductDetailDialog from '@/components/shop/ProductDetailDialog'; // Use the updated ProductDetailDialog
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // Changed default to 'all'
  const [vocalRangeFilter, setVocalRangeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null); // Initialize with null
  const [sortOption, setSortOption] = useState('category_asc'); // New state for sort option, default to category_asc
  const [isBuying, setIsBuying] = useState(false); // New state for loading indicator during purchase

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
    setIsBuying(true);
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
      showError("Purchase Error", `Failed to initiate purchase: ${err.message}`);
    } finally {
      setIsBuying(false);
    }
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#1C0357]" />
          <p className="ml-4 text-lg text-gray-600">Loading shop products...</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 text-center">
          <ErrorDisplay error={error} title="Failed to Load Shop Products" />
          <Button onClick={() => window.location.reload()} className="mt-6 bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
            Retry Loading Shop
          </Button>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Piano Backings Shop</h1>
          <p className="text-lg md:text-xl font-light text-[#1C0357]/90">Browse our collection of ready-to-purchase backing tracks</p>
        </div>

        {/* Filter and Sort Section */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#1C0357] flex items-center">
              <Filter className="mr-2 h-5 w-5" /> Filters & Sorting
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setIsFilterSheetOpen(true)}>
              <Filter className="h-5 w-5" />
              <span className="sr-only">Open Filters</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by title, artist, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
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
            <div className="relative">
              <Music className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Select value={vocalRangeFilter} onValueChange={setVocalRangeFilter}>
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Filter by Vocal Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vocal Ranges</SelectItem>
                  <SelectItem value="Soprano">Soprano</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                  <SelectItem value="Tenor">Tenor</SelectItem>
                  <SelectItem value="Bass">Bass</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="relative w-full md:w-1/3">
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
                  <SelectItem value="category_asc">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="ml-4">
                <XCircle className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Product Listing */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
            {hasActiveFilters && (
              <div className="mt-6">
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {groupedProducts.map(group => (
              <div key={group.category}>
                <h2 className="text-3xl font-bold text-[#1C0357] mb-6 text-left capitalize">
                  {group.category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onViewDetails={handleViewDetails}
                      onBuyNow={handleBuyNow}
                      isBuying={isBuying}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ProductDetailDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        product={selectedProductForDetail}
        onBuyNow={handleBuyNow}
        isBuying={isBuying}
      />

      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl text-[#1C0357] flex items-center">
              <Filter className="mr-2 h-6 w-6" />
              Advanced Filters
            </SheetTitle>
            <SheetDescription>
              Refine your search with more specific criteria.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="sheet-search">Search</Label>
              <Input
                id="sheet-search"
                placeholder="Search by title, artist, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="sheet-category">
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
            <div className="space-y-2">
              <Label htmlFor="sheet-vocal-range">Vocal Range</Label>
              <Select value={vocalRangeFilter} onValueChange={setVocalRangeFilter}>
                <SelectTrigger id="sheet-vocal-range">
                  <SelectValue placeholder="Filter by Vocal Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vocal Ranges</SelectItem>
                  <SelectItem value="Soprano">Soprano</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                  <SelectItem value="Tenor">Tenor</SelectItem>
                  <SelectItem value="Bass">Bass</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-price-range">Price Range (A$)</Label>
              <Slider
                id="sheet-price-range"
                min={0}
                max={200}
                step={5}
                value={priceRange}
                onValueChange={(value: [number, number]) => setPriceRange(value)}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>A${priceRange[0].toFixed(2)}</span>
                <span>A${priceRange[1].toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-sort-option">Sort By</Label>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger id="sheet-sort-option">
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
                  <SelectItem value="category_asc">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={clearFilters}>Clear All</Button>
            <Button onClick={() => setIsFilterSheetOpen(false)} className="bg-[#1C0357] hover:bg-[#1C0357]/90">Apply Filters</Button>
          </div>
        </SheetContent>
      </Sheet>

      <MadeWithDyad />
    </div>
  );
};

export default Shop;