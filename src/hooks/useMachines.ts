import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Machine, MachineHistory } from '../types/database'
import { useAuth } from './useAuth'
import { nowStamp } from '../lib/constants'

export const MACHINES_KEY = ['machines'] as const
export const HISTORY_KEY = (id: string) => ['machine_history', id] as const

// ── Fetch all inventory units ──────────────────────────────────────
export function useMachines() {
  return useQuery({
    queryKey: MACHINES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_units')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Machine[]
    },
  })
}

// ── Fetch history for a single unit ───────────────────────────────
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
      history_note?: string
    }) => {
      const rows = Array.from({ length: payload.qty }, () => ({
        ...payload.data,
        serial_no:        payload.qty > 1 ? '' : (payload.data.serial_no || null),
        reservation_date: payload.data.reservation_date || null,
        delivery_date:    payload.data.delivery_date    || null,
        dispatch_date:    payload.data.dispatch_date    || null,
      }))
      const { data, error } = await supabase.from('inventory_units').insert(rows).select()
      if (error) throw error
      await Promise.all((data as Machine[]).map((m, i) => {
        const baseEvent = `Added as ${m.status}${payload.qty > 1 ? ` (batch ${i + 1} of ${payload.qty})` : ''}`
        const events = [logHistory(m.id, baseEvent, user?.username ?? null)]
        if (payload.history_note?.trim()) events.push(logHistory(m.id, payload.history_note.trim(), user?.username ?? null))
        return Promise.all(events)
      }))
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
      requireStatus?: string
      history_note?: string
    }) => {
      // Concurrency guard
      if (payload.requireStatus) {
        const { data: current } = await supabase
          .from('inventory_units')
          .select('status')
          .eq('id', payload.id)
          .single()
        if (!current) throw new Error('Machine not found.')
        if (current.status !== payload.requireStatus) {
          throw new Error(
            `This machine is no longer "${payload.requireStatus}" — it was just updated to "${current.status}" by another user. Please refresh and try again.`
          )
        }
      }

      const sanitized = { ...payload.updates }
      const dateFields = ['reservation_date', 'delivery_date', 'dispatch_date'] as const
      dateFields.forEach(f => {
        if ((sanitized as Record<string, unknown>)[f] === '') (sanitized as Record<string, unknown>)[f] = null
      })
      const { data, error } = await supabase
        .from('inventory_units')
        .update({ ...sanitized, updated_at: nowStamp() })
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw error
      await logHistory(payload.id, payload.event, user?.username ?? null)
      if (payload.history_note?.trim()) await logHistory(payload.id, payload.history_note.trim(), user?.username ?? null)
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
      const { error } = await supabase.from('inventory_units').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MACHINES_KEY }),
  })
}

// ── Lookup lists (branches, AEs) ───────────────────────────────────
// Note: brands & models are shared with the Sales Portal machines catalog.
// MM reads brand/model values from the catalog's machines table.
export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    queryFn: async () => {
      const [branches, aes, catalogMachines] = await Promise.all([
        supabase.from('branches').select('code').order('code'),
        supabase.from('aes').select('code').order('code'),
        supabase.from('machines').select('brand, model').eq('is_active', true).order('brand').order('model'),
      ])

      // Derive unique brands & models from the shared catalog
      const brandSet  = new Set<string>()
      const modelSet  = new Set<string>()
      ;(catalogMachines.data ?? []).forEach((r: { brand: string; model: string }) => {
        if (r.brand) brandSet.add(r.brand)
        if (r.model) modelSet.add(r.model)
      })

      return {
        branches: (branches.data ?? []).map((r: { code: string }) => r.code),
        aes:      (aes.data ?? []).map((r: { code: string }) => r.code),
        brands:   Array.from(brandSet).sort(),
        models:   Array.from(modelSet).sort(),
      }
    },
  })
}

// ── Add lookup value (branches / aes only) ────────────────────────
// brands & models are managed through the Sales Portal catalog now.
export function useAddLookup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ table, value }: { table: 'branches' | 'aes'; value: string }) => {
      const { error } = await supabase.from(table).insert({ code: value } as never)
      if (error && !error.message.includes('duplicate')) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookups'] }),
  })
}

// ── Delete lookup value (branches / aes only) ─────────────────────
export function useDeleteLookup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ table, value }: { table: 'branches' | 'aes'; value: string }) => {
      const { error } = await supabase.from(table).delete().eq('code', value)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookups'] }),
  })
}
