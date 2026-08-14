-- Check if there is an auth user for Jessica's email
SELECT id, email, created_at FROM auth.users WHERE email = 'jessica.anne.barton@gmail.com';

-- Check if there are any orders for Jessica's email
SELECT id, customer_email, amount, status, created_at, product_id FROM public.orders WHERE customer_email = 'jessica.anne.barton@gmail.com';

-- Check if there are any credits for Jessica's email (by joining with auth.users)
SELECT uc.id, uc.credit_type, uc.balance, uc.updated_at 
FROM public.user_credits uc
JOIN auth.users u ON uc.user_id = u.id
WHERE u.email = 'jessica.anne.barton@gmail.com';