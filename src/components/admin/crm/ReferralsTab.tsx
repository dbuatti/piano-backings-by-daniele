import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Copy, Gift, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { aud } from '@/lib/crm';
import { getErrorMessage } from '@/lib/utils';

// Referral codes are ordinary promo codes (same checkout, same redemption records)
// with a referrer attached; stats come from the referral_code_stats view (0033).

interface ReferralStats {
  id: string;
  code: string;
  referrer_name: string;
  referrer_email: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  reward_every: number;
  rewards_given: number;
  created_at: string;
  uses: number;
  revenue: number;
  rewards_earned: number;
  rewards_owed: number;
  last_used_at: string | null;
}

const fetchReferrals = async (): Promise<ReferralStats[]> => {
  const { data, error } = await supabase.from('referral_code_stats').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? 'Run supabase/migrations/0033_crm.sql to set up referral codes.' : error.message);
  return (data || []).map((r) => ({ ...r, revenue: Number(r.revenue), discount_value: Number(r.discount_value) })) as ReferralStats[];
};

const EMPTY = { name: '', email: '', code: '', discount: '10', rewardEvery: '5' };

const suggestCode = (name: string, discount: string) => {
  const first = name.trim().split(/\s+/)[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
  return first ? `${first}${discount.replace(/[^0-9]/g, '')}` : '';
};

const ReferralsTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: codes = [], isLoading, error } = useQuery({ queryKey: ['crm-referrals'], queryFn: fetchReferrals });
  const [form, setForm] = useState(EMPTY);
  const [codeEdited, setCodeEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['crm-referrals'] });
  const set = (patch: Partial<typeof EMPTY>) =>
    setForm((f) => {
      const next = { ...f, ...patch };
      if (!codeEdited && ('name' in patch || 'discount' in patch)) next.code = suggestCode(next.name, next.discount);
      return next;
    });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const discount = Number(form.discount);
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return toast({ title: 'Codes are 3–20 letters or numbers', variant: 'destructive' });
    if (!(discount > 0 && discount <= 100)) return toast({ title: 'Discount must be between 1 and 100%', variant: 'destructive' });
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('promo_codes').select('id').ilike('code', code).maybeSingle();
      if (existing) throw new Error(`${code} already exists`);
      const { error: insertError } = await supabase.from('promo_codes').insert({
        code,
        discount_type: 'percentage',
        discount_value: discount,
        is_active: true,
        description: `Referral code for ${form.name.trim()}`,
        referrer_name: form.name.trim(),
        referrer_email: form.email.trim().toLowerCase() || null,
        reward_every: Math.max(1, parseInt(form.rewardEvery, 10) || 5),
      });
      if (insertError) throw insertError;
      toast({ title: `Created ${code}`, description: `${discount}% off for ${form.name.trim()}'s students` });
      setForm(EMPTY);
      setCodeEdited(false);
      refresh();
    } catch (err) {
      toast({ title: "Couldn't create code", description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateCode = async (id: string, patch: Record<string, unknown>, message: string) => {
    const { error: e } = await supabase.from('promo_codes').update(patch).eq('id', id);
    if (e) return toast({ title: "Couldn't update", description: e.message, variant: 'destructive' });
    toast({ title: message });
    refresh();
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: `Copied ${code}` });
    } catch {
      toast({ title: "Couldn't copy", variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="rounded-2xl h-fit">
        <CardHeader>
          <CardTitle className="text-[#1C0357] font-black">New referral code</CardTitle>
          <CardDescription>For a voice teacher to share with students. Works at checkout for shop orders and custom tracks.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label htmlFor="ref-name">Teacher name</Label>
              <Input id="ref-name" required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lisa Smith" />
            </div>
            <div>
              <Label htmlFor="ref-email">Teacher email (optional)</Label>
              <Input id="ref-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ref-discount">Discount %</Label>
                <Input id="ref-discount" type="number" min={1} max={100} required value={form.discount} onChange={(e) => set({ discount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ref-reward">Free track every</Label>
                <Input id="ref-reward" type="number" min={1} value={form.rewardEvery} onChange={(e) => set({ rewardEvery: e.target.value })} aria-describedby="ref-reward-hint" />
                <p id="ref-reward-hint" className="text-[11px] text-gray-500">orders</p>
              </div>
            </div>
            <div>
              <Label htmlFor="ref-code">Code</Label>
              <Input id="ref-code" required value={form.code} onChange={(e) => { setCodeEdited(true); setForm((f) => ({ ...f, code: e.target.value.toUpperCase() })); }} placeholder="LISA10" className="font-mono" />
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-[#1C0357] hover:bg-[#2D0B8C] font-black">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Create code
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-gray-500"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading…</p>}
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(error)}</p>}
        {!isLoading && !error && !codes.length && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-gray-500">No referral codes yet. Create one for each teacher who sends students your way.</p>
        )}
        {codes.map((c) => (
          <Card key={c.id} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-lg font-black text-[#1C0357]">
                    <span className="font-mono">{c.code}</span>
                    <button type="button" onClick={() => copy(c.code)} aria-label={`Copy ${c.code}`} className="text-gray-400 hover:text-[#1C0357]"><Copy className="h-4 w-4" /></button>
                    {!c.is_active && <Badge variant="secondary">Paused</Badge>}
                  </p>
                  <p className="text-sm text-gray-600">
                    {c.referrer_name}{c.referrer_email ? ` · ${c.referrer_email}` : ''} · {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `${aud(c.discount_value)} off`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  Active <Switch checked={c.is_active} onCheckedChange={(v) => updateCode(c.id, { is_active: v }, v ? `${c.code} is live` : `${c.code} paused`)} />
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-[#FDFCF7] p-3"><dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Uses</dt><dd className="text-xl font-black text-[#1C0357]">{c.uses}</dd></div>
                <div className="rounded-xl bg-[#FDFCF7] p-3"><dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revenue</dt><dd className="text-xl font-black text-[#1C0357]">{aud(c.revenue)}</dd></div>
                <div className="rounded-xl bg-[#FDFCF7] p-3"><dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Free tracks earned</dt><dd className="text-xl font-black text-[#1C0357]">{c.rewards_earned}</dd><dd className="text-[11px] text-gray-500">1 per {c.reward_every} orders · {c.rewards_given} given</dd></div>
                <div className="rounded-xl bg-[#FDFCF7] p-3"><dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Next free track</dt><dd className="text-xl font-black text-[#1C0357]">{c.reward_every - (c.uses % c.reward_every)}</dd><dd className="text-[11px] text-gray-500">more order{c.reward_every - (c.uses % c.reward_every) === 1 ? '' : 's'}</dd></div>
              </dl>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {c.rewards_owed > 0 ? (
                  <>
                    <Badge className="bg-[#F538BC] text-white"><Gift className="mr-1 h-3 w-3" />{c.rewards_owed} free track{c.rewards_owed === 1 ? '' : 's'} owed</Badge>
                    <Button size="sm" variant="outline" onClick={() => updateCode(c.id, { rewards_given: c.rewards_given + 1 }, `Recorded a free track for ${c.referrer_name}`)}>
                      Mark one given
                    </Button>
                  </>
                ) : (
                  <span className="text-gray-500">No free tracks owed.</span>
                )}
                <span className="text-gray-400">Last used {c.last_used_at ? format(new Date(c.last_used_at), 'd MMM yyyy') : 'never'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReferralsTab;
