import { useSearchParams } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import {
  Tag,
  PlusCircle,
  RefreshCw,
  Megaphone,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import CreateNewProduct from '@/components/admin/CreateNewProduct';
import RepurposeTrackToShop from '@/components/admin/RepurposeTrackToShop';
import ProductManager from '@/components/admin/ProductManager';
import { PromoCodesTabContent } from '@/components/admin/PromoCodesTabContent';

const IgGenerator = lazy(() => import('@/pages/IgGenerator'));

type ShopSub = 'products' | 'promo' | 'marketing';

const SUBS: { id: ShopSub; label: string; icon: typeof Tag }[] = [
  { id: 'products', label: 'Products', icon: PlusCircle },
  { id: 'promo', label: 'Promo Codes', icon: Tag },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
];

const IgGeneratorWrapper = () => (
  <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading marketing tool…</div>}>
    <IgGenerator />
  </Suspense>
);

const MarketingPanel = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-xl font-bold text-[#1C0357] flex items-center gap-2">
        <Megaphone className="h-5 w-5" /> Instagram Marketing
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        Build carousel slides and export PNGs for Instagram. Saved campaigns sync to your account.
      </p>
    </div>
    <IgGeneratorWrapper />
  </div>
);

const ShopSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = (searchParams.get('sub') as ShopSub) || 'products';
  const [shopViewMode, setShopViewMode] = useState<'create' | 'repurpose'>('create');

  const setSub = (next: ShopSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'products') sp.delete('sub'); else sp.set('sub', next);
    setSearchParams(sp, { replace: false });
  };

  return (
    <div className="w-full">
      <div className="flex mb-6 gap-2 overflow-x-auto">
        {SUBS.map((item) => {
          const Icon = item.icon;
          const active = sub === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSub(item.id)}
              className={cn(
                'flex items-center gap-2 px-4 h-10 rounded-xl font-bold text-sm whitespace-nowrap border transition-colors',
                active ? 'bg-[#1C0357] text-white border-[#1C0357]' : 'bg-white text-[#1C0357] border-gray-200 hover:bg-gray-50'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {sub === 'products' && (
        <div className="space-y-8">
          <Tabs value={shopViewMode} onValueChange={(v) => setShopViewMode(v as any)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100/50 p-1 rounded-xl">
              <TabsTrigger value="create" className="rounded-lg font-bold">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Product
              </TabsTrigger>
              <TabsTrigger value="repurpose" className="rounded-lg font-bold">
                <RefreshCw className="mr-2 h-4 w-4" /> Repurpose Request
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="mt-4"><CreateNewProduct /></TabsContent>
            <TabsContent value="repurpose" className="mt-4"><RepurposeTrackToShop /></TabsContent>
          </Tabs>
          <ProductManager />
        </div>
      )}

      {sub === 'promo' && <PromoCodesTabContent />}

      {sub === 'marketing' && <MarketingPanel />}
    </div>
  );
};

export default ShopSection;