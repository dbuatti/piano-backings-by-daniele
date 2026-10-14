export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  min_purchase_amount: number | null;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeRedemption {
  id: string;
  promo_code_id: string;
  user_id: string | null;
  email: string;
  order_id: string | null;
  stripe_session_id: string | null;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Derived status — the single source of truth for the badges and counts in the
// admin table, so the list and the stat strip can never drift apart.
// ---------------------------------------------------------------------------
export type PromoCodeStatus = {
  label: string;
  /** Tailwind classes for the badge. */
  color: string;
};

export const isPromoCodeExpired = (code: PromoCode, now: Date = new Date()) =>
  !!code.expires_at && new Date(code.expires_at) < now;

export const isPromoCodeUpcoming = (code: PromoCode, now: Date = new Date()) =>
  !!code.starts_at && new Date(code.starts_at) > now;

/** Live right now: active, already started and not yet expired. */
export const isPromoCodeRedeemable = (code: PromoCode, now: Date = new Date()) =>
  code.is_active && !isPromoCodeExpired(code, now) && !isPromoCodeUpcoming(code, now);

export function getPromoCodeStatus(code: PromoCode, now: Date = new Date()): PromoCodeStatus {
  if (!code.is_active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  if (isPromoCodeExpired(code, now)) return { label: 'Expired', color: 'bg-red-50 text-red-700 border-red-200' };
  if (isPromoCodeUpcoming(code, now)) return { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (code.max_uses !== null && code.current_uses >= code.max_uses) {
    return { label: 'Fully used', color: 'bg-orange-50 text-orange-700 border-orange-200' };
  }
  return { label: 'Active', color: 'bg-green-50 text-green-700 border-green-200' };
}
