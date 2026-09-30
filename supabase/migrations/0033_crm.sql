-- 0033_crm.sql
-- Lightweight CRM, built on the existing tables. Apply after 0032 (review_requests,
-- backing_requests.delivered_at). Safe to run more than once.
--
-- Customers are not copied anywhere: they are everyone with a custom request
-- (backing_requests) or shop order (orders), merged by lower-cased email. The only new
-- customer table holds what the order data doesn't: notes, tags, referral source and
-- follow-up fields.
--
--   crm_customers          new table   notes, tags, referral source, follow-up fields
--   crm_orders             new view    custom requests + shop orders in one list, with promo code
--   crm_customer_summary   new view    one row per customer (orders, spend, dates, songs, tiers…)
--   waitlist               new table   "Tell me when orders reopen" signups
--   join_waitlist()        new RPC     the only way the public site can add a signup
--   promo_codes            +4 columns  referral codes: referrer, reward every N orders
--   referral_code_stats    new view    uses, revenue, free tracks earned per referral code
--   crm_stats()            new RPC     headline numbers for the CRM and /admin/overview
--
-- Everything is admin-only (the same two admin emails as the existing policies); the
-- views use security_invoker, so they only ever show what the caller's existing
-- permissions on orders/backing_requests allow.

-- ---------------------------------------------------------------------------
-- CRM fields per customer
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_customers (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  notes text,
  tags text[] NOT NULL DEFAULT '{}',          -- e.g. teacher, student, school, repeat, vip
  referral_source text,                       -- how they found you (free text)
  review_left boolean NOT NULL DEFAULT false,
  review_left_at timestamptz,
  last_contacted_at timestamptz,
  follow_up_at date,                          -- "follow up next"
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.crm_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_customers_touch ON public.crm_customers;
CREATE TRIGGER crm_customers_touch BEFORE UPDATE ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Waitlist ("Tell me when orders reopen")
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
  name text,
  source text NOT NULL DEFAULT 'orders-closed',
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz                      -- set when you've told them orders reopened
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Public signups go through this function only: it validates the input and never
-- reveals whether an email is already on the list. No direct table access for visitors.
CREATE OR REPLACE FUNCTION public.join_waitlist(p_email text, p_name text DEFAULT NULL, p_source text DEFAULT 'orders-closed')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF length(clean_email) > 254 OR clean_email !~ '^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.waitlist (email, name, source)
  VALUES (clean_email, nullif(left(btrim(coalesce(p_name, '')), 120), ''), left(coalesce(p_source, 'orders-closed'), 40))
  ON CONFLICT (email) DO UPDATE SET notified_at = NULL; -- re-joining puts them back on the list
END;
$$;

REVOKE ALL ON FUNCTION public.join_waitlist(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Referral codes = promo codes with a referrer
-- ---------------------------------------------------------------------------

ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS referrer_name text;   -- e.g. "Lisa Smith"; set = referral code
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS referrer_email text;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS reward_every integer NOT NULL DEFAULT 5 CHECK (reward_every > 0);
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS rewards_given integer NOT NULL DEFAULT 0 CHECK (rewards_given >= 0);

-- ---------------------------------------------------------------------------
-- Policies: admins only (same emails as the existing admin policies)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_customers' AND policyname = 'Admins manage crm_customers') THEN
    CREATE POLICY "Admins manage crm_customers" ON public.crm_customers FOR ALL TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'Admins manage waitlist') THEN
    CREATE POLICY "Admins manage waitlist" ON public.waitlist FOR ALL TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Every order, custom and shop, in one list
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.crm_orders WITH (security_invoker = true) AS
SELECT
  'custom'::text AS kind,
  r.id,
  lower(btrim(r.email)) AS email,
  nullif(btrim(r.name), '') AS name,
  r.created_at AS ordered_at,
  -- Delivery date: recorded from 0032 on; older completed requests fall back to the order date.
  coalesce(r.delivered_at, CASE WHEN r.status = 'completed' THEN r.created_at END) AS delivered_at,
  r.song_title AS title,
  r.musical_or_artist AS show,
  r.track_type AS tier,
  r.status,
  coalesce(r.is_paid, false) AS is_paid,
  CASE WHEN r.is_paid THEN coalesce(r.final_price, r.cost, 0) ELSE 0 END AS amount,
  promo.code AS promo_code
FROM public.backing_requests r
LEFT JOIN LATERAL (
  SELECT pc.code FROM public.promo_code_redemptions pr
  JOIN public.promo_codes pc ON pc.id = pr.promo_code_id
  WHERE r.stripe_session_id IS NOT NULL AND pr.stripe_session_id = r.stripe_session_id
  LIMIT 1
) promo ON true
WHERE r.status IS DISTINCT FROM 'cancelled' AND coalesce(btrim(r.email), '') <> ''
UNION ALL
SELECT
  'shop'::text,
  o.id,
  lower(btrim(o.customer_email)),
  nullif(btrim(concat_ws(' ', pf.first_name, pf.last_name)), ''),
  o.created_at,
  CASE WHEN o.status IN ('paid', 'completed') THEN o.created_at END,  -- shop tracks download instantly
  p.title,
  p.artist_name,
  CASE WHEN p.product_type = 'credit_pack' THEN 'season-pack' ELSE 'shop' END,
  o.status,
  o.status IN ('paid', 'completed'),
  CASE WHEN o.status IN ('paid', 'completed') THEN coalesce(o.amount, 0) ELSE 0 END,
  promo.code
FROM public.orders o
LEFT JOIN public.products p ON p.id = o.product_id
LEFT JOIN public.profiles pf ON pf.id = o.user_id
LEFT JOIN LATERAL (
  SELECT pc.code FROM public.promo_code_redemptions pr
  JOIN public.promo_codes pc ON pc.id = pr.promo_code_id
  WHERE pr.order_id = o.id OR (o.checkout_session_id IS NOT NULL AND pr.stripe_session_id = o.checkout_session_id)
  LIMIT 1
) promo ON true
WHERE coalesce(btrim(o.customer_email), '') <> '';

-- ---------------------------------------------------------------------------
-- One row per customer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.crm_customer_summary WITH (security_invoker = true) AS
SELECT
  o.email,
  (array_agg(o.name ORDER BY o.ordered_at DESC) FILTER (WHERE o.name IS NOT NULL))[1] AS name,
  count(*)::int AS order_count,
  round(sum(o.amount), 2) AS total_spent,
  min(o.ordered_at) AS first_order_at,
  max(o.ordered_at) AS last_order_at,
  max(o.delivered_at) AS last_delivered_at,
  coalesce(array_agg(DISTINCT o.title) FILTER (WHERE o.title IS NOT NULL), '{}') AS songs,
  coalesce(array_agg(DISTINCT o.tier) FILTER (WHERE o.tier IS NOT NULL), '{}') AS tiers,
  coalesce(array_agg(DISTINCT o.promo_code) FILTER (WHERE o.promo_code IS NOT NULL), '{}') AS promo_codes,
  c.notes,
  coalesce(c.tags, '{}') AS tags,
  c.referral_source,
  coalesce(c.review_left, false) AS review_left,
  c.review_left_at,
  c.last_contacted_at,
  c.follow_up_at,
  rr.last_sent_at AS review_requested_at
FROM public.crm_orders o
LEFT JOIN public.crm_customers c ON c.email = o.email
LEFT JOIN public.review_requests rr ON rr.email = o.email
GROUP BY o.email, c.email, c.notes, c.tags, c.referral_source, c.review_left, c.review_left_at,
         c.last_contacted_at, c.follow_up_at, rr.last_sent_at;

-- ---------------------------------------------------------------------------
-- Referral code performance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.referral_code_stats WITH (security_invoker = true) AS
SELECT
  pc.id,
  pc.code,
  pc.referrer_name,
  pc.referrer_email,
  pc.discount_type,
  pc.discount_value,
  pc.is_active,
  pc.reward_every,
  pc.rewards_given,
  pc.created_at,
  count(r.id)::int AS uses,                                        -- one per paid checkout
  round(coalesce(sum(r.final_amount), 0), 2) AS revenue,           -- after the discount
  (count(r.id) / pc.reward_every)::int AS rewards_earned,          -- a free track every N orders
  greatest((count(r.id) / pc.reward_every)::int - pc.rewards_given, 0) AS rewards_owed,
  max(r.created_at) AS last_used_at
FROM public.promo_codes pc
LEFT JOIN public.promo_code_redemptions r ON r.promo_code_id = pc.id
WHERE pc.referrer_name IS NOT NULL
GROUP BY pc.id;

-- Views are reachable through the API: never to anonymous visitors.
REVOKE ALL ON public.crm_orders, public.crm_customer_summary, public.referral_code_stats FROM anon;

-- ---------------------------------------------------------------------------
-- Headline numbers (CRM page and the All Businesses overview)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND coalesce(auth.email(), '') NOT IN ('daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_customers', count(*),
    'repeat_customers', count(*) FILTER (WHERE order_count > 1),
    'repeat_rate', round(100.0 * count(*) FILTER (WHERE order_count > 1) / nullif(count(*), 0), 1),
    'reviews_requested', count(*) FILTER (WHERE review_requested_at IS NOT NULL),
    'reviews_left', count(*) FILTER (WHERE review_left),
    'due_for_follow_up', count(*) FILTER (WHERE
      (last_delivered_at <= now() - interval '3 days' AND review_requested_at IS NULL AND NOT review_left)
      OR last_order_at <= now() - interval '5 months'
      OR follow_up_at <= current_date),
    'waitlist_size', (SELECT count(*) FROM public.waitlist WHERE notified_at IS NULL)
  )
  INTO result
  FROM public.crm_customer_summary;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_stats() TO authenticated, service_role;
