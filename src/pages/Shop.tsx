import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Loader2, 
  Search, 
  Filter, 
  X, 
  ShoppingCart, 
  Music, 
  Sparkles, 
  Headphones, 
  Mic2, 
  SlidersHorizontal, 
  ArrowUpDown,
  Star,
  Zap,
  ChevronRight,
  Package
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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

  // Separate Season Pack from main list
  const featuredProducts = useMemo(() => {
    return products?.filter(p => p.title.toLowerCase().includes('season pack')) || [];
  }, [products]);

  const regularProducts = useMemo(() => {
    return products?.filter(p => !p.title.toLowerCase().includes('season pack')) || [];
  }, [products]);

  const groupedProducts = useMemo(() => {
    if (!regularProducts) return [];
    const groups: { [key: string]: Product[] } = {};
    const order = ['full-song', 'audition-cut', 'note-bash', 'general'];
    
    regularProducts.forEach(p => {
      const cat = p.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });

    return order.filter(key => groups[key]).map(key => ({
      id: key,
      label: key.replace('-', ' ').toUpperCase(),
      products: groups[key]
    }));
  }, [regularProducts]);

  const handleViewDetails = useCallback((product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailDialogOpen(true);
  }, []);

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

  const FilterContent = () => (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Search Library</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Song, artist, or show..."
            value={currentSearchTerm}
            onChange={(e) => updateSearchParam('q', e.target.value)}
            className="pl-10 h-11 bg-gray-50 border-none rounded-xl focus-visible:ring-[#1C0357]"
          />
        </div>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Backing Type</Label>
        <div className="flex flex-col gap-2">
          {['all', 'full-song', 'audition-cut', 'note-bash'].map(cat => (
            <Button 
              key={cat}
              variant="ghost"
              onClick={() => updateSearchParam('category', cat)}
              className={cn(
                "justify-start h-10 px-3 rounded-lg font-bold text-sm transition-all",
                currentCategory === cat ? "bg-[#1C0357] text-white hover:bg-[#1C0357]" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {cat === 'all' ? 'All Tracks' : cat.replace('-', ' ')}
              {currentCategory === cat && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Track Quality</Label>
        <div className="flex flex-col gap-2">
          {['all', 'polished', 'one-take', 'quick'].map(type => (
            <Button 
              key={type}
              variant="ghost"
              onClick={() => updateSearchParam('track_type', type)}
              className={cn(
                "justify-start h-10 px-3 rounded-lg font-bold text-sm transition-all",
                currentTrackType === type ? "bg-[#F538BC] text-white hover:bg-[#F538BC]" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {type === 'all' ? 'Any Quality' : type}
              {currentTrackType === type && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Sort By</Label>
        <Select value={currentSort} onValueChange={(v) => updateSearchParam('sort', v)}>
          <SelectTrigger className="h-11 bg-gray-50 border-none rounded-xl font-bold text-sm">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title_asc">Title: A-Z</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="created_at_desc">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(currentSearchTerm || currentCategory !== 'all' || currentTrackType !== 'all') && (
        <Button 
          variant="outline" 
          className="w-full rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 font-black text-xs uppercase tracking-widest"
          onClick={() => setSearchParams(new URLSearchParams())}
        >
          <X className="mr-2 h-4 w-4" /> Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo 
        title="Sheet Music & Backing Track Library | Piano Backings by Daniele"
        description="Premium collection of piano backing tracks for musical theatre. High-quality digital downloads ready instantly."
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        
        {/* Featured Section - Season Pack Prominence */}
        {featuredProducts.length > 0 && !currentSearchTerm && currentCategory === 'all' && (
          <section className="mb-24">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-12 w-12 rounded-2xl bg-[#F538BC]/10 flex items-center justify-center text-[#F538BC]">
                <Star size={28} fill="currentColor" />
              </div>
              <h2 className="text-4xl font-black text-[#1C0357] tracking-tighter uppercase">Featured Offers</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-10">
              {featuredProducts.map(product => (
                <div key={product.id} className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#F538BC] to-[#1C0357] rounded-[48px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                  <Card className="relative bg-[#1C0357] text-white rounded-[48px] overflow-hidden border-none shadow-2xl">
                    <div className="grid md:grid-cols-2 items-center">
                      <div className="p-12 md:p-20 space-y-8">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-[#F538BC] text-white border-none font-black px-4 py-1.5 text-xs tracking-widest">NEW</Badge>
                          <Badge variant="outline" className="text-white border-white/30 font-bold px-4 py-1.5 text-xs tracking-widest">Standard</Badge>
                        </div>
                        <h3 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
                          {product.title}
                        </h3>
                        <p className="text-xl text-white/70 font-medium leading-relaxed max-w-md">
                          {product.description}
                        </p>
                        <div className="pt-6 flex flex-col sm:flex-row items-center gap-8">
                          <div className="flex items-baseline">
                            <span className="text-3xl font-bold mr-1">$</span>
                            <span className="text-7xl font-black tracking-tighter">{product.price.toFixed(2)}</span>
                            <span className="ml-3 text-sm font-bold text-white/40 uppercase tracking-widest">{product.currency}</span>
                          </div>
                          <Button 
                            onClick={() => handleBuyNow(product)}
                            disabled={isBuying}
                            className="bg-white text-[#1C0357] hover:bg-gray-100 h-16 px-12 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all w-full sm:w-auto"
                          >
                            {isBuying ? <Loader2 className="animate-spin" /> : <><ShoppingCart className="mr-3" /> Instant Purchase</>}
                          </Button>
                        </div>
                      </div>
                      <div className="hidden md:block relative h-full min-h-[500px]">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1C0357] via-transparent to-transparent z-10" />
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#F538BC]/20 to-[#D1AAF2]/20 flex items-center justify-center">
                            <Package size={160} className="text-white/10" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-32">
              <div className="flex items-center gap-3 mb-8">
                <SlidersHorizontal size={20} className="text-[#1C0357]" />
                <h3 className="font-black text-[#1C0357] uppercase tracking-[0.2em] text-xs">Library Filters</h3>
              </div>
              <FilterContent />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1">
            
            {/* Mobile Filter Trigger */}
            <div className="lg:hidden mb-10 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search library..."
                  value={currentSearchTerm}
                  onChange={(e) => updateSearchParam('q', e.target.value)}
                  className="pl-12 h-14 bg-white border-gray-200 rounded-2xl text-lg"
                />
              </div>
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-14 w-14 p-0 rounded-2xl border-gray-200 bg-white shadow-sm">
                    <Filter size={24} className="text-[#1C0357]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] sm:w-[400px] rounded-r-[40px] border-none">
                  <SheetHeader className="text-left mb-10">
                    <SheetTitle className="text-3xl font-black text-[#1C0357] tracking-tighter">Filters</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                    <FilterContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : regularProducts.length === 0 ? (
              <div className="text-center py-40 bg-white rounded-[64px] border-2 border-dashed border-gray-100 shadow-inner">
                <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Music className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-3xl font-black text-[#1C0357] mb-3 tracking-tighter">No tracks found</h3>
                <p className="text-gray-500 font-medium mb-10 text-lg">Try adjusting your filters or search keywords.</p>
                <Button 
                  variant="outline" 
                  className="rounded-2xl font-black px-10 py-6 border-2"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="space-y-24">
                {groupedProducts.map(group => (
                  <section key={group.id} className="space-y-10">
                    <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-[#1C0357] tracking-tighter uppercase">{group.label}S</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{group.products.length} Tracks Available</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
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
          </div>
        </div>
      </main>

      {selectedProductForDetail && (
        <ProductDetailDialog
          isOpen={isDetailDialogOpen}
          onOpenChange={open => !open && setSelectedProductForDetail(null)}
          product={selectedProductForDetail}
          onBuyNow={handleBuyNow}
          isBuying={isBuying}
        />
      )}
    </div>
  );
};

export default Shop;