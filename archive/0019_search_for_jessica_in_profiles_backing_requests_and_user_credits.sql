-- Search profiles
SELECT id, first_name, last_name, updated_at FROM public.profiles WHERE first_name ILIKE '%jessica%' OR last_name ILIKE '%jessica%';

-- Search backing requests
SELECT id, email, name, song_title, cost, is_paid, created_at FROM public.backing_requests WHERE name ILIKE '%jessica%' OR email ILIKE '%jessica%';

-- Search user credits
SELECT uc.id, uc.user_id, uc.credit_type, uc.balance, uc.updated_at, p.first_name, p.last_name 
FROM public.user_credits uc
LEFT JOIN public.profiles p ON uc.user_id = p.id
WHERE p.first_name ILIKE '%jessica%' OR p.last_name ILIKE '%jessica%';