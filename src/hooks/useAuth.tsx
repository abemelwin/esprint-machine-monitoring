import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
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

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, role:roles(*)')
      .eq('id', uid)
      .single()
    if (error || !data) { setUser(null); return }
    setUser(data as UserProfileWithRole)
  }, [])

  useEffect(() => {
    // Check existing session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    // Listen for auth changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) loadProfile(session.user.id)
      else setUser(null)
    })
    return () => subscription.unsubscribe()
  }, [loadProfile])

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
