import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface PlatformStatus {
  connected: boolean;
  account?: string | null;
}

interface SocialStatus {
  tiktok: PlatformStatus;
  instagram: PlatformStatus;
}

const ROWS: { key: keyof SocialStatus; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
];

// Shows whether each social account is connected. Read-only: connecting happens
// through the Connect buttons, which run the OAuth redirect.
const SocialConnectionStatus = () => {
  const { data } = useQuery<SocialStatus>({
    queryKey: ['social-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-status', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SocialStatus;
    },
    retry: false,
  });

  return (
    <ul className="space-y-1.5 text-sm">
      {ROWS.map(({ key, label }) => {
        const status = data?.[key];
        return (
          <li key={key} className="flex items-center gap-2">
            <span className="w-20 text-gray-500">{label}</span>
            {status?.connected ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Connected{status.account ? ` · ${status.account}` : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400">Not connected</Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SocialConnectionStatus;
