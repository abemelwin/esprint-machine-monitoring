import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Machine, MachineHistory } from '../types/database'
import { useAuth } from './useAuth'
import { nowStamp } from '../lib/constants'

export const MACHINES_KEY = ['machines'] as const
export const HISTORY_KEY = (id: string) => ['machine_history', id] as const

// ── Fetch all machines ─────────────────────────────────────────────
export function useMachines() {
  return useQuery({
    queryKey: MACHINES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Machine[]
    },
  })
}

// ── Fetch history for a single machine ────────────────────────────
export function useMachineHistory(machineId: string) {
  return useQuery({
    queryKey: HISTORY_KEY(machineId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_history')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as MachineHistory[]
    },
    enabled: !!machineId,
  })
}

// ── Helper: log a history event ───────────────────────────────────
async function logHistory(machine_id: string, event: string, actor: string | null) {
  await supabase.from('machine_history').insert({ machine_id, event, actor })
}

// ── Add machine(s) ────────────────────────────────────────────────
export function useAddMachine() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      data: Omit<Machine, 'id' | 'created_at' | 'updated_at'>
      qty: number
    }) => {
      const rows = Array.from({ length: payload.qty }, () => ({
        ...payload.data,
        serial_no: payload.qty > 1 ? '' : payload.data.serial_no,
      }))
      const { data, error } = await supabase.from('machines').insert(rows).select()
      if (error) throw error
      // log history for each
      await Promise.all((data as Machine[]).map((m, i) =>
        logHistory(m.id, `Added as ${m.status}${payload.qty > 1 ? ` (batch ${i + 1} of ${payload.qty})` : ''}`, user?.username ?? null)
      ))
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MACHINES_KEY }),
  })
}

// ── Update machine ─────────────────────────────────────────────────
export function useUpdateMachine() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      updates: Partial<Omit<Machine, 'id' | 'created_at'>>
      event: string
    }) => {
      const { data, error } = await supabase
        .from('machines')
        .update({ ...payload.updates, updated_at: nowStamp() })
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw error
      await logHistory(payload.id, payload.event, user?.username ?? null)
      return data as Machine
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MACHINES_KEY }),
  })
}

// ── Delete machine ─────────────────────────────────────────────────
export function useDeleteMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('machines').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MACHINES_KEY }),
  })
}

// ── Lookup lists (branches, AEs, brands, models) ──────────────────
export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    queryFn: async () => {
      const [branches, aes, brands, models] = await Promise.all([
        supabase.from('branches').select('code').order('code'),
        supabase.from('aes').select('code').order('code'),
        supabase.from('brands').select('name').order('name'),
        supabase.from('models').select('name').order('name'),
      ])
      return {
        branches: (branches.data ?? []).map((r: { code: string }) => r.code),
        aes:      (aes.data ?? []).map((r: { code: string }) => r.code),
        brands:   (brands.data ?? []).map((r: { name: string }) => r.name),
        models:   (models.data ?? []).map((r: { name: string }) => r.name),
      }
    },
  })
}

// ── Add lookup value ───────────────────────────────────────────────
export function useAddLookup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ table, value }: { table: 'branches' | 'aes' | 'brands' | 'models'; value: string }) => {
      const col = table === 'brands' || table === 'models' ? 'name' : 'code'
      const { error } = await supabase.from(table).insert({ [col]: value } as never)
      if (error && !error.message.includes('duplicate')) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookups'] }),
  })
}
