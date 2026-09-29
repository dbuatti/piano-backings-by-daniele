import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Loader2, Search, Users, Repeat, Star, BellRing, ListChecks } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn, getErrorMessage } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import {
  DUE_LABELS,
  aud,
  dueReasons,
  fetchCrmStats,
  fetchCustomers,
  tierLabel,
  type CrmCustomer,
} from '@/lib/crm';
import CustomerDetail from './CustomerDetail';

type SortKey = 'name' | 'email' | 'order_count' | 'total_spent' | 'first_order_at' | 'last_order_at';
type Filter = 'all' | 'due' | 'review-requested' | 'review-left' | 'no-review' | 'follow-up-set';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All customers' },
  { id: 'due', label: 'Due for follow-up' },
  { id: 'review-requested', label: 'Review requested' },
  { id: 'review-left', label: 'Review left' },
  { id: 'no-review', label: 'Not asked yet' },
  { id: 'follow-up-set', label: 'Follow-up date set' },
];

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'name', label: 'Customer' },
  { key: 'order_count', label: 'Orders', className: 'text-right' },
  { key: 'total_spent', label: 'Spent', className: 'text-right' },
  { key: 'first_order_at', label: 'First order' },
  { key: 'last_order_at', label: 'Last order' },
];

const d = (value: string | null) => (value ? format(new Date(value.length === 10 ? `${value}T00:00:00` : value), 'd MMM yyyy') : '—');

const Stat: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; hint?: string }> = ({ icon: Icon, label, value, hint }) => (
  <Card className="rounded-2xl">
    <CardContent className="p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Icon className="h-3.5 w-3.5 text-[#F538BC]" /> {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[#1C0357]">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </CardContent>
  </Card>
);

const CustomersTab: React.FC = () => {
  const { data: customers = [], isLoading, error } = useQuery({ queryKey: ['crm-customers'], queryFn: fetchCustomers });
  const { data: stats } = useQuery({ queryKey: ['crm-stats'], queryFn: fetchCrmStats });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'last_order_at', dir: 'desc' });
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  const allTags = useMemo(() => [...new Set(customers.flatMap((c) => c.tags))].sort(), [customers]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (c: CrmCustomer) =>
      !q ||
      [c.name, c.email, c.referral_source, c.notes, ...c.songs, ...c.tags, ...c.promo_codes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    const passes = (c: CrmCustomer) => {
      switch (filter) {
        case 'due': return dueReasons(c).length > 0;
        case 'review-requested': return !!c.review_requested_at;
        case 'review-left': return c.review_left;
        case 'no-review': return !c.review_requested_at && !c.review_left;
        case 'follow-up-set': return !!c.follow_up_at;
        default: return true;
      }
    };
    const list = customers.filter((c) => matches(c) && passes(c) && (!tag || c.tags.includes(tag)));
    const value = (c: CrmCustomer) => (sort.key === 'name' ? (c.name || c.email).toLowerCase() : c[sort.key]);
    return list.sort((a, b) => {
      const av = value(a), bv = value(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [customers, search, filter, tag, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const exportCsv = () =>
    downloadCsv(
      'piano_backings_customers',
      ['Name', 'Email', 'Orders', 'Total spent (AUD)', 'First order', 'Last order', 'Songs', 'Tiers', 'Promo codes', 'Tags',
        'Referral source', 'Review requested', 'Review left', 'Last contacted', 'Follow up next', 'Due for follow-up', 'Notes'],
      rows.map((c) => [
        c.name, c.email, c.order_count, c.total_spent.toFixed(2),
        c.first_order_at?.slice(0, 10), c.last_order_at?.slice(0, 10),
        c.songs.join('; '), c.tiers.map(tierLabel).join('; '), c.promo_codes.join('; '), c.tags.join('; '),
        c.referral_source, c.review_requested_at?.slice(0, 10), c.review_left ? 'Yes' : 'No',
        c.last_contacted_at?.slice(0, 10), c.follow_up_at, dueReasons(c).map((r) => DUE_LABELS[r]).join('; '), c.notes,
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon={Users} label="Customers" value={stats?.total_customers ?? customers.length} />
        <Stat icon={Repeat} label="Repeat rate" value={stats?.repeat_rate != null ? `${stats.repeat_rate}%` : '—'} hint={stats ? `${stats.repeat_customers} ordered more than once` : undefined} />
        <Stat icon={Star} label="Reviews" value={stats ? `${stats.reviews_left} / ${stats.reviews_requested}` : '—'} hint="left / requested" />
        <Stat icon={BellRing} label="Due for follow-up" value={stats?.due_for_follow_up ?? '—'} />
        <Stat icon={ListChecks} label="Waitlist" value={stats?.waitlist_size ?? '—'} hint="waiting for orders to reopen" />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, song, tag, notes…" className="pl-9" />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV ({rows.length})
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-bold border transition-colors',
              filter === f.id ? 'bg-[#1C0357] text-white border-[#1C0357]' : 'bg-white text-[#1C0357] border-gray-200 hover:bg-gray-50',
            )}
          >
            {f.label}
            {f.id === 'due' && stats ? ` (${stats.due_for_follow_up})` : ''}
          </button>
        ))}
        {allTags.length > 0 && <span className="mx-1 w-px bg-gray-200" aria-hidden="true" />}
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(tag === t ? null : t)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-bold border transition-colors',
              tag === t ? 'bg-[#F538BC] text-white border-[#F538BC]' : 'bg-white text-[#F538BC] border-[#F538BC]/30 hover:bg-[#F538BC]/5',
            )}
          >
            #{t}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-500"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading customers…</p>}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Couldn't load customers: {getErrorMessage(error)}</p>}

      {!isLoading && !error && (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} className={cn('px-4 py-3 text-left', col.className)}>
                    <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-[#1C0357]">
                      {col.label}
                      {sort.key === col.key ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left">Songs & tiers</th>
                <th className="px-4 py-3 text-left">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((c) => {
                const due = dueReasons(c);
                return (
                  <tr key={c.email} onClick={() => setOpenEmail(c.email)} className="cursor-pointer hover:bg-[#FDFCF7] align-top">
                    <td className="px-4 py-3 min-w-[200px]">
                      <p className="font-bold text-[#1C0357]">{c.name || c.email}</p>
                      {c.name && <p className="text-xs text-gray-500">{c.email}</p>}
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => <Badge key={t} variant="secondary" className="bg-[#F538BC]/10 text-[#F538BC] text-[10px]">#{t}</Badge>)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{aud(c.total_spent)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{d(c.first_order_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{d(c.last_order_at)}</td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <p className="text-xs text-gray-700 line-clamp-2">{c.songs.join(', ') || '—'}</p>
                      <p className="mt-1 text-[11px] font-bold text-gray-500">{c.tiers.map(tierLabel).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[170px]">
                      {due.map((r) => (
                        <Badge key={r} className="mr-1 mb-1 bg-[#F538BC] text-white text-[10px]">{DUE_LABELS[r]}</Badge>
                      ))}
                      <p className="text-[11px] text-gray-500">
                        {c.review_left ? 'Review left ✓' : c.review_requested_at ? `Review asked ${d(c.review_requested_at)}` : 'Review not asked'}
                      </p>
                      {c.follow_up_at && <p className="text-[11px] text-gray-500">Next: {d(c.follow_up_at)}</p>}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No customers match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CustomerDetail
        customer={customers.find((c) => c.email === openEmail) || null}
        onClose={() => setOpenEmail(null)}
      />
    </div>
  );
};

export default CustomersTab;
