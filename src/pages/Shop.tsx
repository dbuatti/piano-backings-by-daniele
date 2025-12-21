import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, XCircle, ShoppingCart, Music, ArrowUpDown, Theater } from 'lucide-react';
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
import { TrackInfo } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Seo from "@/components/Seo";
import ProductCardSkeleton from '@/components/ProductCardSkeleton'; // Import Skeleton

// Define the Product interface, ensuring it uses the imported TrackInfo
interface Product {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  track_urls: TrackInfo[];
  is_active: boolean;
  artist_name: string;
  category: string;
  vocal_ranges: string[];
  sheet_music_url: string | null;
  key_signature: string | null;
  show_sheet_music_url: boolean;
  show_key_signature: boolean;
  track_type: string;
  master_download_link: string | null;
}

const Shop = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  // Derived state from URL
  const currentSearchTerm = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'all';
  const currentVocalRange = searchParams.get('range') || 'all';
  const currentTrackType = searchParams.get('track_type') || 'all';
  const currentSort = searchParams.get('sort') || 'category_asc';
  const currentPriceMin = parseInt(searchParams.get('min_price') || '0');
  const currentPriceMax = parseInt(searchParams.get('max_price') || '100');
  const currentPriceRange: [number, number] = [currentPriceMin, currentPriceMax];

  // Helper to update search params
  const updateSearchParam = useCallback((key: string, value: string | number | null) => {
    setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        const stringValue = String(value);
        
        // Define conditions for deletion (default/empty state)
        const isDefault = (key === 'q' && stringValue === '') ||
                          (key === 'category' && stringValue === 'all') ||
                          (key === 'range' && stringValue === 'all') ||
                          (key === 'track_type' && stringValue === 'all') ||
                          (key === 'sort' && stringValue === 'category_asc') ||
                          (key === 'min_price' && stringValue === '0') ||
                          (key === 'max_price' && stringValue === '100');

        if (value === null || isDefault) {
            newParams.delete(key);
        } else {
            newParams.set(key, stringValue);
        }
        return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  // Update handlers to use updateSearchParam
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSearchParam('q', e.target.value);
  };

  const handleCategoryChange = (value: string) => {
      updateSearchParam('category', value);
  };

  const handleVocalRangeChange = (value: string) => {
      updateSearchParam('range', value);
  };

  const handleTrackTypeChange = (value: string) => {
      updateSearchParam('track_type', value);
  };

  const handleSortChange = (value: string) => {
      updateSearchParam('sort', value);
  };

  const handlePriceRangeChange = (value: number[]) => {
      updateSearchParam('min_price', value[0]);
      updateSearchParam('max_price', value[1]);
  };

  // useQuery now depends on derived state
  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['shopProducts', currentSearchTerm, currentCategory, currentVocalRange, currentTrackType, currentPriceRange, currentSort],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      // Apply search term
      if (currentSearchTerm) {
        query = query.or(`title.ilike.%${currentSearchTerm}%,description.ilike.%${currentSearchTerm}%,artist_name.ilike.%${currentSearchTerm}%`);
      }

      // Apply category filter
      if (currentCategory !== 'all') {
        query = query.eq('category', currentCategory);
      }

      // Apply vocal range filter
      if (currentVocalRange !== 'all') {
        query = query.contains('vocal_ranges', [currentVocalRange]);
      }
      
      // Apply track type filter
      if (currentTrackType !== 'all') {
        query = query.eq('track_type', currentTrackType);
      }

      // Apply price range filter
      query = query.gte('price', currentPriceRange[0]).lte('price', currentPriceRange[1]);

      // Apply sorting
      switch (currentSort) {
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
        case 'created_at_desc':
          query = query.order('created_at', { ascending: false });
          break;
        case 'category_asc':
        default:
          query = query.order('category', { ascending: true }).order('title', { ascending: true });
          break;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredProducts = products || [];

  // 1. Handle opening the dialog and setting the URL
  const handleViewDetails = useCallback((product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailDialogOpen(true);
    setSearchParams(prev => {
      prev.set('product', product.id);
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // 2. Handle closing the dialog and clearing the URL
  const handleCloseDetails = useCallback(() => {
    setIsDetailDialogOpen(false);
    setSelectedProductForDetail(null);
    setSearchParams(prev => {
      prev.delete('product');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // 3. Check URL on load to open dialog
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products && !selectedProductForDetail) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProductForDetail(product);
        setIsDetailDialogOpen(true);
      } else if (!isLoading) {
        setSearchParams(prev => {
          prev.delete('product');
          return prev;
        }, { replace: true });
      }
    }
  }, [searchParams, products, isLoading, selectedProductForDetail, setSearchParams]);


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
        throw new Error(result.error || `Function failed with status ${response.status}`);
      }

      if (result.url) {
        window.location.href = result.url;
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
    } finally {
      setIsBuying(false);
    }
  }, [toast]);

  const clearFilters = () => {
    setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('q');
        newParams.delete('category');
        newParams.delete('range');
        newParams.delete('track_type');
        newParams.delete('min_price');
        newParams.delete('max_price');
        newParams.delete('sort');
        return newParams;
    }, { replace: true });
  };

  const hasActiveFilters = currentSearchTerm !== '' || currentCategory !== 'all' || currentVocalRange !== 'all' || currentTrackType !== 'all' || currentPriceMin !== 0 || currentPriceMax !== 100 || currentSort !== 'category_asc';

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
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return sortedCategoryNames.map(categoryName => ({
      category: categoryName,
      products: groups[categoryName],
    }));
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2]/50 to-[#F1E14F]/10">
      {selectedProductForDetail && (
        <Seo
          title={`${selectedProductForDetail.title} (${selectedProductForDetail.artist_name}) Piano Backing Track | ${selectedProductForDetail.currency} ${selectedProductForDetail.price.toFixed(2)}`}
          description={`High-quality piano backing track for "${selectedProductForDetail.title}" from ${selectedProductForDetail.artist_name}. ${selectedProductForDetail.description.substring(0, 150)}... Price: ${selectedProductForDetail.currency} ${selectedProductForDetail.price.toFixed(2)}. Vocal Ranges: ${selectedProductForDetail.vocal_ranges.join(', ')}.`}
          keywords={`${selectedProductForDetail.title}, ${selectedProductForDetail.artist_name}, piano backing track, ${selectedProductForDetail.category}, ${selectedProductForDetail.vocal_ranges.join(', ')}`}
          canonicalUrl={`${window.location.origin}/shop?product=${selectedProductForDetail.id}`}
        />
      )}
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* NEW: Hero Section */}
        <div className="text-center py-12 mb-10 bg-white rounded-2xl shadow-2xl border border-gray-100">
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#1C0357] mb-4 tracking-tighter">
            The Backing Track Library
          </h1>
          <p className="text-xl md:text-2xl text-[#1C0357]/90 max-w-3xl mx-auto">
            Instantly download high-quality piano accompaniments for auditions, practice, and performance.
          </p>
          <Link to="/form-page">
            <Button className="mt-6 bg-[#F538BC] hover:bg-[#F538BC]/90 text-white text-lg px-8 py-3 shadow-lg">
              <Music className="mr-2 h-5 w-5" /> Need a Custom Track?
            </Button>
          </Link>
        </div>

        {/* Filter and Sort Bar (Sticky) */}
        <div className="sticky top-0 z-20 flex flex-col md:flex-row gap-4 mb-8 items-center justify-between bg-white p-4 rounded-lg shadow-xl border border-gray-100/50">
          
          {/* Search Input */}
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search-input"
              type="text"
              placeholder="Search title, artist, or description..."
              value={currentSearchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 border rounded-md w-full h-10"
            />
          </div>
          
          {/* Sort Option */}
          <div className="w-full md:w-1/4">
            <Select value={currentSort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-10 border border-gray-300">
                <ArrowUpDown className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category_asc">Category: A-Z</SelectItem>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="title_asc">Title: A-Z</SelectItem>
                <SelectItem value="artist_name_asc">Artist: A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* More Filters Sheet Trigger */}
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 w-full md:w-auto h-10 border border-gray-300">
                <Filter className="h-5 w-5" /> Advanced Filters
                {hasActiveFilters && <Badge className="ml-1 px-2 py-0.5 rounded-full bg-[#F538BC] text-white">Active</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Advanced Filters & Sorting</SheetTitle>
                <SheetDescription>
                  Refine your search results and change sorting options.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-6">
                {/* VOCAL RANGE FILTER */}
                <div>
                  <Label htmlFor="vocal-range-filter-sheet" className="mb-2 block">Filter by Vocal Range</Label>
                  <Select value={currentVocalRange} onValueChange={handleVocalRangeChange}>
                    <SelectTrigger id="vocal-range-filter-sheet" className="border border-gray-300">
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

                {/* Category Filter */}
                <div>
                  <Label htmlFor="category-filter-sheet" className="mb-2 block">Filter by Category</Label>
                  <Select value={currentCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger id="category-filter-sheet" className="border border-gray-300">
                      <SelectValue placeholder="All Categories" />
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

                {/* Track Type Filter */}
                <div>
                  <Label htmlFor="track-type-filter-sheet" className="mb-2 block">Filter by Track Quality</Label>
                  <Select value={currentTrackType} onValueChange={handleTrackTypeChange}>
                    <SelectTrigger id="track-type-filter-sheet" className="border border-gray-300">
                      <SelectValue placeholder="All Qualities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Qualities</SelectItem>
                      <SelectItem value="quick">Quick Reference</SelectItem>
                      <SelectItem value="one-take">One-Take Recording</SelectItem>
                      <SelectItem value="polished">Polished Backing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PRICE RANGE FILTER */}
                <div>
                  <Label htmlFor="price-range" className="mb-2 block">Price Range: ${currentPriceRange[0].toFixed(2)} - ${currentPriceRange[1].toFixed(2)}</Label>
                  <Slider
                    id="price-range"
                    min={0}
                    max={100}
                    step={5}
                    value={currentPriceRange}
                    onValueChange={handlePriceRangeChange}
                    className="w-full"
                  />
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

        {/* Product Display */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
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
          <div className="space-y-10">
            {groupedProducts.map(group => (
              <div key={group.category}>
                <h2 className="text-3xl font-bold text-[#1C0357] mb-6 capitalize border-b-2 border-[#F538BC]/50 pb-2">
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
      </div>

      {selectedProductForDetail && (
        <ProductDetailDialog
          isOpen={isDetailDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseDetails();
            } else {
              setIsDetailDialogOpen(true);
            }
          }}
          product={selectedProductForDetail}
          onBuyNow={handleBuyNow}
          isBuying={isBuying}
        />
      )}
      
      <MadeWithDyad />
    </div>
  );
};

export default Shop;