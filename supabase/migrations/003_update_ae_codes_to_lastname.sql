-- ============================================================
-- 003_update_ae_codes_to_lastname.sql
-- Update all AE codes to Last Names for Machine Monitoring users
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  parts TEXT[];
  last_n TEXT;
BEGIN
  -- Iterate over all users with a display name
  FOR rec IN
    SELECT user_id, display_name
    FROM public.user_profiles
    WHERE display_name IS NOT NULL AND trim(display_name) <> ''
  LOOP
    -- Split display name by spaces
    parts := string_to_array(trim(rec.display_name), ' ');
    
    -- Pick the last element as last name
    IF array_length(parts, 1) > 0 THEN
      last_n := upper(trim(parts[array_length(parts, 1)]));
      
      -- Clean any non-alphabet characters (keeping hyphens and accents if any)
      last_n := regexp_replace(last_n, '[^A-ZÑÁÉÍÓÚÜ-]', '', 'g');
      
      -- Correct known special names if needed
      IF last_n = 'ABELL' THEN
        last_n := 'ABELLO';
      END IF;

      IF last_n <> '' THEN
        -- 1. Update user_profiles.ae_code
        UPDATE public.user_profiles
        SET ae_code = last_n
        WHERE user_id = rec.user_id;

        -- 2. Insert into aes lookup table
        INSERT INTO public.aes (code)
        VALUES (last_n)
        ON CONFLICT (code) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Ensure all current ae_codes exist in aes lookup
INSERT INTO public.aes (code)
SELECT DISTINCT ae_code
FROM public.user_profiles
WHERE ae_code IS NOT NULL AND ae_code <> ''
ON CONFLICT (code) DO NOTHING;
