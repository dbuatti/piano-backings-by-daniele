import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Mail, Plus, Save, Star, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import {
  DUE_LABELS,
  PRESET_TAGS,
  aud,
  dueReasons,
  fetchCustomerOrders,
  markReviewRequested,
  saveCustomerFields,
  tierLabel,
  type CrmCustomer,
  type CrmFields,
} from '@/lib/crm';

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : '');
const nice = (value: string | null) => (value ? format(new Date(value), 'd MMM yyyy') : '—');
const today = () => new Date().toISOString().slice(0, 10);

const CustomerDetail: React.FC<{ customer: CrmCustomer | null; onClose: () => void }> = ({ customer, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CrmFields | null>(null);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const email = customer?.email ?? '';
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['crm-orders', email],
    queryFn: () => fetchCustomerOrders(email),
    enabled: !!email,
  });

  useEffect(() => {
    if (!customer) return setForm(null);
    setForm({
      notes: customer.notes,
      tags: customer.tags,
      referral_source: customer.referral_source,
      review_left: customer.review_left,
      review_left_at: customer.review_left_at,
      last_contacted_at: customer.last_contacted_at,
      follow_up_at: customer.follow_up_at,
    });
    // Reset only when a different customer is opened, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.email]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
    queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
  };

  const update = (patch: Partial<CrmFields>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const toggleTag = (tag: string) =>
    form && update({ tags: form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag] });
  const addTag = () => {
    const tag = newTag.trim().toLowerCase().replace(/^#/, '');
    if (tag && form && !form.tags.includes(tag)) update({ tags: [...form.tags, tag] });
    setNewTag('');
  };

  const save = async () => {
    if (!form || !customer) return;
    setSaving(true);
    try {
      await saveCustomerFields(customer.email, {
        ...form,
        notes: form.notes?.trim() || null,
        referral_source: form.referral_source?.trim() || null,
        review_left_at: form.review_left ? form.review_left_at || new Date().toISOString() : null,
        follow_up_at: form.follow_up_at || null,
      });
      refresh();
      toast({ title: 'Saved', description: customer.name || customer.email });
    } catch (err) {
      toast({ title: "Couldn't save", description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reviewRequestedToday = async () => {
    if (!customer) return;
    try {
      await markReviewRequested(customer.email);
      refresh();
      toast({ title: 'Marked as review requested' });
    } catch (err) {
      toast({ title: "Couldn't update", description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  const due = customer ? dueReasons(customer) : [];
  const customTags = form ? form.tags.filter((t) => !PRESET_TAGS.includes(t)) : [];

  return (
    <Sheet open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {customer && form && (
          <>
            <SheetHeader>
              <SheetTitle className="text-2xl font-black text-[#1C0357]">{customer.name || customer.email}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 underline"><Mail className="h-3.5 w-3.5" />{customer.email}</a>
                  <span>{customer.order_count} order{customer.order_count === 1 ? '' : 's'} · {aud(customer.total_spent)}</span>
                  <span>Customer since {nice(customer.first_order_at)}</span>
                </div>
              </SheetDescription>
            </SheetHeader>

            {due.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {due.map((r) => <Badge key={r} className="bg-[#F538BC] text-white">{DUE_LABELS[r]}</Badge>)}
              </div>
            )}

            <section className="mt-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Follow-up</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border p-3">
                  <p className="text-xs font-bold text-gray-500">Review requested</p>
                  <p className="font-bold text-[#1C0357]">{nice(customer.review_requested_at)}</p>
                  {!customer.review_requested_at && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={reviewRequestedToday}>Mark requested today</Button>
                  )}
                </div>
                <div className="rounded-xl border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500">Review left</p>
                    <p className="font-bold text-[#1C0357]">{form.review_left ? `Yes${form.review_left_at ? `, ${nice(form.review_left_at)}` : ''}` : 'No'}</p>
                  </div>
                  <Switch checked={form.review_left} onCheckedChange={(v) => update({ review_left: v, review_left_at: v ? form.review_left_at || new Date().toISOString() : null })} aria-label="Review left" />
                </div>
                <div>
                  <Label htmlFor="last-contacted">Last contacted</Label>
                  <div className="flex gap-2">
                    <Input id="last-contacted" type="date" value={dateOnly(form.last_contacted_at)}
                      onChange={(e) => update({ last_contacted_at: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null })} />
                    <Button type="button" variant="outline" onClick={() => update({ last_contacted_at: new Date().toISOString() })}>Today</Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="follow-up">Follow up next</Label>
                  <Input id="follow-up" type="date" min={today()} value={form.follow_up_at || ''} onChange={(e) => update({ follow_up_at: e.target.value || null })} />
                </div>
              </div>
            </section>

            <section className="mt-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Details</h3>
              <div>
                <Label>Tags</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[...PRESET_TAGS, ...customTags].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={cn(
                        'h-7 px-3 rounded-full text-xs font-bold border',
                        form.tags.includes(t) ? 'bg-[#F538BC] text-white border-[#F538BC]' : 'bg-white text-gray-600 border-gray-200',
                      )}
                    >
                      #{t}
                    </button>
                  ))}
                  <div className="flex gap-1">
                    <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="New tag" className="h-7 w-28 text-xs" />
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={addTag} aria-label="Add tag"><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="referral-source">Referral source</Label>
                <Input id="referral-source" placeholder="e.g. Lisa's studio, Instagram, Google" value={form.referral_source || ''} onChange={(e) => update({ referral_source: e.target.value })} />
                {customer.promo_codes.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">Codes used: {customer.promo_codes.join(', ')}</p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={4} value={form.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder="Voice type, teacher, what they're preparing for…" />
              </div>
              <Button onClick={save} disabled={saving} className="bg-[#1C0357] hover:bg-[#2D0B8C] font-black">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
              </Button>
            </section>

            <section className="mt-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Order history</h3>
              {isLoading && <p className="mt-2 text-sm text-gray-500"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading…</p>}
              <ul className="mt-2 divide-y rounded-xl border">
                {orders.map((o) => (
                  <li key={`${o.kind}-${o.id}`} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-[#1C0357] truncate">{o.title || 'Order'}{o.show ? <span className="font-medium text-gray-500"> · {o.show}</span> : null}</p>
                      <p className="text-xs text-gray-500">
                        {nice(o.ordered_at)} · {o.kind === 'custom' ? 'Custom' : 'Shop'} · {o.tier ? tierLabel(o.tier) : '—'} · {o.status}
                        {o.promo_code && <> · code <strong>{o.promo_code}</strong></>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black">{aud(o.amount)}</p>
                      {!o.is_paid && <p className="text-[11px] font-bold text-[#F538BC]">Unpaid</p>}
                    </div>
                  </li>
                ))}
                {!isLoading && !orders.length && <li className="p-3 text-sm text-gray-500">No orders found.</li>}
              </ul>
            </section>

            <Button variant="ghost" className="mt-6" onClick={onClose}><X className="mr-2 h-4 w-4" />Close</Button>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
              <Star className="h-3 w-3" /> Review requests are shared with Review requests and the automatic 3-day follow-up.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CustomerDetail;
