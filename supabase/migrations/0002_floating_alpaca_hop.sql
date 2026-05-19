-- 1. Ensure all users have a profile entry with their name from metadata
INSERT INTO public.profiles (id, first_name, last_name)
SELECT 
  id, 
  split_part(COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), ' ', 1),
  substring(COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '') from position(' ' in COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')) + 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Update backing requests where the name is missing or 'N/A'
UPDATE public.backing_requests br
SET name = TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))
FROM public.profiles p
WHERE br.user_id = p.id
AND (br.name IS NULL OR br.name = 'N/A' OR br.name = '');