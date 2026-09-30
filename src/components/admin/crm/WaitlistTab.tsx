import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, Copy, Download, Loader2, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAppSettings } from '@/hooks/useAppSettings';
import { getErrorMessage } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  source: string;
  created_at: string;
  notified_at: string | null;
}

const fetchWaitlist = async (): Promise<WaitlistEntry[]> => {
  const { data, error } = await supabase.from('waitlist').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? 'Run supabase/migrations/0033_crm.sql to set up the waitlist.' : error.message);
  return data as WaitlistEntry[];
};

/** People who asked to hear when custom orders reopen. */
const WaitlistTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isServiceClosed } = useAppSettings();
  const { data: entries = [], isLoading, error } = useQuery({ queryKey: ['crm-waitlist'], queryFn: fetchWaitlist });
  const [search, setSearch] = useState('');
  const [showNotified, setShowNotified] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => (showNotified || !e.notified_at) && (!q || `${e.email} ${e.name ?? ''}`.toLowerCase().includes(q)));
  }, [entries, search, showNotified]);
  const waiting = entries.filter((e) => !e.notified_at);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-waitlist'] });
    queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
  };

  const markNotified = async (ids: string[]) => {
    const { error: e } = await supabase.from('waitlist').update({ notified_at: new Date().toISOString() }).in('id', ids);
    if (e) return toast({ title: "Couldn't update", description: e.message, variant: 'destructive' });
    toast({ title: `Marked ${ids.length} as notified` });
    refresh();
  };

  const remove = async (entry: WaitlistEntry) => {
    if (!window.confirm(`Remove ${entry.email} from the waitlist?`)) return;
    const { error: e } = await supabase.from('waitlist').delete().eq('id', entry.id);
    if (e) return toast({ title: "Couldn't remove", description: e.message, variant: 'destructive' });
    refresh();
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(waiting.map((e) => e.email).join(', '));
      toast({ title: `Copied ${waiting.length} emails`, description: 'Paste them into Bcc so addresses stay private.' });
    } catch {
      toast({ title: "Couldn't copy", variant: 'destructive' });
    }
  };

  const exportCsv = () =>
    downloadCsv('piano_backings_waitlist', ['Email', 'Name', 'Signed up', 'Source', 'Notified'],
      rows.map((e) => [e.email, e.name, e.created_at.slice(0, 10), e.source, e.notified_at?.slice(0, 10) ?? '']));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Signups from the "Tell me when orders reopen" box, shown on the order form and home page while custom orders are closed
        {isServiceClosed ? ' (orders are closed now).' : ' (orders are open now, so the box is hidden).'}
      </p>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or name" className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
          <input type="checkbox" checked={showNotified} onChange={(e) => setShowNotified(e.target.checked)} /> Show already notified
        </label>
        <Button variant="outline" onClick={copyEmails} disabled={!waiting.length}><Copy className="mr-2 h-4 w-4" />Copy emails ({waiting.length})</Button>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        <Button onClick={() => markNotified(waiting.map((e) => e.id))} disabled={!waiting.length} className="bg-[#1C0357] hover:bg-[#2D0B8C] font-black">
          <Check className="mr-2 h-4 w-4" />Mark all notified
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-500"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading…</p>}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(error)}</p>}

      {!isLoading && !error && (
        <ul className="divide-y rounded-2xl border bg-white">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#1C0357] truncate">{e.name ? `${e.name} · ` : ''}{e.email}</p>
                <p className="text-xs text-gray-500">Signed up {format(new Date(e.created_at), 'd MMM yyyy')} · {e.source}</p>
              </div>
              {e.notified_at
                ? <Badge variant="secondary">Notified {format(new Date(e.notified_at), 'd MMM')}</Badge>
                : <Button size="sm" variant="outline" onClick={() => markNotified([e.id])}>Mark notified</Button>}
              <Button size="icon" variant="ghost" onClick={() => remove(e)} aria-label={`Remove ${e.email}`}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
          {!rows.length && <li className="p-8 text-center text-gray-500">No one on the waitlist{showNotified ? '' : ' waiting to hear back'}.</li>}
        </ul>
      )}
    </div>
  );
};

export default WaitlistTab;
