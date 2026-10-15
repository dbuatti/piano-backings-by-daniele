import { Link, useSearchParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import {
  Tag,
  PlusCircle,
  RefreshCw,
  Megaphone,
  Store,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import { SectionTabs } from '@/components/admin/SectionTabs';

import CreateNewProduct from '@/components/admin/CreateNewProduct';
import RepurposeTrackToShop from '@/components/admin/RepurposeTrackToShop';
import ProductManager from '@/components/admin/ProductManager';
import ShopPreviewsCard from '@/components/admin/ShopPreviewsCard';
import { PromoCodesTabContent } from '@/components/admin/PromoCodesTabContent';

const IgGenerator = lazy(() => import('@/pages/IgGenerator'));

type ShopSub = 'products' | 'promo' | 'marketing';

// `view` is the sub-mode of the Products tab: absent means the product list.
type ShopView = 'create' | 'repurpose';

const SUBS: { id: ShopSub; label: string; icon: typeof Tag }[] = [
  { id: 'products', label: 'Products', icon: Store },
  { id: 'promo', label: 'Promo Codes', icon: Tag },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
];

// One line of context per tab, shown in the page header so the section never
// opens as a wall of controls with no framing.
const SUB_DESCRIPTIONS: Record<ShopSub, string> = {
  products: 'Everything for sale: listings, prices, artwork and preview clips.',
  promo: 'Discount codes for the shop and custom work, with how often they have been used.',
  marketing: 'Build and export Instagram carousels from what is already live in the shop.',
};

const IgGeneratorWrapper = () => (
  <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading the Instagram tool…</div>}>
    <IgGenerator />
  </Suspense>
);

const MarketingPanel: React.FC = () => (
  <div className="space-y-4">
    <IgGeneratorWrapper />
    <p className="text-xs text-gray-400">
      Video title cards and teaser recordings live in{' '}
      <Link to="/admin?section=publishing" className="font-semibold text-[#1C0357] underline">
        Publishing
      </Link>
      .
    </p>
  </div>
);

const ShopSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSub = searchParams.get('sub');
  const sub: ShopSub = SUBS.some((item) => item.id === rawSub) ? (rawSub as ShopSub) : 'products';
  const view: ShopView | null =
    searchParams.get('view') === 'repurpose'
      ? 'repurpose'
      : searchParams.get('view') === 'create'
        ? 'create'
        : null;

  const setSub = (next: ShopSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'products') sp.delete('sub');
    else sp.set('sub', next);
    // A creation mode only belongs to the Products tab.
    if (next !== 'products') sp.delete('view');
    setSearchParams(sp, { replace: false });
  };

  const setView = (next: string | null) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'create' || next === 'repurpose') sp.set('view', next);
    else sp.delete('view');
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="w-full">
      <AdminDashboardHeader title="Shop" description={SUB_DESCRIPTIONS[sub]} />

      <SectionTabs tabs={SUBS} active={sub} onSelect={setSub} />

      {sub === 'products' && (
        <div className="space-y-6">
          <Tabs value={view ?? 'list'} onValueChange={(next) => setView(next)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-gray-100/70 p-1 rounded-xl">
              <TabsTrigger value="list" className="rounded-lg font-bold">
                Listings
              </TabsTrigger>
              <TabsTrigger value="create" className="rounded-lg font-bold">
                <PlusCircle className="mr-1.5 h-4 w-4" /> New listing
              </TabsTrigger>
              <TabsTrigger value="repurpose" className="rounded-lg font-bold">
                <RefreshCw className="mr-1.5 h-4 w-4" /> Repurpose a track
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="mt-4 space-y-6">
              <ShopPreviewsCard />
              <ProductManager />
            </TabsContent>
            <TabsContent value="create" className="mt-4">
              <CreateNewProduct onCreated={() => setView(null)} />
            </TabsContent>
            <TabsContent value="repurpose" className="mt-4">
              <RepurposeTrackToShop onCreated={() => setView(null)} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {sub === 'promo' && <PromoCodesTabContent />}

      {sub === 'marketing' && <MarketingPanel />}
    </div>
  );
};

export default ShopSection;
