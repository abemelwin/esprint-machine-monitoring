import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Role, RolePerms, UserProfile, UserProfileWithRole } from '../types/database'

export const ROLES_KEY   = ['roles']   as const
export const USERS_KEY   = ['users']   as const

// ── Roles ─────────────────────────────────────────────────────────
export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*').order('label')
      if (error) throw error
      return data as Role[]
    },
  })
}

export function useSaveRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, key, label, perms }: { id?: string; key?: string; label: string; perms: RolePerms }) => {
      if (id) {
        const { error } = await supabase.from('roles').update({ label, perms }).eq('id', id)
        if (error) throw error
      } else {
        const slugKey = key ?? label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_')
        const { error } = await supabase.from('roles').insert({ key: slugKey, label, perms })
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
      const { error } = await supabase.from('roles').delete().eq('id', id)
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, role:roles(*)')
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
      role_key: string
      password: string
      ae_code: string | null
      approved_aes: string[]
    }) => {
      // Create auth user with actual email
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email:          payload.email.toLowerCase().trim(),
        password:       payload.password,
        email_confirm:  true,
      })
      if (authErr) throw authErr
      const uid = authData.user.id
      // Insert profile — username derived from email prefix for display
      const username = payload.email.split('@')[0].toLowerCase().trim()
      const { error: profErr } = await supabase.from('user_profiles').insert({
        id:           uid,
        username,
        display_name: payload.display_name,
        role_key:     payload.role_key,
        ae_code:      payload.ae_code,
        approved_aes: payload.approved_aes,
      } as UserProfile)
      if (profErr) throw profErr
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      display_name: string
      role_key: string
      ae_code: string | null
      approved_aes: string[]
      password?: string
    }) => {
      const { error } = await supabase.from('user_profiles').update({
        display_name: payload.display_name,
        role_key:     payload.role_key,
        ae_code:      payload.ae_code,
        approved_aes: payload.approved_aes,
      }).eq('id', payload.id)
      if (error) throw error
      if (payload.password) {
        const { error: pwErr } = await supabase.auth.admin.updateUserById(payload.id, {
          password: payload.password,
        })
        if (pwErr) throw pwErr
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('user_profiles').delete().eq('id', id)
      await supabase.auth.admin.deleteUser(id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}
