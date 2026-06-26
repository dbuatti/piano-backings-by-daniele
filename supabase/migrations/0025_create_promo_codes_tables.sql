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
