-- 1. Update backing_requests table with pricing overrides and multiple file support
ALTER TABLE backing_requests 
ADD COLUMN IF NOT EXISTS final_price NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_cost_low NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_cost_high NUMERIC,
ADD COLUMN IF NOT EXISTS sheet_music_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS voice_memo_urls JSONB DEFAULT '[]'::jsonb;

-- 2. Update products table with master download link support
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS master_download_link TEXT;

-- 3. Update app_settings table with service closure fields
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS is_service_closed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_closure_reason TEXT;

-- 4. Create RPC function for searching users by email (used in Admin Dashboard)
CREATE OR REPLACE FUNCTION get_users_by_email(p_email TEXT)
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
  SELECT u.id, u.email, u.raw_user_meta_data
  FROM auth.users u
  WHERE u.email ILIKE '%' || p_email || '%';
END;
$$;