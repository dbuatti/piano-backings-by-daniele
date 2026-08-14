import { useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
} from 'lucide-react';

import RequestsSection from './sections/RequestsSection';
import ShopSection from './sections/ShopSection';
import ClientsSection from './sections/ClientsSection';
import SettingsSection from './sections/SettingsSection';

export type AdminSection = 'requests' | 'shop' | 'clients' | 'settings';

const VALID_SECTIONS: AdminSection[] = ['requests', 'shop', 'clients', 'settings'];

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'requests', label: 'Requests', icon: LayoutDashboard },
  { id: 'shop', label: 'Shop', icon: ShoppingCart },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const AdminShell = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ id?: string }>();
  const { isAdmin, isLoading: isAuthLoading, user } = useAdmin();

  const rawSection = searchParams.get('section') as AdminSection | null;
  const section: AdminSection = rawSection && VALID_SECTIONS.includes(rawSection) ? rawSection : 'requests';

  // Selected request comes only from the deep-link path (/admin/request/:id)
  // so the hosted panes (which read useParams().id) resolve correctly.
  const selectedRequestId = params.id || null;
  const mode = (searchParams.get('mode') as 'view' | 'edit' | 'email' | null) || 'view';

  const { data: unreadIssueReports = 0 } = useQuery<number, Error>({
    queryKey: ['unreadIssueReportsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issue_reports')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isAuthLoading, navigate]);

  if (isAuthLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!isAdmin) return null;

  const handleSectionChange = (next: AdminSection) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('section', next);
    // Clear request selection when leaving requests (except keep sub)
    if (next !== 'requests') {
      sp.delete('request');
    }
    setSearchParams(sp, { replace: false });
    navigate({ pathname: '/admin', search: sp.toString() });
  };

  const ActiveSection = (
    <div className="flex-1 min-w-0">
      {section === 'requests' && (
        <RequestsSection
          selectedRequestId={selectedRequestId}
          mode={mode}
        />
      )}
      {section === 'shop' && <ShopSection />}
      {section === 'clients' && <ClientsSection />}
      {section === 'settings' && (
        <SettingsSection unreadIssueReports={unreadIssueReports as number} />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-24 pb-10">
        {/* Section rail */}
        <nav className="flex items-center gap-2 mb-6 overflow-x-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 h-11 rounded-xl font-bold text-sm whitespace-nowrap transition-colors border',
                  active
                    ? 'bg-[#1C0357] text-white border-[#1C0357] shadow-sm'
                    : 'bg-white text-[#1C0357] border-gray-200 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.id === 'settings' && (unreadIssueReports as number) > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {unreadIssueReports}
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-400 truncate max-w-[220px]">
              {user?.email}
            </span>
          </div>
        </nav>

        {/* Workspace */}
        <div className="flex flex-col lg:flex-row gap-6">
          {ActiveSection}
        </div>
      </div>
    </div>
  );
};

export default AdminShell;