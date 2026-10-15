import { useSearchParams } from 'react-router-dom';
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
import YouTubeOAuthButton from '@/components/YouTubeOAuthButton';
import SocialOAuthButtons from '@/components/SocialOAuthButtons';
import SocialConnectionStatus from '@/components/SocialConnectionStatus';
import PlatformSetupGuide from '@/components/PlatformSetupGuide';
import DataImporter from '@/pages/DataImporter';
import RequestOwnershipTabContent from '@/components/admin/RequestOwnershipTabContent';
import IssueReportsTabContent from '@/components/admin/IssueReportsTabContent';
import FormDebugger from '@/components/admin/FormDebugger';
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import { SectionTabs } from '@/components/admin/SectionTabs';
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

const SUB_DESCRIPTIONS: Record<SettingsSub, string> = {
  storefront: 'Opening hours, holidays and who gets notified about new work.',
  integrations: 'Connect Gmail, Dropbox, YouTube and the social accounts the app posts with.',
  'data-tools': 'Ownership transfers, imports and one-off data fixes.',
  feedback: 'Bug reports and suggestions sent from the site.',
  developer: 'Diagnostics and testing utilities.',
};

const SettingsSection: React.FC<SettingsSectionProps> = ({ unreadIssueReports }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSub = searchParams.get('sub');
  const sub: SettingsSub = SUBS.some((item) => item.id === rawSub)
    ? (rawSub as SettingsSub)
    : 'storefront';

  const setSub = (next: SettingsSub) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'storefront') sp.delete('sub'); else sp.set('sub', next);
    setSearchParams(sp, { replace: false });
  };

  const tabs = SUBS.map((item) => ({
    ...item,
    ...(item.id === 'feedback' && unreadIssueReports > 0
      ? { badge: unreadIssueReports, tone: 'red' as const }
      : {}),
  }));

  return (
    <div className="w-full">
      <AdminDashboardHeader title="Settings" description={SUB_DESCRIPTIONS[sub]} />

      <SectionTabs tabs={tabs} active={sub} onSelect={setSub} />

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
          <Card className="bg-white border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357]">YouTube — Channel Uploads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-500">
                Connect the <strong>Piano Backings by Daniele</strong> YouTube channel so the Video Title
                Cards tool can publish silently. On Google's account picker, choose the{' '}
                <em>Piano Backings by Daniele</em> channel (a Brand Account) — not the Gmail mailbox,
                which stays authorised separately for email.
              </p>
              <YouTubeOAuthButton />
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#1C0357]">Social — Teaser Posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-500">
                Connect the accounts used for the short teaser clips. Once connected, the
                release board and the 15-minute worker post teasers alongside the YouTube
                upload. Step-by-step setup, and what each platform can and cannot do
                automatically, is in the guide below.
              </p>
              <SocialConnectionStatus />
              <SocialOAuthButtons />
            </CardContent>
          </Card>
          <PlatformSetupGuide />
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
