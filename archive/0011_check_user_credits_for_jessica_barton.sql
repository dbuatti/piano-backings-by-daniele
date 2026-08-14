SELECT uc.*, p.first_name, p.last_name 
FROM public.user_credits uc
LEFT JOIN public.profiles p ON uc.user_id = p.id;