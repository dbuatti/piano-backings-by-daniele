CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  r_order RECORD;
  r_product RECORD;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Extract first and last name
  v_first_name := split_part(new.raw_user_meta_data->>'full_name', ' ', 1);
  v_last_name := split_part(new.raw_user_meta_data->>'full_name', ' ', 2);
  
  -- Insert profile
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (new.id, v_first_name, v_last_name)
  ON CONFLICT (id) DO NOTHING;

  -- Link existing backing requests matching this email
  UPDATE public.backing_requests
  SET user_id = new.id, guest_access_token = NULL
  WHERE email ILIKE new.email AND user_id IS NULL;

  -- Link existing orders matching this email and grant credits if applicable
  FOR r_order IN 
    SELECT id, product_id, amount, currency 
    FROM public.orders 
    WHERE customer_email ILIKE new.email AND user_id IS NULL AND status = 'completed'
  LOOP
    -- Update order to link to the new user
    UPDATE public.orders
    SET user_id = new.id
    WHERE id = r_order.id;

    -- Check if the product is a credit pack
    IF r_order.product_id IS NOT NULL THEN
      SELECT product_type, credit_amount, track_type INTO r_product
      FROM public.products
      WHERE id = r_order.product_id;

      IF FOUND AND r_product.product_type = 'credit_pack' THEN
        -- Grant credits to the user
        INSERT INTO public.user_credits (user_id, credit_type, balance, updated_at)
        VALUES (
          new.id,
          COALESCE(r_product.track_type, 'audition-ready'),
          COALESCE(r_product.credit_amount, 0),
          NOW()
        )
        ON CONFLICT (user_id, credit_type) 
        DO UPDATE SET 
          balance = public.user_credits.balance + EXCLUDED.balance,
          updated_at = NOW();
      END IF;
    END IF;
  END LOOP;

  RETURN new;
END;
$$;