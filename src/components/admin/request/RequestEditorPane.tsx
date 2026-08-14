import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, Edit, Mail, Loader2 } from 'lucide-react';

const RequestDetails = lazy(() => import('@/pages/RequestDetails'));
const EditRequest = lazy(() => import('@/pages/EditRequest'));
const EmailGenerator = lazy(() => import('@/pages/EmailGenerator'));

export type EditorMode = 'view' | 'edit' | 'email';

interface RequestEditorPaneProps {
  requestId: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

const PaneFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
  </div>
);

const TABS: { id: EditorMode; label: string; icon: typeof Eye }[] = [
  { id: 'view', label: 'Overview', icon: Eye },
  { id: 'edit', label: 'Edit', icon: Edit },
  { id: 'email', label: 'Email', icon: Mail },
];

const RequestEditorPane: React.FC<RequestEditorPaneProps> = ({ requestId, mode, onModeChange }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Segmented control */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 h-9 rounded-xl font-bold text-sm transition-colors',
                active ? 'bg-[#1C0357] text-white shadow-sm' : 'text-[#1C0357] hover:bg-gray-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-400 font-mono pr-2">#{requestId.substring(0, 8)}</span>
      </div>

      <div className="p-4 sm:p-6">
        <Suspense fallback={<PaneFallback />}>
          {mode === 'view' && <RequestDetails />}
          {mode === 'edit' && <EditRequest />}
          {mode === 'email' && <EmailGenerator />}
        </Suspense>
      </div>
    </div>
  );
};

export default RequestEditorPane;