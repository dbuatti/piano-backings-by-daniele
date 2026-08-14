import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Store,
  Plug,
  Database,
  MessageSquare,
  Bug,
} from 'lucide-react';

import ServiceClosureSettings from '@/components/admin/ServiceClosureSettings';
import HolidayModeSettings from '@/components/admin/HolidayModeSettings';
import NotificationRecipientsManager from '@/components/NotificationRecipientsManager';
import DropboxMonitor from '@/pages/DropboxMonitor';
import GmailOAuthButton from '@/components/GmailOAuthButton';
import DataImporter from '@/pages/DataImporter';
import RequestOwnershipTabContent from '@/components/admin/RequestOwnershipTabContent';
import IssueReportsTabContent from '@/components/admin/IssueReportsTabContent';
import FormDebugger from '@/components/admin/FormDebugger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SettingsSub = 'storefront' | 'integrations' | 'data-tools' | 'feedback' | 'developer';

interface SettingsSectionProps {
  unreadIssueReports: number;
}

const SUBS: { id: SettingsSub; label: string; icon: typeof Store }[] = [
  { id: 'storefront', label: 'Storefront', icon: Store },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'data-tools', label: 'Data Tools', icon: Database },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'developer', label: 'Developer', icon: Bug },
];

const SettingsSection: React.FC<SettingsSectionProps> = ({ unreadIssueReports }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = (searchParams.get('sub') as SettingsSub) || 'storefront';

  const setSub = (next: SettingsSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'storefront') sp.delete('sub'); else sp.set('sub', next);
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
              {item.id === 'feedback' && unreadIssueReports > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {unreadIssueReports}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sub === 'storefront' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ServiceClosureSettings />
            <HolidayModeSettings />
          </div>
          <NotificationRecipientsManager />
        </div>
      )}

      {sub === 'integrations' && (
        <div className="space-y-8">
          <Card className="bg-white border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357]">Gmail — Outgoing Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-500">
                Connect the <code>pianobackingsbydaniele@gmail.com</code> account so the app can send request
                confirmations, deliveries, and admin notifications via the Gmail API.
              </p>
              <GmailOAuthButton />
            </CardContent>
          </Card>
          <DropboxMonitor />
        </div>
      )}

      {sub === 'data-tools' && (
        <div className="space-y-8">
          <RequestOwnershipTabContent />
          <DataImporter />
        </div>
      )}

      {sub === 'feedback' && <IssueReportsTabContent />}

      {sub === 'developer' && (
        <div className="space-y-8">
          <Card className="bg-white border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357]">Developer & Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Form submission debugger and legacy diagnostic utilities (formerly <code>/test-*</code> routes).
              </p>
              <FormDebugger />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsSection;