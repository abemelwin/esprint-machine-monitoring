import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

// Using untyped client to avoid Database generic conflicts with supabase-js v2 insert/update inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(url, key) as any
