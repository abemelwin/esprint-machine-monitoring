import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [email,    setEmail]   = useState(() => localStorage.getItem('es_last_email') || '')
  const [password, setPassword] = useState('')
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)
  const emailRef    = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (email) {
      passwordRef.current?.focus()
    } else {
      emailRef.current?.focus()
    }
  }, [])

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const cleanEmail = email.trim()
    localStorage.setItem('es_last_email', cleanEmail)
    const err = await login(cleanEmail, password)
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
    <div className="fixed inset-0 bg-[var(--surface-0)] flex items-center justify-center p-5 z-[100] animate-in fade-in duration-200">
      <div className="bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] w-full max-w-[400px] px-8 py-9 text-center animate-in zoom-in-95 duration-200">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 border border-[var(--border)] shadow-md">
          <img src="/Logo.jpg" alt="ES Print Logo" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">Machine Monitoring System</h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-6">ES Print Group of Companies — sign in to continue</p>

        <div className="text-left mb-4">
          <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Email</label>
          <input
            ref={emailRef}
            type="email"
            className="w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] transition-all focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 placeholder:text-[var(--text-muted)]"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              localStorage.setItem('es_last_email', e.target.value)
            }}
            onKeyDown={onKey}
            autoComplete="email"
            placeholder="you@esprintmedia.com"
          />
        </div>
        <div className="text-left mb-4">
          <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
          <input
            ref={passwordRef}
            type="password"
            className="w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] transition-all focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 placeholder:text-[var(--text-muted)]"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKey}
            autoComplete="current-password"
          />
        </div>

        <p className="text-[12.5px] text-[var(--danger)] min-h-[20px] mb-3 text-left font-medium">{error}</p>

        <button
          className="w-full bg-[var(--accent)] text-white border border-[var(--accent)] px-4 py-2.5 rounded-[10px] text-[13.5px] font-[600] cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-sm"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
