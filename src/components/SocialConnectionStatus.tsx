import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
// Buttons are plain here so the row can sit inside any card without nesting a
// block-level Button; the styling matches the outline variant.
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

// Which function proves a platform is really usable (token works, account can
// post), and how to describe a healthy answer.
const PROBES: Record<keyof SocialStatus, (data: Record<string, unknown>) => string> = {
  tiktok: (d) => {
    const max = d.max_video_post_duration_sec;
    return [
      d.creator_username ? `@${d.creator_username}` : 'Connected',
      max ? `posts up to ${max}s` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  },
  instagram: (d) => {
    if (d.warning) return String(d.warning);
    return [
      d.username ? `@${d.username}` : 'Connected',
      d.accountType ? `${d.accountType} account` : null,
      typeof d.mediaCount === 'number' ? `${d.mediaCount} posts` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  },
};

// Whole days until the stored token expires, or null when it has no expiry.
const daysLeft = (iso?: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.ceil(ms / 86_400_000) : null;
};

// Shows whether each social account is connected, and lets the owner *check* it
// live — a stored token can look fine and still be refused by the platform. The
// test never posts anything; it just asks the platform who we are.
const SocialConnectionStatus = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState<keyof SocialStatus | null>(null);

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

  const test = async (key: keyof SocialStatus, label: string) => {
    setTesting(key);
    try {
      const fn = key === 'instagram' ? 'instagram-account' : 'tiktok-creator-info';
      const { data, error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const described = PROBES[key]((data ?? {}) as Record<string, unknown>);
      const warning = key === 'instagram' ? (data?.warning as string | null) : null;
      toast({
        title: warning ? `${label} is connected, but not ready` : `${label} looks good`,
        description: PROBES[key](data as Record<string, unknown>),
        variant: warning ? 'destructive' : 'default',
      });
    } catch (err) {
      toast({
        title: `${label} failed the check`,
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  return (
    <ul className="space-y-2 text-sm">
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
                <button
                  type="button"
                  onClick={() => test(key, label)}
                  disabled={testing === key}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-[#1C0357] hover:bg-gray-50 disabled:opacity-50"
                  title="Ask the platform if this account can post right now (posts nothing)."
                >
                  {testing === key && <Loader2 className="h-3 w-3 animate-spin" />}
                  Test
                </button>
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
