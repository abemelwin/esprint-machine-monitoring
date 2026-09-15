-- ============================================================
-- 005_create_brands_models_tables.sql
-- Create standalone brands and models lookup tables strictly for Machine Monitoring
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

-- Clear any foreign catalog items
DELETE FROM public.brands;
DELETE FROM public.models;

-- Pre-populate brands and models ONLY from actual Machine Monitoring inventory_units
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
