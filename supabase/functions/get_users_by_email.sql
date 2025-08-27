CREATE OR REPLACE FUNCTION public.get_users_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  raw_user_meta_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.raw_user_meta_data
  FROM
    auth.users AS u
  WHERE
    u.email ILIKE '%' || p_email || '%';
END;
$$;