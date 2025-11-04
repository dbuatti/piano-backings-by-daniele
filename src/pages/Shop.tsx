import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, XCircle, CheckCircle, ShoppingCart, Music, DollarSign, Key, FileText } from 'lucide-react';
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
import ProductCard from '@/components/shop/ProductCard'; // Ensure this path is correct
import ProductDetailDialog from '@/components/shop/ProductDetailDialog'; // Ensure this path is correct
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vocalRangeFilter, setVocalRangeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['shopProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
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

  const handleBuyNow = useCallback((product: Product) => {
    // Implement buy now logic, e.g., redirect to checkout or add to cart
    toast({
      title: "Buy Now",
      description: `Initiating purchase for "${product.title}"`,
    });
    console.log("Buy Now:", product);
  }, [toast]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setVocalRangeFilter('all');
    setPriceRange([0, 100]);
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'all' || vocalRangeFilter !== 'all' || priceRange[0] !== 0 || priceRange[1] !== 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
          <p className="ml-2 text-lg text-gray-700">Loading shop products...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p className="text-lg text-red-600">Error loading products: {error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-[#1C0357] mb-4">Shop</h1>
        <p className="text-lg text-gray-700 mb-8">Browse our collection of high-quality backing tracks.</p>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-full"
            />
          </div>
          
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-5 w-5" /> Filters
                {hasActiveFilters && <Badge className="ml-1 px-2 py-0.5 rounded-full bg-[#D1AAF2] text-[#1C0357]">Active</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Products</SheetTitle>
                <SheetDescription>
                  Refine your search results.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-6">
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

                <div>
                  <Label htmlFor="vocal-range-filter" className="mb-2 block">Vocal Range</Label>
                  <Select value={vocalRangeFilter} onValueChange={setVocalRangeFilter}>
                    <SelectTrigger id="vocal-range-filter">
                      <SelectValue placeholder="Select vocal range" />
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

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="w-full flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Clear Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {filteredProducts.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No products found matching your criteria.</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-4">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onViewDetails={handleViewDetails}
              />
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