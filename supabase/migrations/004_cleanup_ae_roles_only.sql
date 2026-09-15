-- ============================================================
-- 004_cleanup_ae_roles_only.sql
-- Clean up AE Codes: ONLY users with the Account Executive role get an AE Code.
-- All other roles (Admin, Sales Admin, Sales Assistant, Team Leader, ASM) will have ae_code = NULL.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  parts TEXT[];
  last_n TEXT;
BEGIN
  -- 1. I-clear ang ae_code ng lahat ng users na HINDI Account Executive
  UPDATE public.user_profiles
  SET ae_code = NULL
  WHERE (inv_role_key IS DISTINCT FROM 'account_exec')
    AND (role IS DISTINCT FROM 'account_executive');

  -- 2. Para sa mga Account Executives lamang, i-set ang ae_code sa kanilang Last Name (UPPERCASE)
  FOR rec IN
    SELECT user_id, display_name
    FROM public.user_profiles
    WHERE (inv_role_key = 'account_exec' OR role = 'account_executive')
      AND display_name IS NOT NULL
      AND trim(display_name) <> ''
  LOOP
    parts := string_to_array(trim(rec.display_name), ' ');
    IF array_length(parts, 1) > 0 THEN
      last_n := upper(trim(parts[array_length(parts, 1)]));
      last_n := regexp_replace(last_n, '[^A-ZÑÁÉÍÓÚÜ-]', '', 'g');
      
      IF last_n <> '' THEN
        UPDATE public.user_profiles
        SET ae_code = last_n
        WHERE user_id = rec.user_id;
      END IF;
    END IF;
  END LOOP;

  -- 3. I-reset ang `aes` table para ang matitirang codes ay galing lang sa totoong Account Executives
  DELETE FROM public.aes;

  INSERT INTO public.aes (code)
  SELECT DISTINCT ae_code
  FROM public.user_profiles
  WHERE (inv_role_key = 'account_exec' OR role = 'account_executive')
    AND ae_code IS NOT NULL
    AND ae_code <> ''
  ORDER BY ae_code;

END $$;
