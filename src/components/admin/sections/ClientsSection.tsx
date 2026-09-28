import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Users, ShoppingBag, Star } from 'lucide-react';
import { UsersTabContent } from '@/components/admin/UsersTabContent';
import { OrdersTabContent } from '@/components/admin/OrdersTabContent';
import ReviewRequestsTab from '@/components/admin/ReviewRequestsTab';

type ClientsSub = 'directory' | 'orders' | 'reviews';

const SUBS: { id: ClientsSub; label: string; icon: typeof Users }[] = [
  { id: 'directory', label: 'Directory', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'reviews', label: 'Review requests', icon: Star },
];

const ClientsSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = (searchParams.get('sub') as ClientsSub) || 'directory';

  const setSub = (next: ClientsSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'directory') sp.delete('sub'); else sp.set('sub', next);
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

      {sub === 'directory' && <UsersTabContent />}
      {sub === 'orders' && <OrdersTabContent />}
      {sub === 'reviews' && <ReviewRequestsTab />}
    </div>
  );
};

export default ClientsSection;