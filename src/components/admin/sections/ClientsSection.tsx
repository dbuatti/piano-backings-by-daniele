import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Users, ShoppingBag, Star, Contact, ListChecks, Gift } from 'lucide-react';
import { UsersTabContent } from '@/components/admin/UsersTabContent';
import { OrdersTabContent } from '@/components/admin/OrdersTabContent';
import ReviewRequestsTab from '@/components/admin/ReviewRequestsTab';
import CustomersTab from '@/components/admin/crm/CustomersTab';
import WaitlistTab from '@/components/admin/crm/WaitlistTab';
import ReferralsTab from '@/components/admin/crm/ReferralsTab';

type ClientsSub = 'customers' | 'directory' | 'orders' | 'reviews' | 'waitlist' | 'referrals';

const SUBS: { id: ClientsSub; label: string; icon: typeof Users }[] = [
  { id: 'customers', label: 'Customers (CRM)', icon: Contact },
  { id: 'directory', label: 'Accounts', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'reviews', label: 'Review requests', icon: Star },
  { id: 'waitlist', label: 'Waitlist', icon: ListChecks },
  { id: 'referrals', label: 'Referral codes', icon: Gift },
];

const ClientsSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = (searchParams.get('sub') as ClientsSub) || 'customers';

  const setSub = (next: ClientsSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'customers') sp.delete('sub'); else sp.set('sub', next);
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

      {sub === 'customers' && <CustomersTab />}
      {sub === 'directory' && <UsersTabContent />}
      {sub === 'orders' && <OrdersTabContent />}
      {sub === 'reviews' && <ReviewRequestsTab />}
      {sub === 'waitlist' && <WaitlistTab />}
      {sub === 'referrals' && <ReferralsTab />}
    </div>
  );
};

export default ClientsSection;