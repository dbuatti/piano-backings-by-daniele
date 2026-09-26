-- 0029_cart_and_sheet_music_addon.sql
-- Supports multi-item shop checkout (one order row per product, sharing a Stripe
-- checkout session) and the $50 engraved sheet music add-on.
--
-- Apply BEFORE deploying the updated create-stripe-checkout / stripe-webhook
-- functions and the frontend that uses the cart.

-- 1. A cart checkout creates several orders with the same checkout_session_id, so
--    drop any single-column unique constraint / unique index on that column.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.orders'::regclass
      AND con.contype = 'u'
      AND array_length(con.conkey, 1) = 1
      AND a.attname = 'checkout_session_id'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT i.relname
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = x.indkey[0]
    WHERE x.indrelid = 'public.orders'::regclass
      AND x.indisunique AND NOT x.indisprimary
      AND x.indnatts = 1
      AND a.attname = 'checkout_session_id'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX public.%I', r.relname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS orders_checkout_session_id_idx ON public.orders (checkout_session_id);

-- 2. Sheet music add-on on shop orders.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS includes_sheet_music boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sheet_music_url text,
  ADD COLUMN IF NOT EXISTS sheet_music_delivered_at timestamptz;

-- 3. The finished (engraved) sheet music for a product. Kept out of the public
--    `products` table so the paid PDF link isn't readable by anyone browsing the shop.
CREATE TABLE IF NOT EXISTS public.product_sheet_music (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sheet_music ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_sheet_music' AND policyname = 'Admins manage product_sheet_music') THEN
    CREATE POLICY "Admins manage product_sheet_music"
      ON public.product_sheet_music FOR ALL
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;

  -- Admins deliver sheet music by updating the order row.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can update orders') THEN
    CREATE POLICY "Admins can update orders"
      ON public.orders FOR UPDATE
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
END $$;
