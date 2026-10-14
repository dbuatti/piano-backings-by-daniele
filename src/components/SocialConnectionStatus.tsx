import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface PlatformStatus {
  connected: boolean;
  account?: string | null;
  expiresAt?: string | null;
}

interface SocialStatus {
  tiktok: PlatformStatus;
  instagram: PlatformStatus;
}

const ROWS: { key: keyof SocialStatus; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
];

// Whole days until the stored token expires, or null when it has no expiry.
const daysLeft = (iso?: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.ceil(ms / 86_400_000) : null;
};

// Shows whether each social account is connected. Read-only: connecting happens
// through the Connect buttons, which run the OAuth redirect. Tokens are refreshed
// automatically (refresh-social-tokens), so an "Expires in…" badge is a warning
// that a refresh has stopped happening, before the next post 401s.
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
        const days = status?.connected ? daysLeft(status.expiresAt) : null;
        return (
          <li key={key} className="flex items-center gap-2">
            <span className="w-20 text-gray-500">{label}</span>
            {status?.connected ? (
              <>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  Connected{status.account ? ` · ${status.account}` : ''}
                </Badge>
                {days != null && days <= 0 && (
                  <Badge variant="destructive" title="The token has expired — reconnect to keep posting.">
                    Login expired
                  </Badge>
                )}
                {days != null && days > 0 && days <= 7 && (
                  <Badge
                    variant="outline"
                    className="border-amber-300 text-amber-700"
                    title="Tokens refresh automatically; this showing means a refresh hasn't happened yet."
                  >
                    Expires in {days}d
                  </Badge>
                )}
              </>
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
