import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, XCircle, Music, ArrowUpDown } from 'lucide-react';
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
import { useSearchParams, Link } from 'react-router-dom';
import Seo from "@/components/Seo";
import ProductCardSkeleton from '@/components/ProductCardSkeleton';

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

  const currentSearchTerm = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'all';
  const currentVocalRange = searchParams.get('range') || 'all';
  const currentTrackType = searchParams.get('track_type') || 'all';
  const currentSort = searchParams.get('sort') || 'category_asc';
  const currentPriceMin = parseInt(searchParams.get('min_price') || '0', 10);
  const currentPriceMax = parseInt(searchParams.get('max_price') || '100', 10);
  const currentPriceRange: [number, number] = [currentPriceMin, currentPriceMax];

  const updateSearchParam = useCallback((key: string, value: string | number | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      const stringValue = String(value);

      const isDefault =
        (key === 'q' && stringValue === '') ||
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => updateSearchParam('q', e.target.value);
  const handleCategoryChange = (value: string) => updateSearchParam('category', value);
  const handleVocalRangeChange = (value: string) => updateSearchParam('range', value);
  const handleTrackTypeChange = (value: string) => updateSearchParam('track_type', value);
  const handleSortChange = (value: string) => updateSearchParam('sort', value);
  const handlePriceRangeChange = (value: number[]) => {
    updateSearchParam('min_price', value[0]);
    updateSearchParam('max_price', value[1]);
  };

  const { data: products, isLoading } = useQuery<Product[], Error>({
    queryKey: ['shopProducts', currentSearchTerm, currentCategory, currentVocalRange, currentTrackType, currentPriceRange, currentSort],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true);

      if (currentSearchTerm) {
        query = query.or(`title.ilike.%${currentSearchTerm}%,description.ilike.%${currentSearchTerm}%,artist_name.ilike.%${currentSearchTerm}%`);
      }
      if (currentCategory !== 'all') query = query.eq('category', currentCategory);
      if (currentVocalRange !== 'all') query = query.contains('vocal_ranges', [currentVocalRange]);
      if (currentTrackType !== 'all') query = query.eq('track_type', currentTrackType);
      query = query.gte('price', currentPriceRange[0]).lte('price', currentPriceRange[1]);

      switch (currentSort) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'title_asc': query = query.order('title', { ascending: true }); break;
        case 'title_desc': query = query.order('title', { ascending: false }); break;
        case 'artist_name_asc': query = query.order('artist_name', { ascending: true }); break;
        case 'artist_name_desc': query = query.order('artist_name', { ascending: false }); break;
        case 'created_at_desc': query = query.order('created_at', { ascending: false }); break;
        default: query = query.order('category', { ascending: true }).order('title', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredProducts = products || [];

  const handleViewDetails = useCallback((product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailDialogOpen(true);
    setSearchParams(prev => { prev.set('product', product.id); return prev; }, { replace: true });
  }, [setSearchParams]);

  const handleCloseDetails = useCallback(() => {
    setIsDetailDialogOpen(false);
    setSelectedProductForDetail(null);
    setSearchParams(prev => { prev.delete('product'); return prev; }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products && !selectedProductForDetail) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProductForDetail(product);
        setIsDetailDialogOpen(true);
      } else if (!isLoading) {
        setSearchParams(prev => { prev.delete('product'); return prev; }, { replace: true });
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
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({ product_id: product.id }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Checkout failed');
      if (result.url) window.location.href = result.url;
      else throw new Error('No checkout URL received');
    } catch (err: any) {
      toast({
        title: "Purchase Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
    }
  }, [toast]);

  const clearFilters = () => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      ['q', 'category', 'range', 'track_type', 'min_price', 'max_price', 'sort'].forEach(k => newParams.delete(k));
      return newParams;
    }, { replace: true });
  };

  const hasActiveFilters = currentSearchTerm || currentCategory !== 'all' || currentVocalRange !== 'all' ||
    currentTrackType !== 'all' || currentPriceMin !== 0 || currentPriceMax !== 100 || currentSort !== 'category_asc';

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const categoryName = (product.category || 'uncategorized').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      groups[categoryName] ??= [];
      groups[categoryName].push(product);
    });

    return Object.keys(groups)
      .sort((a, b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b))
      .map(category => ({ category, products: groups[category] }));
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      {selectedProductForDetail && (
        <Seo
          title={`${selectedProductForDetail.title} – ${selectedProductForDetail.artist_name} | Piano Backing Track`}
          description={`${selectedProductForDetail.description.substring(0, 150)}... Professional piano accompaniment in ${selectedProductForDetail.vocal_ranges.join(', ')}. Instant download for $${selectedProductForDetail.price.toFixed(2)}.`}
          keywords={`${selectedProductForDetail.title}, ${selectedProductForDetail.artist_name}, piano backing track, musical theatre, audition cut, ${selectedProductForDetail.vocal_ranges.join(', ')}`}
          canonicalUrl={`${window.location.origin}/shop?product=${selectedProductForDetail.id}`}
        />
      )}

      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] p-12 mb-16 shadow-2xl">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative text-center text-white">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-lg">
              The Backing Track Library
            </h1>
            <p className="mt-6 text-xl md:text-2xl font-medium max-w-4xl mx-auto drop-shadow">
              Professional piano accompaniments for musical theatre auditions, rehearsals, and performances — instant download.
            </p>
            <div className="mt-10">
              <Link to="/form-page">
                <Button size="lg" className="bg-white text-[#8B5CF6] hover:bg-white/90 font-bold text-lg px-10 py-7 shadow-2xl rounded-full transition-all hover:scale-105">
                  <Music className="mr-3 h-6 w-6" />
                  Request a Custom Track
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="sticky top-16 z-30 mb-12">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input
                  placeholder="Search songs, artists, shows..."
                  value={currentSearchTerm}
                  onChange={handleSearchChange}
                  className="pl-12 pr-6 py-6 text-lg rounded-xl border-gray-300 focus:border-[#EC4899] focus:ring-[#EC4899]"
                />
              </div>

              <Select value={currentSort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full lg:w-64 py-6 rounded-xl border-gray-300">
                  <ArrowUpDown className="h-5 w-5 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category_asc">Category A–Z</SelectItem>
                  <SelectItem value="created_at_desc">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low → High</SelectItem>
                  <SelectItem value="price_desc">Price: High → Low</SelectItem>
                  <SelectItem value="title_asc">Title A–Z</SelectItem>
                  <SelectItem value="artist_name_asc">Artist A–Z</SelectItem>
                </SelectContent>
              </Select>

              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="lg" className="rounded-xl border-2 px-8 py-6 font-medium">
                    <Filter className="h-5 w-5 mr-2" />
                    Filters
                    {hasActiveFilters && <Badge className="ml-3 bg-[#EC4899] text-white">Active</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-2xl font-bold">Refine Results</SheetTitle>
                    <SheetDescription>Narrow down your perfect backing track</SheetDescription>
                  </SheetHeader>
                  <div className="mt-8 space-y-8">
                    <div>
                      <Label className="text-base font-semibold">Vocal Range</Label>
                      <Select value={currentVocalRange} onValueChange={handleVocalRangeChange}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="All ranges" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ranges</SelectItem>
                          <SelectItem value="Soprano">Soprano</SelectItem>
                          <SelectItem value="Alto">Alto</SelectItem>
                          <SelectItem value="Tenor">Tenor</SelectItem>
                          <SelectItem value="Bass">Bass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Category</Label>
                      <Select value={currentCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="All categories" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="full-song">Full Song</SelectItem>
                          <SelectItem value="audition-cut">Audition Cut</SelectItem>
                          <SelectItem value="note-bash">Note Bash</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Track Quality</Label>
                      <Select value={currentTrackType} onValueChange={handleTrackTypeChange}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="All qualities" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Qualities</SelectItem>
                          <SelectItem value="quick">Quick Reference</SelectItem>
                          <SelectItem value="one-take">One-Take Recording</SelectItem>
                          <SelectItem value="polished">Polished Backing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">
                        Price Range: ${currentPriceRange[0]} – ${currentPriceRange[1]}
                      </Label>
                      <Slider min={0} max={100} step={5} value={currentPriceRange} onValueChange={handlePriceRangeChange} className="mt-4" />
                    </div>
                    {hasActiveFilters && (
                      <Button variant="destructive" onClick={clearFilters} className="w-full">
                        <XCircle className="mr-2 h-5 w-5" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Products Grid - FIXED NO CUTOFF */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-8xl mb-6">🎭</div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">No tracks found</h3>
            <p className="text-xl text-gray-600 mb-8">Try adjusting your filters or search term.</p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" size="lg">
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-24">
            {groupedProducts.map(({ category, products }) => (
              <section key={category}>
                <h2 className="text-5xl font-black text-gray-900 mb-12 flex items-center">
                  <span className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
                    {category}
                  </span>
                  <span className="ml-6 text-2xl font-normal text-gray-500">
                    ({products.length} {products.length === 1 ? 'track' : 'tracks'})
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 auto-rows-fr">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onViewDetails={handleViewDetails}
                      onBuyNow={handleBuyNow}
                      isBuying={isBuying}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedProductForDetail && (
        <ProductDetailDialog
          isOpen={isDetailDialogOpen}
          onOpenChange={(open) => !open && handleCloseDetails()}
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