import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { format, startOfWeek, startOfMonth, subMonths, differenceInCalendarDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
import AdminDashboardHeader from '@/components/admin/AdminDashboardHeader';
import { DollarSign, TrendingUp, Users, Repeat, Music, AlertTriangle, Loader2 } from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  'note-bash': 'Note Bash',
  'audition-ready': 'Audition Ready',
  'full-song': 'Full Song',
};

const TIER_COLORS: Record<string, string> = {
  'note-bash': '#9CA3AF',
  'audition-ready': '#D1AAF2',
  'full-song': '#1C0357',
};

const ReportsSection = () => {
  const { requests, loading } = useAdminRequests();

  const stats = useMemo(() => {
    const paid = requests.filter((r) => r.is_paid);
    const totalRevenue = paid.reduce((sum, r) => sum + (r.cost || 0), 0);
    const avgOrderValue = paid.length > 0 ? totalRevenue / paid.length : 0;
    const conversionRate = requests.length > 0 ? (paid.length / requests.length) * 100 : 0;

    // Revenue by month, last 6 months
    const monthBuckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const key = format(startOfMonth(subMonths(new Date(), i)), 'MMM yy');
      monthBuckets[key] = 0;
    }
    paid.forEach((r) => {
      const key = format(startOfMonth(new Date(r.created_at)), 'MMM yy');
      if (key in monthBuckets) monthBuckets[key] += r.cost || 0;
    });
    const revenueByMonth = Object.entries(monthBuckets).map(([month, revenue]) => ({ month, revenue }));

    // Request volume by week, last 10 weeks
    const weekBuckets: Record<string, number> = {};
    for (let i = 9; i >= 0; i--) {
      const key = format(startOfWeek(new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)), 'd MMM');
      weekBuckets[key] = 0;
    }
    requests.forEach((r) => {
      const key = format(startOfWeek(new Date(r.created_at)), 'd MMM');
      if (key in weekBuckets) weekBuckets[key] += 1;
    });
    const volumeByWeek = Object.entries(weekBuckets).map(([week, count]) => ({ week, count }));

    // Revenue by tier
    const tierBuckets: Record<string, { revenue: number; count: number }> = {};
    paid.forEach((r) => {
      const tier = Array.isArray(r.backing_type) ? r.backing_type[0] : (r.backing_type as string) || 'audition-ready';
      if (!tierBuckets[tier]) tierBuckets[tier] = { revenue: 0, count: 0 };
      tierBuckets[tier].revenue += r.cost || 0;
      tierBuckets[tier].count += 1;
    });
    const revenueByTier = Object.entries(tierBuckets)
      .map(([tier, v]) => ({ tier, label: TIER_LABELS[tier] || tier, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    // Repeat clients
    const byEmail: Record<string, number> = {};
    requests.forEach((r) => {
      if (!r.email) return;
      byEmail[r.email] = (byEmail[r.email] || 0) + 1;
    });
    const uniqueClients = Object.keys(byEmail).length;
    const repeatClients = Object.values(byEmail).filter((c) => c > 1).length;
    const repeatRate = uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0;

    // Top songs
    const songCounts: Record<string, number> = {};
    requests.forEach((r) => {
      if (!r.song_title) return;
      const key = `${r.song_title}${r.musical_or_artist ? ` — ${r.musical_or_artist}` : ''}`;
      songCounts[key] = (songCounts[key] || 0) + 1;
    });
    const topSongs = Object.entries(songCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Stale unpaid — abandoned checkouts worth a follow-up
    const staleUnpaid = requests
      .filter((r) => !r.is_paid && r.status !== 'cancelled')
      .map((r) => ({ ...r, daysPending: differenceInCalendarDays(new Date(), new Date(r.created_at)) }))
      .filter((r) => r.daysPending >= 1)
      .sort((a, b) => b.daysPending - a.daysPending);
    const staleUnpaidValue = staleUnpaid.reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      totalRevenue,
      avgOrderValue,
      conversionRate,
      revenueByMonth,
      volumeByWeek,
      revenueByTier,
      uniqueClients,
      repeatClients,
      repeatRate,
      topSongs,
      staleUnpaid,
      staleUnpaidValue,
    };
  }, [requests]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1C0357]" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <AdminDashboardHeader
        title="Reports"
        description="Revenue, conversion, and growth signals across every request."
      />

      {/* Top-line KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
        <Card className="shadow-lg border-l-4 border-green-500 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Avg Order Value</p>
              <p className="text-3xl font-black text-green-600 mt-1">${stats.avgOrderValue.toFixed(0)}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-[#F538BC] bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Conversion Rate</p>
              <p className="text-3xl font-black text-[#F538BC] mt-1">{stats.conversionRate.toFixed(0)}%</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1">requests → paid</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#F538BC]/10 flex items-center justify-center text-[#F538BC]">
              <TrendingUp size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-[#1C0357] bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Unique Clients</p>
              <p className="text-3xl font-black text-[#1C0357] mt-1">{stats.uniqueClients}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#1C0357]/5 flex items-center justify-center text-[#1C0357]">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-yellow-500 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Repeat Client Rate</p>
              <p className="text-3xl font-black text-yellow-600 mt-1">{stats.repeatRate.toFixed(0)}%</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1">{stats.repeatClients} of {stats.uniqueClients} order again</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Repeat size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-lg bg-white rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1C0357]">Revenue — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#1C0357" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-white rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1C0357]">Request Volume — Last 10 Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.volumeByWeek}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Requests']} />
                <Line type="monotone" dataKey="count" stroke="#F538BC" strokeWidth={3} dot={{ r: 4, fill: '#F538BC' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-lg bg-white rounded-2xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1C0357]">Revenue by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.revenueByTier} layout="vertical" margin={{ left: 16 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                  {stats.revenueByTier.map((entry) => (
                    <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || '#1C0357'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-white rounded-2xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1C0357] flex items-center gap-2">
              <Music size={18} className="text-[#F538BC]" /> Most Requested Songs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topSongs.length === 0 ? (
              <p className="text-sm text-gray-400">No requests yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.topSongs.map(([song, count]) => (
                  <li key={song} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-700 truncate pr-4">{song}</span>
                    <span className="font-black text-[#1C0357] bg-[#1C0357]/5 rounded-full px-3 py-0.5 flex-shrink-0">{count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-white rounded-2xl lg:col-span-1 border-2 border-orange-100">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1C0357] flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" /> Unpaid Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.staleUnpaid.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing outstanding — clean pipeline.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  <strong className="text-orange-600">${stats.staleUnpaidValue.toFixed(0)}</strong> in requests started but never paid. Worth a nudge email.
                </p>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.staleUnpaid.slice(0, 8).map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-gray-700 truncate">{r.song_title || 'Untitled'}</p>
                        <p className="text-gray-400 truncate">{r.email}</p>
                      </div>
                      <span className="flex-shrink-0 font-black text-orange-500">{r.daysPending}d</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsSection;
