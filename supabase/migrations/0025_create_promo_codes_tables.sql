CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10, 2) NOT NULL CHECK (discount_value > 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses integer NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  min_purchase_amount numeric(10, 2) CHECK (min_purchase_amount IS NULL OR min_purchase_amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  stripe_session_id text,
  discount_amount numeric(10, 2) NOT NULL,
  original_amount numeric(10, 2) NOT NULL,
  final_amount numeric(10, 2) NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read promo_codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');

CREATE POLICY "Admins can insert promo_codes"
  ON public.promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');

CREATE POLICY "Admins can update promo_codes"
  ON public.promo_codes FOR UPDATE
  TO authenticated
  USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');

CREATE POLICY "Admins can delete promo_codes"
  ON public.promo_codes FOR DELETE
  TO authenticated
  USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');

CREATE POLICY "Admins can read promo_code_redemptions"
  ON public.promo_code_redemptions FOR SELECT
  TO authenticated
  USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');

CREATE POLICY "Service role can insert promo_code_redemptions"
  ON public.promo_code_redemptions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can delete promo_code_redemptions"
  ON public.promo_code_redemptions FOR DELETE
  TO authenticated
  USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');

-- Function for service role to increment promo code usage count
CREATE OR REPLACE FUNCTION public.increment_promo_code_use(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_id;
END;
$$;

-- Public-facing function to validate a promo code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text, p_amount numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_promo public.promo_codes;
  v_now timestamptz := now();
  v_discount numeric;
  v_final numeric;
  v_result jsonb;
BEGIN
  SELECT * INTO v_promo FROM public.promo_codes WHERE upper(code) = upper(trim(p_code));

  IF v_promo.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid promo code.');
  END IF;

  IF NOT v_promo.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code is no longer active.');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code has reached its maximum number of uses.');
  END IF;

  IF v_promo.starts_at IS NOT NULL AND v_now < v_promo.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code is not yet available.');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_now > v_promo.expires_at THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This promo code has expired.');
  END IF;

  IF v_promo.min_purchase_amount IS NOT NULL AND p_amount < v_promo.min_purchase_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum purchase amount of $' || v_promo.min_purchase_amount::text || ' is required for this promo code.', 'minPurchaseAmount', v_promo.min_purchase_amount);
  END IF;

  IF v_promo.discount_type = 'percentage' THEN
    v_discount := round((p_amount * v_promo.discount_value / 100)::numeric, 2);
  ELSE
    v_discount := least(v_promo.discount_value, p_amount);
  END IF;

  v_final := greatest(0, p_amount - v_discount);

  RETURN jsonb_build_object(
    'valid', true,
    'promoCode', jsonb_build_object(
      'id', v_promo.id,
      'code', v_promo.code,
      'discount_type', v_promo.discount_type,
      'discount_value', v_promo.discount_value,
      'description', v_promo.description
    ),
    'originalAmount', p_amount,
    'discountAmount', v_discount,
    'finalAmount', v_final
  );
END;
$$;
