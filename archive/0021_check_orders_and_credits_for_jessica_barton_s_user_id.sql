-- Check orders for Jessica's user ID
SELECT id, customer_email, amount, status, created_at, product_id, checkout_session_id FROM public.orders WHERE user_id = 'ee43a21d-65aa-4f3a-b96a-c85b8f6ee91a';

-- Check credits for Jessica's user ID
SELECT id, credit_type, balance, updated_at FROM public.user_credits WHERE user_id = 'ee43a21d-65aa-4f3a-b96a-c85b8f6ee91a';