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
  Star, 
  SlidersHorizontal, 
  ChevronRight,
  Mic2,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  LayoutGrid,
  List,
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
import ProductTable from '@/components/shop/ProductTable';
import ProductDetailDialog from '@/components/shop/ProductDetailDialog';
import { TrackInfo } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, Link, useParams, useNavigate } from 'react-router-dom';
import Seo from "@/components/Seo";
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { isWithinInterval, subDays } from 'date-fns';
import { formatDurationIso } from '@/utils/helpers';
import {
  CATEGORY_OPTIONS,
  CATEGORY_PLURALS,
  CATEGORY_DESCRIPTIONS,
  QUALITY_FILTER_OPTIONS,
  VOICE_TYPE_OPTIONS,
  TRACK_TYPES,
} from '@/utils/trackTypes';

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
  duration_seconds?: number | null;
  master_download_link: string | null;
}

interface ProductVariantGroup {
  key: string;
  title: string;
  variants: Product[];
}

interface GroupedSection {
  id: string;
  label: string;
  totalCount: number;
  groups: ProductVariantGroup[];
}

interface DiscountInfo {
  valid: boolean;
  promoCode: string;
  promoCodeId: string;
  discountAmount: number;
  finalAmount: number;
  originalAmount: number;
}

const GROUP_ORDER = ['full-song', 'audition-cut', 'note-bash', 'general'];

const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ');

const Shop = () => {
  const { toast } = useToast();
  const { id: urlProductId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedVariantsForDetail, setSelectedVariantsForDetail] = useState<Product[] | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [urlProduct, setUrlProduct] = useState<Product | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const currentSearchTerm = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'all';
  const currentTrackType = searchParams.get('track_type') || 'all';
  const currentVoice = searchParams.get('voice') || 'all';
  const currentShow = searchParams.get('show') || 'all';
  const currentMinPrice = searchParams.get('min_price') || '';
  const currentMaxPrice = searchParams.get('max_price') || '';
  const currentSort = searchParams.get('sort') || 'title_asc';
  const currentView = searchParams.get('view') || 'grid';

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

      const sortableColumns: Record<string, string> = {
        title: 'title',
        artist_name: 'artist_name',
        key_signature: 'key_signature',
        track_type: 'track_type',
        duration_seconds: 'duration_seconds',
        price: 'price',
        created_at: 'created_at',
      };
      const sortMatch = currentSort.match(/^(\w+)_(asc|desc)$/);
      const sortColumn = sortMatch ? sortableColumns[sortMatch[1]] : undefined;
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortMatch![2] === 'asc' });
      } else {
        query = query.order('title', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const hasActiveFilters = Boolean(
    currentSearchTerm || currentCategory !== 'all' || currentTrackType !== 'all' || currentVoice !== 'all' || currentShow !== 'all' || currentMinPrice || currentMaxPrice
  );

  const clientFilteredProducts = useMemo(() => {
    const min = currentMinPrice ? Number(currentMinPrice) : null;
    const max = currentMaxPrice ? Number(currentMaxPrice) : null;
    return (products || []).filter(p => {
      if (currentVoice !== 'all' && !(p.vocal_ranges || []).includes(currentVoice)) return false;
      if (currentShow !== 'all' && p.artist_name !== currentShow) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      return true;
    });
  }, [products, currentVoice, currentShow, currentMinPrice, currentMaxPrice]);

  const activeFilters = useMemo(() => {
    const f: { key: string; label: string; param: string }[] = [];
    if (currentSearchTerm) f.push({ key: 'q', label: `"${currentSearchTerm}"`, param: 'q' });
    if (currentCategory !== 'all') f.push({ key: 'category', label: CATEGORY_OPTIONS.find(c => c.value === currentCategory)?.label || currentCategory, param: 'category' });
    if (currentTrackType !== 'all') f.push({ key: 'track_type', label: QUALITY_FILTER_OPTIONS.find(t => t.value === currentTrackType)?.label || currentTrackType, param: 'track_type' });
    if (currentVoice !== 'all') f.push({ key: 'voice', label: currentVoice, param: 'voice' });
    if (currentShow !== 'all') f.push({ key: 'show', label: currentShow, param: 'show' });
    if (currentMinPrice) f.push({ key: 'min_price', label: `Min $${Number(currentMinPrice).toFixed(2)}`, param: 'min_price' });
    if (currentMaxPrice) f.push({ key: 'max_price', label: `Max $${Number(currentMaxPrice).toFixed(2)}`, param: 'max_price' });
    return f;
  }, [currentSearchTerm, currentCategory, currentTrackType, currentVoice, currentShow, currentMinPrice, currentMaxPrice]);

  const sortLabel = useMemo(() => {
    const match = currentSort.match(/^(\w+)_(asc|desc)$/);
    if (!match) return 'Title: A-Z';
    const names: Record<string, string> = {
      title: 'Title', artist_name: 'Show', key_signature: 'Key', voice: 'Voice',
      track_type: 'Quality', duration_seconds: 'Duration', price: 'Price', created_at: 'Newest',
    };
    const name = names[match[1]];
    if (!name) return 'Title: A-Z';
    if (match[1] === 'duration_seconds') return match[2] === 'asc' ? 'Duration: Shortest' : 'Duration: Longest';
    if (match[1] === 'created_at') return 'Newest First';
    if (match[1] === 'price') return match[2] === 'asc' ? 'Price: Low to High' : 'Price: High to Low';
    return `${name}: ${match[2] === 'asc' ? 'A-Z' : 'Z-A'}`;
  }, [currentSort]);

  const featuredProducts = useMemo(() => {
    return products?.filter(p => p.title.toLowerCase().includes('season pack')) || [];
  }, [products]);

  const regularProducts = useMemo(() => {
    return clientFilteredProducts.filter(p => !p.title.toLowerCase().includes('season pack'));
  }, [clientFilteredProducts]);

  const groupedProducts = useMemo(() => {
    if (!regularProducts.length) return [];
    const sections: { [key: string]: Product[] } = {};

    regularProducts.forEach(p => {
      const cat = p.category || 'general';
      if (!sections[cat]) sections[cat] = [];
      sections[cat].push(p);
    });

    return GROUP_ORDER.filter(key => sections[key]).map(cat => {
      const byTitle = new Map<string, Product[]>();
      for (const p of sections[cat]) {
        const key = normalizeTitle(p.title);
        if (!byTitle.has(key)) byTitle.set(key, []);
        byTitle.get(key)!.push(p);
      }

      const groups: ProductVariantGroup[] = Array.from(byTitle.entries()).map(([key, variants]) => ({
        key,
        title: variants[0].title.trim(),
        variants: [...variants].sort((a, b) => a.price - b.price || a.track_type.localeCompare(b.track_type)),
      }));

      return {
        id: cat,
        label: CATEGORY_PLURALS[cat] || cat,
        totalCount: groups.length,
        groups,
      } as GroupedSection;
    });
  }, [regularProducts]);

  const tableRows = useMemo(() => {
    const byTitle = new Map<string, Product[]>();
    regularProducts.forEach(p => {
      const key = normalizeTitle(p.title);
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key)!.push(p);
    });
    const rows = Array.from(byTitle.entries()).map(([, variants]) => {
      const sorted = [...variants].sort((a, b) => a.price - b.price);
      return { product: sorted[0], variants: sorted };
    });

    const sortMatch = currentSort.match(/^(\w+)_(asc|desc)$/);
    const dir = sortMatch && sortMatch[2] === 'desc' ? -1 : 1;
    const col = sortMatch ? sortMatch[1] : 'title';
    const cmp = (a: Product, b: Product): number => {
      switch (col) {
        case 'artist_name': return (a.artist_name || '').localeCompare(b.artist_name || '');
        case 'key_signature': return (a.key_signature || '').localeCompare(b.key_signature || '');
        case 'track_type': return (a.track_type || '').localeCompare(b.track_type || '');
        case 'voice': return (a.vocal_ranges?.[0] || '').localeCompare(b.vocal_ranges?.[0] || '');
        case 'duration_seconds': return (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0);
        case 'price': return a.price - b.price;
        case 'created_at': return a.created_at.localeCompare(b.created_at);
        case 'title':
        default: return a.title.trim().localeCompare(b.title.trim());
      }
    };
    rows.sort((x, y) => cmp(x.product, y.product) * dir);
    return rows;
  }, [regularProducts, currentSort]);

  const showOptions = useMemo(() => {
    const shows = new Set<string>();
    (products || []).forEach(p => {
      const show = (p.artist_name || '').trim();
      if (show) shows.add(show);
    });
    return Array.from(shows).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const allVariantsById = useMemo(() => {
    const byTitle = new Map<string, Product[]>();
    (products || []).forEach(p => {
      const key = normalizeTitle(p.title);
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key)!.push(p);
    });
    const lookup = new Map<string, Product[]>();
    for (const [, variants] of byTitle) {
      for (const v of variants) lookup.set(v.id, variants);
    }
    return lookup;
  }, [products]);

  const relatedProducts = useMemo(() => {
    if (!selectedProductForDetail || !products) return [];
    const current = selectedProductForDetail;
    const sameShow = (products || []).filter(p => p.id !== current.id && (p.artist_name || '').trim() === (current.artist_name || '').trim());
    const pool = sameShow.length > 0 ? sameShow : (products || []).filter(p => p.id !== current.id && p.category === current.category);
    return pool.slice(0, 4);
  }, [selectedProductForDetail, products]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!urlProductId) {
      setUrlProduct(null);
      return;
    }
    const loadUrlProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', urlProductId)
        .maybeSingle();
      if (!cancelled && !error && data) {
        const record = data as Product;
        setUrlProduct(record);
        setSelectedProductForDetail(record);
        setSelectedVariantsForDetail([record]);
        setIsDetailDialogOpen(true);
      }
    };
    loadUrlProduct();
    return () => { cancelled = true; };
  }, [urlProductId]);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setDiscountInfo(null);
      return;
    }

    setIsValidatingPromo(true);
    setDiscountInfo(null);

    try {
      const amount = selectedProductForDetail?.price || 0;
      const { data: result, error } = await supabase.rpc('validate_promo_code', {
        p_code: promoCode,
        p_amount: amount,
      });

      if (error) throw error;

      if (result.valid) {
        setDiscountInfo({
          valid: true,
          promoCode: result.promoCode.code,
          promoCodeId: result.promoCode.id,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
          originalAmount: result.originalAmount,
        });
        toast({ title: "Promo Applied!", description: `You save $${result.discountAmount.toFixed(2)}!` });
      } else {
        setDiscountInfo(null);
        toast({ title: "Invalid Code", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Validation Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleViewDetails = useCallback(<T extends { id: string }>(product: T, variants?: T[]) => {
    setPromoCode('');
    setDiscountInfo(null);
    setSelectedProductForDetail(product as unknown as Product);
    setSelectedVariantsForDetail((variants && variants.length > 0 ? variants : [product]) as unknown as Product[]);
    setIsDetailDialogOpen(true);
    navigate(`/shop/${product.id}`, { replace: true });
  }, [navigate]);

  const handleBuyNow = useCallback(async (product: Product, code?: string) => {
    setIsBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body: Record<string, unknown> = { product_id: product.id };

      if (code) {
        body.promo_code = code;
      }

      const response = await fetch(`https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Checkout failed (${response.status})`);
      if (result.url) window.location.href = result.url;
    } catch (err) {
      toast({ title: "Checkout Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsBuying(false);
    }
  }, [toast]);

  const filterContent = (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Search Library</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="search"
            aria-label="Search library"
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
          {CATEGORY_OPTIONS.map(cat => (
            <Button
              key={cat.value}
              variant="ghost"
              onClick={() => updateSearchParam('category', cat.value)}
              className={cn(
                "justify-start h-10 px-3 rounded-lg font-bold text-sm transition-all",
                currentCategory === cat.value ? "bg-[#1C0357] text-white hover:bg-[#1C0357]" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {cat.label}
              {currentCategory === cat.value && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Voice Type</Label>
        <div className="flex flex-col gap-2">
          {[{ value: 'all', label: 'Any Voice' }, ...VOICE_TYPE_OPTIONS.map(v => ({ value: v, label: v }))].map(voice => (
            <Button
              key={voice.value}
              variant="ghost"
              onClick={() => updateSearchParam('voice', voice.value)}
              className={cn(
                "justify-start h-10 px-3 rounded-lg font-bold text-sm transition-all",
                currentVoice === voice.value ? "bg-[#1C0357] text-white hover:bg-[#1C0357]" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {voice.label}
              {currentVoice === voice.value && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Show</Label>
        <Select value={currentShow} onValueChange={(v) => updateSearchParam('show', v)}>
          <SelectTrigger className="h-11 bg-gray-50 border-none rounded-xl font-bold text-sm">
            <SelectValue placeholder="All Shows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shows</SelectItem>
            {showOptions.map(show => (
              <SelectItem key={show} value={show}>{show}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Price Range</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Min"
              aria-label="Minimum price"
              value={currentMinPrice}
              onChange={(e) => updateSearchParam('min_price', e.target.value)}
              className="pl-7 h-11 bg-gray-50 border-none rounded-xl font-bold text-sm focus-visible:ring-[#1C0357]"
            />
          </div>
          <span className="text-gray-300 font-bold flex-shrink-0">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Max"
              aria-label="Maximum price"
              value={currentMaxPrice}
              onChange={(e) => updateSearchParam('max_price', e.target.value)}
              className="pl-7 h-11 bg-gray-50 border-none rounded-xl font-bold text-sm focus-visible:ring-[#1C0357]"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-gray-100" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Production Quality</Label>
          <details className="relative">
            <summary className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 cursor-pointer hover:text-[#F538BC] list-none flex items-center gap-1">
              <HelpCircle size={12} />
            </summary>
            <div className="absolute z-30 top-6 left-0 w-72 bg-white rounded-xl border border-gray-100 shadow-xl p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Production Quality Guide</p>
              <p className="text-[11px] text-gray-500 leading-snug pb-1 border-b border-gray-100">
                Prices reflect production quality and track length. Full Song &amp; Audition Ready are backing types, shown by section — not quality tiers.
              </p>
              {Object.values(TRACK_TYPES).filter(t => t.desc).map(t => (
                <div key={t.value} className="flex items-start gap-2">
                  <span className={cn("h-2 w-2 rounded-full mt-1 flex-shrink-0", t.dotClass)} />
                  <div>
                    <p className="text-xs font-black text-[#1C0357]">{t.label}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
        <div className="flex flex-col gap-2">
          {QUALITY_FILTER_OPTIONS.map(type => (
            <Button
              key={type.value}
              variant="ghost"
              onClick={() => updateSearchParam('track_type', type.value)}
              className={cn(
                "justify-start h-10 px-3 rounded-lg font-bold text-sm transition-all",
                currentTrackType === type.value ? "bg-[#F538BC] text-white hover:bg-[#F538BC]" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {type.label}
              {currentTrackType === type.value && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-100" />

      {hasActiveFilters && (
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
        title={urlProduct ? `${urlProduct.title} | Piano Backings by Daniele` : "Sheet Music & Backing Track Library | Piano Backings by Daniele"}
        description={urlProduct
          ? (urlProduct.description || `${urlProduct.title} backing track by Piano Backings by Daniele. High-quality digital download, ready instantly.`)
          : "Premium collection of piano backing tracks for musical theatre. High-quality digital downloads ready instantly."}
        canonicalUrl={urlProduct ? `${window.location.origin}/shop/${urlProduct.id}` : undefined}
      />
      {urlProduct && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicRecording",
            name: urlProduct.title,
            byArtist: { "@type": "MusicGroup", name: urlProduct.artist_name || "Piano Backings by Daniele" },
            ...(urlProduct.duration_seconds ? { duration: formatDurationIso(urlProduct.duration_seconds) } : {}),
            ...(urlProduct.key_signature ? { inAlbum: { "@type": "MusicAlbum", name: `${urlProduct.title} in ${urlProduct.key_signature}` } } : {}),
            offers: {
              "@type": "Offer",
              price: urlProduct.price,
              priceCurrency: (urlProduct.currency || 'USD').toUpperCase(),
              availability: "https://schema.org/InStock",
              url: `${window.location.origin}/shop/${urlProduct.id}`,
            },
          })}
        </script>
      )}
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        
        {featuredProducts.length > 0 && !hasActiveFilters && (
          <section className="mb-12">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-8 w-8 rounded-lg bg-[#F538BC]/10 flex items-center justify-center text-[#F538BC]">
                <Star size={16} fill="currentColor" />
              </div>
              <h2 className="text-xl font-black text-[#1C0357] tracking-tighter uppercase">
                {featuredProducts.length === 1 ? 'Featured Offer' : 'Featured Offers'}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {featuredProducts.map(product => {
                const quality = TRACK_TYPES[product.track_type] || TRACK_TYPES.standard;
                const isNew = isWithinInterval(new Date(product.created_at), { start: subDays(new Date(), 14), end: new Date() });
                return (
                  <Card key={product.id} className="relative bg-[#1C0357] text-white rounded-2xl overflow-hidden border-none shadow-lg">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <Badge className="bg-[#F538BC] text-white border-none font-black px-2.5 py-0.5 text-[10px] tracking-widest">NEW</Badge>
                          )}
                          <Badge variant="outline" className="text-white border-white/30 font-bold px-2.5 py-0.5 text-[10px] tracking-widest">{quality.label}</Badge>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter leading-tight line-clamp-2">
                          {product.title}
                        </h3>
                        <p className="text-sm md:text-base text-white/70 font-medium leading-relaxed line-clamp-2 max-w-xl">
                          {product.description}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold mr-1">$</span>
                          <span className="text-5xl font-black tracking-tighter">{product.price.toFixed(2)}</span>
                          <span className="ml-2.5 text-xs font-bold text-white/40 uppercase tracking-widest">{product.currency}</span>
                        </div>
                        <Button 
                          onClick={() => handleBuyNow(product)}
                          disabled={isBuying}
                          className="bg-white text-[#1C0357] hover:bg-gray-100 h-12 px-8 rounded-xl font-black text-base shadow-xl active:scale-95 transition-all w-full sm:w-auto"
                        >
                          {isBuying ? <Loader2 className="animate-spin" /> : <><ShoppingCart className="mr-2.5" /> Instant Purchase</>}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-col lg:flex-row gap-16">
          
          {currentView !== 'list' && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-32">
                <div className="flex items-center gap-3 mb-8">
                  <SlidersHorizontal size={20} className="text-[#1C0357]" />
                  <h3 className="font-black text-[#1C0357] uppercase tracking-[0.2em] text-xs">Library Filters</h3>
                </div>
                {filterContent}
              </div>
            </aside>
          )}

          <div className="flex-1">
            
            <div className={cn("mb-10 flex gap-4", currentView !== 'list' && "lg:hidden")}>
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="search"
                  aria-label="Search library"
                  placeholder="Search library..."
                  value={currentSearchTerm}
                  onChange={(e) => updateSearchParam('q', e.target.value)}
                  className="pl-12 h-14 bg-white border-gray-200 rounded-2xl text-lg"
                />
              </div>
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" aria-label="Open filters" className="h-14 w-14 p-0 rounded-2xl border-gray-200 bg-white shadow-sm">
                    <Filter size={24} className="text-[#1C0357]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] sm:w-[400px] rounded-r-[40px] border-none">
                  <SheetHeader className="text-left mb-10">
                    <SheetTitle className="text-3xl font-black text-[#1C0357] tracking-tighter">Filters</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                    {filterContent}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-8">
              <div className="flex flex-wrap items-center gap-2 mr-auto">
                {hasActiveFilters ? (
                  <>
                    <p className="text-xs font-bold text-[#1C0357] uppercase tracking-[0.2em] mr-2">
                      {currentView === 'list' ? tableRows.length : clientFilteredProducts.length} {currentView === 'list' ? 'Song' : 'Track'}{(currentView === 'list' ? tableRows.length : clientFilteredProducts.length) === 1 ? '' : 's'} Found
                    </p>
                    {activeFilters.map(f => (
                      <button
                        key={f.key}
                        onClick={() => updateSearchParam(f.param, null)}
                        aria-label={`Remove filter ${f.label}`}
                        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[#1C0357] text-white text-[11px] font-bold hover:bg-[#2D0B8C] transition-colors"
                      >
                        {f.label}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                    <button
                      onClick={() => setSearchParams(new URLSearchParams())}
                      className="text-[11px] font-black uppercase tracking-wider text-[#F538BC] hover:text-[#F538BC]/70 transition-colors"
                    >
                      Clear all
                    </button>
                  </>
                ) : (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {currentView === 'list' ? tableRows.length : clientFilteredProducts.length} {currentView === 'list' ? 'Song' : 'Track'}{(currentView === 'list' ? tableRows.length : clientFilteredProducts.length) === 1 ? '' : 's'} in the Library
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => updateSearchParam('view', 'grid')}
                    aria-label="Grid view"
                    title="Grid view"
                    className={cn(
                      "h-7 w-8 flex items-center justify-center rounded-lg transition-colors",
                      currentView === 'grid' ? "bg-white text-[#1C0357] shadow-sm" : "text-gray-400 hover:text-[#1C0357]"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => updateSearchParam('view', 'list')}
                    aria-label="List view"
                    title="List view"
                    className={cn(
                      "h-7 w-8 flex items-center justify-center rounded-lg transition-colors",
                      currentView === 'list' ? "bg-white text-[#1C0357] shadow-sm" : "text-gray-400 hover:text-[#1C0357]"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                <Select value={currentSort} onValueChange={(v) => updateSearchParam('sort', v)}>
                  <SelectTrigger className="h-9 w-[190px] bg-white border-gray-200 rounded-xl font-bold text-xs" aria-label="Sort products">
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 mr-1" />
                    <SelectValue>{sortLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title_asc">Title: A-Z</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="created_at_desc">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                <p className="text-gray-500 font-medium mb-10 text-lg max-w-md mx-auto">
                  Try adjusting your filters or search keywords. Can't find what you're looking for? Request a custom backing track instead.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button 
                    variant="outline" 
                    className="rounded-2xl font-black px-10 py-6 border-2"
                    onClick={() => setSearchParams(new URLSearchParams())}
                  >
                    Clear all filters
                  </Button>
                  <Link to="/form-page">
                    <Button className="rounded-2xl font-black px-10 py-6 bg-[#F538BC] hover:bg-[#F538BC]/90 shadow-xl shadow-[#F538BC]/20 active:scale-95 transition-all">
                      <Mic2 className="mr-2 h-5 w-5" /> Request this song
                    </Button>
                  </Link>
                </div>
              </div>
            ) : currentView === 'list' ? (
              <ProductTable rows={tableRows} currentSort={currentSort} onSort={(v) => updateSearchParam('sort', v)} onViewDetails={handleViewDetails} onBuyNow={handleBuyNow} isBuying={isBuying} />
            ) : (
              <div className="space-y-24">
                {groupedProducts.length > 1 && (
                  <div className="sticky top-32 z-30 flex flex-wrap gap-2 bg-white/95 backdrop-blur py-3 -mx-2 px-2 rounded-xl">
                    {groupedProducts.map(section => (
                      <a
                        key={section.id}
                        href={`#section-${section.id}`}
                        className="px-4 py-2 rounded-full bg-white border border-gray-200 text-xs font-black text-[#1C0357] hover:bg-[#1C0357] hover:text-white transition-colors"
                      >
                        {section.label} ({section.totalCount})
                      </a>
                    ))}
                  </div>
                )}
                {groupedProducts.map(section => (
                  <section key={section.id} id={`section-${section.id}`} className="space-y-10 scroll-mt-40">
                    <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-[#1C0357] tracking-tighter uppercase">{section.label}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{section.totalCount} Track{section.totalCount === 1 ? '' : 's'} Available</p>
                        {CATEGORY_DESCRIPTIONS[section.id] && (
                          <p className="text-sm text-gray-500 font-medium">{CATEGORY_DESCRIPTIONS[section.id]}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                      {section.groups.map(group => (
                        <ProductCard
                          key={group.key}
                          variants={group.variants}
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
          onOpenChange={open => {
            if (!open) {
              setSelectedProductForDetail(null);
              setSelectedVariantsForDetail(null);
              setUrlProduct(null);
              setPromoCode('');
              setDiscountInfo(null);
              if (urlProductId) navigate('/shop');
            }
          }}
          product={selectedProductForDetail}
          variants={selectedVariantsForDetail || undefined}
          related={relatedProducts}
          onOpenProduct={(p, v) => handleViewDetails(p, v)}
          onBuyNow={handleBuyNow}
          isBuying={isBuying}
          promoCode={promoCode}
          onPromoCodeChange={(code: string) => {
            setPromoCode(code);
            if (!code) setDiscountInfo(null);
          }}
          discountInfo={discountInfo}
          isValidatingPromo={isValidatingPromo}
          onApplyPromo={handleValidatePromo}
        />
      )}

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-[#1C0357] text-white shadow-xl hover:bg-[#2D0B8C] flex items-center justify-center transition-all active:scale-95"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Shop;
