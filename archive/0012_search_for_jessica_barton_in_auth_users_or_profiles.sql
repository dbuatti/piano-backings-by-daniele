SELECT u.id, u.email, p.first_name, p.last_name 
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email ILIKE '%jessica%';