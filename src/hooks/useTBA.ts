import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TBAItem } from '../types/database'

export const TBA_KEY = ['tba_list'] as const

export function useTBA() {
  return useQuery({
    queryKey: TBA_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tba_list')
        .select('*')
        .order('brand', { ascending: true })
      if (error) throw error
      return data as TBAItem[]
    },
  })
}

export function useAddTBA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Omit<TBAItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('tba_list').insert(item).select().single()
      if (error) throw error
      return data as TBAItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TBA_KEY }),
  })
}

export function useUpdateTBA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TBAItem> }) => {
      const { data, error } = await supabase.from('tba_list').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as TBAItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TBA_KEY }),
  })
}

export function useDeleteTBA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tba_list').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TBA_KEY }),
  })
}
