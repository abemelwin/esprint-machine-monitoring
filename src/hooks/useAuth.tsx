import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import type { UserProfileWithRole } from '../types/database'

interface AuthState {
  user: UserProfileWithRole | null
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => 'Not ready',
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  const loadProfile = useCallback(async (uid: string) => {
    // SP user_profiles uses user_id (not id) as the auth FK.
    // We join inv_role via inv_role_key → inv_roles table.
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, inv_role:inv_roles!user_profiles_inv_role_key_fkey(*)')
      .eq('user_id', uid)
      .single()
    if (error || !data) { setUser(null); return }
    setUser(data as UserProfileWithRole)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => {
          qc.invalidateQueries()
          setLoading(false)
        })
      } else { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [loadProfile, qc])

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password })
    if (error) return error.message
    return null
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
