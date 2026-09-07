import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const err = await login(email, password)
    setLoading(false)
    if (err) {
      if (err.toLowerCase().includes('email not confirmed')) {
        setError('Email is not confirmed yet. Run the auto-confirm SQL in Supabase.')
      } else if (err.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password.')
      } else {
        setError(err)
      }
    }
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLogin() }

  return (
    <div className="fixed inset-0 bg-[var(--surface-0)] flex items-center justify-center p-5 z-[100]">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.25)] w-full max-w-[380px] px-7 py-8 text-center">
        {/* Logo */}
        <div className="w-14 h-14 rounded-[13px] bg-gradient-to-br from-[var(--accent)] to-[var(--stock)] flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-4 select-none">
          ES
        </div>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Machine Monitoring System</h2>
        <p className="text-[12.5px] text-[var(--text-muted)] mt-1 mb-5">ES Print Group of Companies — sign in to continue</p>

        <div className="text-left mb-3">
          <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Email</label>
          <input
            type="email"
            className="w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2.5 rounded-[9px] text-[13.5px] focus:outline-none focus:border-[var(--accent)]"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={onKey}
            autoComplete="email"
            placeholder="you@esprintmedia.com"
            autoFocus
          />
        </div>
        <div className="text-left mb-3">
          <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
          <input
            type="password"
            className="w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2.5 rounded-[9px] text-[13.5px] focus:outline-none focus:border-[var(--accent)]"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKey}
            autoComplete="current-password"
          />
        </div>

        <p className="text-[12.5px] text-[var(--danger)] min-h-[18px] mb-2">{error}</p>

        <button
          className="w-full bg-[var(--accent)] text-white border border-[var(--accent)] px-3.5 py-2.5 rounded-[9px] text-[13px] font-[550] cursor-pointer hover:brightness-110 disabled:opacity-50"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
