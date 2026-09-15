-- ============================================================
-- 005_create_brands_models_tables.sql
-- Create standalone brands and models lookup tables with RLS
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brands (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.models (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read, insert, and delete
DROP POLICY IF EXISTS "Authenticated users can read brands" ON public.brands;
CREATE POLICY "Authenticated users can read brands" ON public.brands
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert brands" ON public.brands;
CREATE POLICY "Authenticated users can insert brands" ON public.brands
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete brands" ON public.brands;
CREATE POLICY "Authenticated users can delete brands" ON public.brands
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read models" ON public.models;
CREATE POLICY "Authenticated users can read models" ON public.models
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert models" ON public.models;
CREATE POLICY "Authenticated users can insert models" ON public.models
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete models" ON public.models;
CREATE POLICY "Authenticated users can delete models" ON public.models
  FOR DELETE TO authenticated USING (true);

-- Pre-populate brands and models from existing inventory_units
INSERT INTO public.brands (name)
SELECT DISTINCT brand
FROM public.inventory_units
WHERE brand IS NOT NULL AND trim(brand) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.models (name)
SELECT DISTINCT model
FROM public.inventory_units
WHERE model IS NOT NULL AND trim(model) <> ''
ON CONFLICT (name) DO NOTHING;

-- Also copy from Sales Portal machines catalog if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machines') THEN
    INSERT INTO public.brands (name)
    SELECT DISTINCT brand FROM public.machines WHERE brand IS NOT NULL AND trim(brand) <> ''
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO public.models (name)
    SELECT DISTINCT model FROM public.machines WHERE model IS NOT NULL AND trim(model) <> ''
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;
