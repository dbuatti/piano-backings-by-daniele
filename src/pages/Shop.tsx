import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, X, ShoppingCart, Music, Sparkles, Headphones, Mic2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
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
import ProductCard from '@/components/shop/ProductCard';
import ProductDetailDialog from '@/components/shop/ProductDetailDialog';
import { TrackInfo } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, Link } from 'react-router-dom';
import Seo from "@/components/Seo";
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { cn } from '@/lib/utils';

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

  // URL-derived filters
  const currentSearchTerm = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'all';
  const currentTrackType = searchParams.get('track_type') || 'all';
  const currentSort = searchParams.get('sort') || 'title_asc';

  const updateSearchParam = useCallback((key: string, value: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === null || value === 'all' || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const { data: products, isLoading } = useQuery<Product[], Error>({
    queryKey: ['shopProducts', currentSearchTerm, currentCategory, currentTrackType, currentSort],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true);

      if (currentSearchTerm) {
        query = query.or(`title.ilike.%${currentSearchTerm}%,description.ilike.%${currentSearchTerm}%,artist_name.ilike.%${currentSearchTerm}%`);
      }
      if (currentCategory !== 'all') query = query.eq('category', currentCategory);
      if (currentTrackType !== 'all') query = query.eq('track_type', currentTrackType);

      switch (currentSort) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'created_at_desc': query = query.order('created_at', { ascending: false }); break;
        case 'title_asc':
        default:
          query = query.order('title', { ascending: true });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const groupedProducts = useMemo(() => {
    if (!products) return [];
    const groups: { [key: string]: Product[] } = {};
    const order = ['full-song', 'audition-cut', 'note-bash', 'general'];
    
    products.forEach(p => {
      const cat = p.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });

    return order.filter(key => groups[key]).map(key => ({
      id: key,
      label: key.replace('-', ' ').toUpperCase(),
      products: groups[key]
    }));
  }, [products]);

  const handleViewDetails = useCallback((product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailDialogOpen(true);
    setSearchParams(prev => {
      prev.set('product', product.id);
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const handleCloseDetails = useCallback(() => {
    setIsDetailDialogOpen(false);
    setSelectedProductForDetail(null);
    setSearchParams(prev => {
      prev.delete('product');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const handleBuyNow = useCallback(async (product: Product) => {
    setIsBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ product_id: product.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      toast({ title: "Checkout Error", description: err.message, variant: "destructive" });
    } finally {
      setIsBuying(false);
    }
  }, [toast]);

  const hasActiveFilters = currentSearchTerm || currentCategory !== 'all' || currentTrackType !== 'all';

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <Seo 
        title="Sheet Music & Backing Track Library | Piano Backings by Daniele"
        description="Premium collection of piano backing tracks for musical theatre. High-quality digital downloads ready instantly."
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Hero Section */}
        <section className="relative rounded-3xl overflow-hidden mb-12 bg-[#1C0357] text-white">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/music.png')]" />
          <div className="relative z-10 px-8 py-16 md:py-24 max-w-3xl">
            <Badge className="mb-4 bg-[#F538BC] text-white border-none">PREMIUM LIBRARY</Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
              Find Your Perfect <span className="text-[#F538BC]">Accompaniment</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
              Skip the wait and download high-quality studio tracks instantly. 
              Each track is recorded live by Daniele Buatti.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/form-page">
                <Button size="lg" className="bg-[#F538BC] hover:bg-[#F538BC]/90 text-white font-bold h-14 px-8 rounded-xl shadow-xl">
                  Order Custom Track
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 hidden lg:block bg-gradient-to-l from-[#F538BC]/20 to-transparent" />
        </section>

        {/* Quality Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Polished', icon: Sparkles, color: 'text-[#F538BC]', bg: 'bg-pink-50', desc: 'Studio mix, perfect for reels & auditions.' },
            { label: 'One-Take', icon: Headphones, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Authentic performance feel, high accuracy.' },
            { label: 'Quick Ref', icon: Mic2, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Fast turnaround reference for learning.' },
          ].map((item) => (
            <div key={item.label} className={cn("flex items-center gap-4 p-4 rounded-2xl border border-transparent transition-all", item.bg)}>
              <div className={cn("p-3 rounded-xl bg-white shadow-sm", item.color)}>
                <item.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-[#1C0357] text-sm">{item.label} Quality</h4>
                <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Filters Bar */}
        <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search library..."
              value={currentSearchTerm}
              onChange={(e) => updateSearchParam('q', e.target.value)}
              className="pl-10 h-12 bg-gray-50 border-none rounded-xl focus-visible:ring-[#1C0357]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={currentSort} onValueChange={(v) => updateSearchParam('sort', v)}>
              <SelectTrigger className="h-12 w-full md:w-48 bg-gray-50 border-none rounded-xl">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title_asc">Title A-Z</SelectItem>
                <SelectItem value="price_asc">Price Low-High</SelectItem>
                <SelectItem value="price_desc">Price High-Low</SelectItem>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
              </SelectContent>
            </Select>

            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-xl border-2 border-gray-100 font-bold hover:bg-white flex-1 md:flex-none">
                  <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
                  {hasActiveFilters && <Badge className="ml-2 bg-[#F538BC]">{searchParams.size}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Collection</SheetTitle>
                </SheetHeader>
                <div className="space-y-8 py-8">
                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Backing Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['all', 'full-song', 'audition-cut', 'note-bash'].map(cat => (
                        <Button 
                          key={cat}
                          variant={currentCategory === cat ? 'default' : 'outline'}
                          onClick={() => updateSearchParam('category', cat)}
                          className="capitalize h-10 text-xs font-bold"
                        >
                          {cat.replace('-', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-widest text-gray-400">Track Quality</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['all', 'polished', 'one-take', 'quick'].map(type => (
                        <Button 
                          key={type}
                          variant={currentTrackType === type ? 'default' : 'outline'}
                          onClick={() => updateSearchParam('track_type', type)}
                          className="capitalize h-10 text-xs font-bold"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full h-12 bg-[#1C0357] font-bold"
                    onClick={() => setIsFilterSheetOpen(false)}
                  >
                    Show Results
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="ghost" className="w-full text-red-500" onClick={() => {
                      setSearchParams(new URLSearchParams());
                      setIsFilterSheetOpen(false);
                    }}>
                      Reset All
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content Sections */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
            <Music className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[#1C0357] mb-2">No matches found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search keywords.</p>
            <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>Clear all filters</Button>
          </div>
        ) : (
          <div className="space-y-16 pb-20">
            {groupedProducts.map(group => (
              <section key={group.id} className="space-y-8">
                <div className="flex items-end justify-between border-b-2 border-gray-100 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-[#1C0357] tracking-tighter uppercase">{group.label}S</h2>
                    <p className="text-sm font-medium text-gray-400">{group.products.length} professional tracks available</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
              </section>
            ))}
          </div>
        )}
      </main>

      {selectedProductForDetail && (
        <ProductDetailDialog
          isOpen={isDetailDialogOpen}
          onOpenChange={open => !open && handleCloseDetails()}
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