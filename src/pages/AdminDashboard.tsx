import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminShell from '@/components/admin/AdminShell';

// Map legacy ?tab= bookmarks to the new section model so old links keep working.
const LEGACY_TAB_MAP: Record<string, string> = {
  requests: 'requests',
  shop: 'shop',
  users: 'clients',
  orders: 'clients&sub=orders',
  credits: 'clients',
  promo: 'shop&sub=promo',
  'promo-codes': 'shop&sub=promo',
  feedback: 'settings&sub=feedback',
  operations: 'settings&sub=storefront',
  system: 'settings&sub=data-tools',
};

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && LEGACY_TAB_MAP[tab]) {
      const mapping = LEGACY_TAB_MAP[tab];
      const sp = new URLSearchParams();
      if (mapping.includes('&')) {
        const [section, subPart] = mapping.split('&');
        sp.set('section', section);
        const [k, v] = subPart.split('=');
        if (k === 'sub') sp.set('sub', v);
      } else {
        sp.set('section', mapping);
      }
      setSearchParams(sp, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return <AdminShell />;
};

export default AdminDashboard;