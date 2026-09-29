// CRM data layer. Customers are derived from custom requests + shop orders by the
// crm_customer_summary view (migration 0033); CRM-only fields live in crm_customers.
import { subMonths, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface CrmCustomer {
  email: string;
  name: string | null;
  order_count: number;
  total_spent: number;
  first_order_at: string;
  last_order_at: string;
  last_delivered_at: string | null;
  songs: string[];
  tiers: string[];
  promo_codes: string[];
  notes: string | null;
  tags: string[];
  referral_source: string | null;
  review_left: boolean;
  review_left_at: string | null;
  last_contacted_at: string | null;
  follow_up_at: string | null;
  review_requested_at: string | null;
}

export interface CrmOrder {
  kind: 'custom' | 'shop';
  id: string;
  email: string;
  name: string | null;
  ordered_at: string;
  delivered_at: string | null;
  title: string | null;
  show: string | null;
  tier: string | null;
  status: string;
  is_paid: boolean;
  amount: number;
  promo_code: string | null;
}

export type CrmFields = Pick<
  CrmCustomer,
  'notes' | 'tags' | 'referral_source' | 'review_left' | 'review_left_at' | 'last_contacted_at' | 'follow_up_at'
>;

export const PRESET_TAGS = ['teacher', 'student', 'school', 'repeat', 'vip'];

export const TIER_LABELS: Record<string, string> = {
  'note-bash': 'Note Bash',
  'audition-ready': 'Audition Ready',
  'full-song': 'Full Song',
  'full-production': 'Full Production',
  shop: 'Shop track',
  'season-pack': 'Season Pack',
};
export const tierLabel = (tier: string) => TIER_LABELS[tier] || tier;

export const aud = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

export type DueReason = 'review' | 'lapsed' | 'scheduled';

export const DUE_LABELS: Record<DueReason, string> = {
  review: 'Ask for a review',
  lapsed: 'No order in 5+ months',
  scheduled: 'Follow-up date reached',
};

/**
 * Why a customer needs attention, if at all. Same rules as crm_stats():
 * delivered 3+ days ago with no review request; last order 5+ months ago; or the
 * "follow up next" date has arrived.
 */
export const dueReasons = (c: CrmCustomer, now = new Date()): DueReason[] => {
  const reasons: DueReason[] = [];
  if (c.last_delivered_at && new Date(c.last_delivered_at) <= subDays(now, 3) && !c.review_requested_at && !c.review_left) {
    reasons.push('review');
  }
  if (new Date(c.last_order_at) <= subMonths(now, 5)) reasons.push('lapsed');
  if (c.follow_up_at && new Date(`${c.follow_up_at}T00:00:00`) <= startOfDay(now)) reasons.push('scheduled');
  return reasons;
};

const MIGRATION_HINT = 'Run supabase/migrations/0033_crm.sql to set up the CRM.';
const explain = (error: { message: string; code?: string }) =>
  new Error(error.code === '42P01' || /does not exist|schema cache/i.test(error.message) ? MIGRATION_HINT : error.message);

export const fetchCustomers = async (): Promise<CrmCustomer[]> => {
  const { data, error } = await supabase.from('crm_customer_summary').select('*').order('last_order_at', { ascending: false });
  if (error) throw explain(error);
  return (data || []).map((c) => ({ ...c, total_spent: Number(c.total_spent) })) as CrmCustomer[];
};

export const fetchCustomerOrders = async (email: string): Promise<CrmOrder[]> => {
  const { data, error } = await supabase.from('crm_orders').select('*').eq('email', email).order('ordered_at', { ascending: false });
  if (error) throw explain(error);
  return (data || []).map((o) => ({ ...o, amount: Number(o.amount) })) as CrmOrder[];
};

export const saveCustomerFields = async (email: string, fields: Partial<CrmFields>) => {
  const { error } = await supabase.from('crm_customers').upsert({ email, ...fields }, { onConflict: 'email' });
  if (error) throw explain(error);
};

/** Record that a review was asked for (shared with the review tool and the 3-day follow-up). */
export const markReviewRequested = async (email: string, at = new Date()) => {
  const { error } = await supabase.from('review_requests').upsert({ email, last_sent_at: at.toISOString(), source: 'manual' });
  if (error) throw explain(error);
};

export interface CrmStats {
  total_customers: number;
  repeat_customers: number;
  repeat_rate: number | null;
  reviews_requested: number;
  reviews_left: number;
  due_for_follow_up: number;
  waitlist_size: number;
}

export const fetchCrmStats = async (): Promise<CrmStats> => {
  const { data, error } = await supabase.rpc('crm_stats');
  if (error) throw explain(error);
  return data as CrmStats;
};
