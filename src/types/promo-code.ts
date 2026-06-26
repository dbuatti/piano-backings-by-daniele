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
