import { useSearchParams } from 'react-router-dom';
import { Users, ShoppingBag, Star, Contact, ListChecks, Gift } from 'lucide-react';
import { UsersTabContent } from '@/components/admin/UsersTabContent';
import { OrdersTabContent } from '@/components/admin/OrdersTabContent';
import ReviewRequestsTab from '@/components/admin/ReviewRequestsTab';
import CustomersTab from '@/components/admin/crm/CustomersTab';
import WaitlistTab from '@/components/admin/crm/WaitlistTab';
import ReferralsTab from '@/components/admin/crm/ReferralsTab';
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import { SectionTabs } from '@/components/admin/SectionTabs';

type ClientsSub = 'customers' | 'directory' | 'orders' | 'reviews' | 'waitlist' | 'referrals';

const SUBS: { id: ClientsSub; label: string; icon: typeof Users }[] = [
  { id: 'customers', label: 'Customers', icon: Contact },
  { id: 'directory', label: 'Accounts', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'reviews', label: 'Review requests', icon: Star },
  { id: 'waitlist', label: 'Waitlist', icon: ListChecks },
  { id: 'referrals', label: 'Referral codes', icon: Gift },
];

// One line of context per tab, so the section never opens as a wall of controls
// with no framing — the same pattern the Shop section uses.
const SUB_DESCRIPTIONS: Record<ClientsSub, string> = {
  customers: 'Everyone you have worked with: contacts, history and follow-ups.',
  directory: 'Login accounts — who can sign in, and what they can see.',
  orders: 'Purchases from the shop, and their fulfilment state.',
  reviews: 'Ask happy clients for a review, and track who has replied.',
  waitlist: 'People waiting for a service to reopen.',
  referrals: 'Referral codes to share, and who has used them.',
};

const ClientsSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSub = searchParams.get('sub');
  const sub: ClientsSub = SUBS.some((item) => item.id === rawSub)
    ? (rawSub as ClientsSub)
    : 'customers';

  const setSub = (next: ClientsSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'customers') sp.delete('sub'); else sp.set('sub', next);
    setSearchParams(sp, { replace: false });
  };

  return (
    <div className="w-full">
      <AdminDashboardHeader title="Clients" description={SUB_DESCRIPTIONS[sub]} />

      <SectionTabs tabs={SUBS} active={sub} onSelect={setSub} />

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
