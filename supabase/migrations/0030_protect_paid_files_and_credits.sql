-- 0030_protect_paid_files_and_credits.sql
-- 1. Paid shop files (track_urls, master_download_link) move off the publicly readable
--    `products` table into `product_files`, readable only by admins and by customers
--    who bought the product. The shop plays a short clip from `products.preview_url`.
-- 2. Credits are redeemed server-side only; customers can't edit balances or mark
--    requests paid from the browser.
--
-- Apply together with 0029, BEFORE deploying the matching edge functions and frontend.
-- After deploying, open Admin → Shop → Products and click "Generate previews" once so
-- existing products get their preview clips back.

-- ---------------------------------------------------------------------------
-- Paid files
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_files (
  product_id uuid PRIMARY KEY
    REFERENCES public.products(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  track_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  master_download_link text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preview_url text;
ALTER TABLE public.products ALTER COLUMN track_urls DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN master_download_link DROP NOT NULL;

INSERT INTO public.product_files (product_id, track_urls, master_download_link)
SELECT id, COALESCE(to_jsonb(track_urls), '[]'::jsonb), NULLIF(master_download_link, '')
FROM public.products
ON CONFLICT (product_id) DO NOTHING;

UPDATE public.products SET track_urls = NULL, master_download_link = NULL
WHERE track_urls IS NOT NULL OR master_download_link IS NOT NULL;

-- Admin forms keep writing track_urls / master_download_link on products; this trigger
-- moves them into product_files before the row is stored, so they never become public.
CREATE OR REPLACE FUNCTION public.products_move_files_to_private()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tracks jsonb;
  old_tracks jsonb;
BEGIN
  IF NEW.track_urls IS NULL AND NEW.master_download_link IS NULL THEN
    RETURN NEW;
  END IF;

  new_tracks := CASE WHEN NEW.track_urls IS NULL THEN NULL ELSE to_jsonb(NEW.track_urls) END;
  SELECT track_urls INTO old_tracks FROM public.product_files WHERE product_id = NEW.id;

  INSERT INTO public.product_files AS pf (product_id, track_urls, master_download_link, updated_at)
  VALUES (NEW.id, COALESCE(new_tracks, '[]'::jsonb), NULLIF(NEW.master_download_link, ''), now())
  ON CONFLICT (product_id) DO UPDATE SET
    track_urls = COALESCE(new_tracks, pf.track_urls),
    master_download_link = CASE
      WHEN NEW.master_download_link IS NULL THEN pf.master_download_link
      ELSE NULLIF(NEW.master_download_link, '')
    END,
    updated_at = now();

  -- Tracks changed: the old preview clip no longer matches, so drop it for regeneration.
  IF new_tracks IS NOT NULL AND new_tracks IS DISTINCT FROM old_tracks THEN
    NEW.preview_url := NULL;
  END IF;

  NEW.track_urls := NULL;
  NEW.master_download_link := NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS products_move_files_to_private ON public.products;
CREATE TRIGGER products_move_files_to_private
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_move_files_to_private();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_files' AND policyname = 'Admins manage product_files') THEN
    CREATE POLICY "Admins manage product_files"
      ON public.product_files FOR ALL
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_files' AND policyname = 'Buyers can read their purchased files') THEN
    CREATE POLICY "Buyers can read their purchased files"
      ON public.product_files FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.product_id = product_files.product_id
          AND o.status IN ('completed', 'paid')
          AND (o.user_id = auth.uid() OR lower(o.customer_email) = lower(auth.email()))
      ));
  END IF;
END $$;

-- Public bucket for short preview clips (the only audio the shop exposes).
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-previews', 'shop-previews', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins manage shop previews') THEN
    CREATE POLICY "Admins manage shop previews"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'shop-previews' AND (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com'))
      WITH CHECK (bucket_id = 'shop-previews' AND (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Orders: no public reads (the confirmation page now goes through an edge function)
-- ---------------------------------------------------------------------------

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
      AND cmd = 'SELECT' AND trim(coalesce(qual, '')) IN ('true', '(true)')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.orders', r.policyname);
  END LOOP;

  -- Orders are created by edge functions (service role). A customer-inserted
  -- 'completed' order would unlock product_files for free.
  DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Customers can view their own orders') THEN
    CREATE POLICY "Customers can view their own orders"
      ON public.orders FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR lower(customer_email) = lower(auth.email()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can view all orders') THEN
    CREATE POLICY "Admins can view all orders"
      ON public.orders FOR SELECT
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Credits and paid status: server-side only
-- ---------------------------------------------------------------------------

-- Remove any non-admin write access to credits and backing requests. Customers keep
-- read access: an owner "ALL" policy is replaced by a read-only copy of itself.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd, roles, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_credits', 'backing_requests')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND coalesce(qual, '') || coalesce(with_check, '') NOT ILIKE '%admin%'
      AND coalesce(qual, '') || coalesce(with_check, '') NOT ILIKE '%daniele.buatti@gmail.com%'
      AND coalesce(qual, '') || coalesce(with_check, '') NOT ILIKE '%pianobackingsbydaniele@gmail.com%'
  LOOP
    IF r.cmd = 'ALL' AND r.qual IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO %s USING (%s)',
        left(r.policyname || ' (read only)', 63), r.tablename, array_to_string(r.roles, ', '), r.qual);
    END IF;
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  -- Mixed admin-or-owner policy: the admin email in it skips the loop above, but it
  -- also lets owners edit their own rows (is_paid, final_price). Admins are covered below.
  DROP POLICY IF EXISTS "Admins and owners can update backing requests" ON public.backing_requests;

  -- Admin tools (request editor, data importer, credit management) write directly.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'backing_requests' AND policyname = 'Admins manage backing_requests') THEN
    CREATE POLICY "Admins manage backing_requests"
      ON public.backing_requests FOR ALL
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_credits' AND policyname = 'Admins manage user_credits') THEN
    CREATE POLICY "Admins manage user_credits"
      ON public.user_credits FOR ALL
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
END $$;

-- Atomically use one credit. Only callable with the service role (edge functions).
CREATE OR REPLACE FUNCTION public.redeem_credit(p_user_id uuid, p_credit_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM public.user_credits
  WHERE user_id = p_user_id
    AND credit_type = p_credit_type
    AND balance > 0
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY expires_at NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF target_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET balance = balance - 1, updated_at = now()
  WHERE id = target_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.redeem_credit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_credit(uuid, text) TO service_role;
