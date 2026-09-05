import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ReorderPoint } from '../types/database'

export const REORDER_KEY = ['reorder_points'] as const

export function useReorderPoints() {
  return useQuery({
    queryKey: REORDER_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('reorder_points').select('*')
      if (error) throw error
      return data as ReorderPoint[]
    },
  })
}

export function useSetReorderPoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ brand, model, quantity }: { brand: string; model: string; quantity: number }) => {
      if (quantity <= 0) {
        await supabase.from('reorder_points').delete().eq('brand', brand).eq('model', model)
        return
      }
      const { error } = await supabase
        .from('reorder_points')
        .upsert({ brand, model, quantity }, { onConflict: 'brand,model' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: REORDER_KEY }),
  })
}
