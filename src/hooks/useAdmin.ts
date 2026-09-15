import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, createIsolatedAuthClient } from '../lib/supabase'
import type { InvRole, RolePerms, UserProfile, UserProfileWithRole } from '../types/database'

export const ROLES_KEY = ['inv_roles'] as const
export const USERS_KEY = ['users']     as const

// ── Inventory Roles ───────────────────────────────────────────────
export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('inv_roles').select('*').order('label')
      if (error) throw error
      return data as InvRole[]
    },
  })
}

export function useSaveRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, key, label, perms }: { id?: string; key?: string; label: string; perms: RolePerms }) => {
      if (id) {
        const { error } = await supabase.from('inv_roles').update({ label, perms }).eq('id', id)
        if (error) throw error
      } else {
        const slugKey = key ?? label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
        const { error } = await supabase.from('inv_roles').insert({ key: slugKey, label, perms })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inv_roles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

// ── Users ─────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => {
      // Only show Machine Monitoring members. Sales Portal-only users
      // (is_sp_member without is_mm_member) are hidden from this panel.
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, inv_role:inv_roles!user_profiles_inv_role_key_fkey(*)')
        .eq('is_mm_member', true)
        .order('username')
      if (error) throw error
      return data as UserProfileWithRole[]
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      email: string
      display_name: string
      inv_role_key: string
      password: string
      ae_code: string | null
      approved_aes: string[]
    }) => {
      const cleanEmail = payload.email.toLowerCase().trim()
      const isolatedClient = createIsolatedAuthClient()

      // Sign up via isolated client so existing admin session isn't replaced
      const { data: authData, error: authErr } = await isolatedClient.auth.signUp({
        email: cleanEmail,
        password: payload.password,
        options: {
          data: {
            display_name: payload.display_name,
            inv_role_key: payload.inv_role_key,
          },
        },
      })
      if (authErr) throw authErr
      if (!authData.user) throw new Error('User creation failed: No user returned.')

      const uid = authData.user.id

      const cleanAe = payload.ae_code ? payload.ae_code.trim().toUpperCase() : null
      if (cleanAe) {
        await supabase.from('aes').insert({ code: cleanAe } as never).select().maybeSingle()
      }

      // Upsert into shared user_profiles — use user_id (SP's FK column).
      // Login is by email, so username = email for consistency.
      // is_mm_member = true so this person shows in the MM Users panel.
      const { error: profErr } = await supabase.from('user_profiles').upsert({
        user_id:      uid,
        username:     cleanEmail,
        email:        cleanEmail,
        display_name: payload.display_name,
        inv_role_key: payload.inv_role_key,
        ae_code:      cleanAe,
        approved_aes: payload.approved_aes,
        is_mm_member: true,
      } as Partial<UserProfile>)

      if (profErr) throw profErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY })
      qc.invalidateQueries({ queryKey: ['lookups'] })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string
      display_name: string
      inv_role_key: string
      ae_code: string | null
      approved_aes: string[]
      password?: string
    }) => {
      const cleanAe = payload.ae_code ? payload.ae_code.trim().toUpperCase() : null
      if (cleanAe) {
        await supabase.from('aes').insert({ code: cleanAe } as never).select().maybeSingle()
      }

      const { error } = await supabase.from('user_profiles').update({
        display_name: payload.display_name,
        inv_role_key: payload.inv_role_key,
        ae_code:      cleanAe,
        approved_aes: payload.approved_aes,
      }).eq('user_id', payload.user_id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY })
      qc.invalidateQueries({ queryKey: ['lookups'] })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (user_id: string) => {
      // Removing a user from Machine Monitoring must NOT destroy the shared
      // account (they may also be a Sales Portal member). We look up whether
      // they belong to SP: if yes, just drop their MM membership; if not,
      // it's an MM-only account and we can delete the profile row.
      const { data: prof, error: readErr } = await supabase
        .from('user_profiles')
        .select('is_sp_member')
        .eq('user_id', user_id)
        .single()
      if (readErr) throw readErr

      if (prof?.is_sp_member) {
        // Shared account — clear only the MM membership/fields, keep SP access.
        const { error } = await supabase
          .from('user_profiles')
          .update({
            is_mm_member: false,
            inv_role_key: null,
            ae_code:      null,
            approved_aes: [],
          })
          .eq('user_id', user_id)
        if (error) throw error
      } else {
        // MM-only account — safe to remove the profile row entirely.
        const { error } = await supabase.from('user_profiles').delete().eq('user_id', user_id)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}
