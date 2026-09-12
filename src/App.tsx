import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useMachines } from './hooks/useMachines'
import { getPerms, hideClientCols, canSeeClient } from './lib/permissions'
import { exportMachinesCSV, exportJSON, parseLegacyBackup, type LegacyBackup } from './lib/importExport'
import { LoginPage } from './pages/LoginPage'
import { MachinesView } from './components/machines/MachinesView'
import { StockView }    from './components/stock/StockView'
import { TBAView }      from './components/tba/TBAView'
import { AdminPanel }   from './components/admin/AdminPanel'
import { supabase }     from './lib/supabase'

// Version is auto-injected at build time from git commit hash
declare const __APP_VERSION__: string
const APP_VERSION = __APP_VERSION__

type MainView = 'machines' | 'stock' | 'tba'

export default function App() {
  const { user, loading, logout } = useAuth()
  const pm      = getPerms(user)
  const hideCols = hideClientCols(user)

  const { data: machines = [] } = useMachines()

  const [view,       setView]       = useState<MainView>('machines')
  const [adminOpen,  setAdminOpen]  = useState(false)
  const [addOpen,    setAddOpen]    = useState(false)
  const [theme,      setTheme]      = useState<'light' | 'dark'>('light')
  const [, setSavedAt]              = useState('')
  const [newVersion, setNewVersion] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Detect new deploy — check version every 5 minutes
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now())
        if (!res.ok) return
        const data = await res.json()
        if (data.version && data.version !== APP_VERSION) setNewVersion(true)
      } catch { /* offline or not found — ignore */ }
    }
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // persist theme
  useEffect(() => {
    const saved = localStorage.getItem('es_theme') as 'light' | 'dark' | null
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved) }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('es_theme', next)
  }

  // ── CSV export ──────────────────────────────────────────────────
  const handleExportCSV = () => {
    exportMachinesCSV(
      machines,
      hideCols,
      (ae) => canSeeClient(user, ae)
    )
  }

  // ── JSON backup (download full Supabase snapshot) ───────────────
  const handleBackup = async () => {
    if (!pm.manageUsers) return
    const [{ data: mach }, { data: tba }, { data: rp }] = await Promise.all([
      supabase.from('machines').select('*'),
      supabase.from('tba_list').select('*'),
      supabase.from('reorder_points').select('*'),
    ])
    exportJSON({ machines: mach, tba_list: tba, reorder_points: rp, exported_at: new Date().toISOString() })
  }

  // ── Import legacy backup ────────────────────────────────────────
  const handleImport = () => {
    if (!pm.manageUsers) return
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      let obj: LegacyBackup
      try { obj = JSON.parse(text) } catch { alert('Could not parse JSON file.'); return }
      if (!obj.machines) { alert('Not a valid backup file.'); return }
      const { machines: rows, tba, reorder } = parseLegacyBackup(obj)
      if (!window.confirm(`Import ${rows.length} machines from backup? Existing data will NOT be deleted — this adds new rows.`)) return
      const { error } = await supabase.from('machines').insert(rows)
      if (error) { alert('Import error: ' + error.message); return }
      if (tba.length) await supabase.from('tba_list').insert(tba as never)
      for (const rpt of reorder) await supabase.from('reorder_points').upsert(rpt, { onConflict: 'brand,model' })
      setSavedAt('Imported ✓')
      alert(`Imported ${rows.length} machines successfully.`)
    }
    input.click()
  }

  // Show loading spinner
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-0)]">
        <div className="text-[var(--text-muted)] text-[14px]">Loading…</div>
      </div>
    )
  }

  // Not logged in
  if (!user) return <LoginPage />

  const tabs: { key: MainView; label: string }[] = [
    { key: 'machines', label: '🖨 Machines' },
    { key: 'stock',    label: '📊 Stock Levels' },
    { key: 'tba',      label: '📝 TBA List' },
  ]

  return (
    <div className="w-full max-w-full p-3 md:p-3.5 md:px-4">
      {/* Update banner */}
      {newVersion && (
        <div className="flex items-center justify-between gap-3 bg-[var(--accent)] text-white px-4 py-2.5 rounded-[9px] mb-3 text-[13px]">
          <span>🎉 A new version of the app is available.</span>
          <button className="bg-white text-[var(--accent)] font-[650] px-3 py-1 rounded-[7px] text-[12px] cursor-pointer hover:brightness-95" onClick={() => window.location.reload()}>
            Refresh now
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-[10px] overflow-hidden flex-none">
            <img src="/Logo.jpg" alt="ES Print Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-[19px] font-bold tracking-tight text-[var(--text-primary)] leading-tight truncate">Machine Monitoring System</h1>
            <p className="text-[11px] md:text-[12.5px] text-[var(--text-muted)] hidden sm:block">ES Print Group of Companies · inventory · incoming · reservations · deliveries</p>
          </div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[12.5px] text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-full whitespace-nowrap">
            <b>{user.display_name || user.username}</b> · {user.role?.label ?? user.role_key}
          </span>
          {pm.manageUsers && <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]" onClick={() => setAdminOpen(true)}>🛡️ Access</button>}
          {pm.manageUsers && <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]" onClick={handleImport}>⬆ Import</button>}
          {pm.manageUsers && <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]" onClick={handleBackup}>💾 Backup</button>}
          <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]" onClick={handleExportCSV}>⬇ CSV</button>
          <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]" onClick={toggleTheme}>{theme === 'dark' ? '☀' : '🌙'}</button>
          {pm.edit && <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--accent)] text-white border border-[var(--accent)] hover:brightness-110 px-3.5 py-2 rounded-[9px] text-[13px]" onClick={() => { setView('machines'); setAddOpen(true) }}>＋ Add Machine</button>}
          <button className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]" onClick={logout}>⎋ Logout</button>
        </div>

        {/* Mobile buttons */}
        <div className="flex md:hidden items-center gap-1.5 flex-none">
          <button className="inline-flex items-center font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] px-2.5 py-2 rounded-[9px] text-[13px]" onClick={toggleTheme}>{theme === 'dark' ? '☀' : '🌙'}</button>
          {pm.edit && <button className="inline-flex items-center font-[550] cursor-pointer bg-[var(--accent)] text-white border border-[var(--accent)] px-2.5 py-2 rounded-[9px] text-[12px]" onClick={() => { setView('machines'); setAddOpen(true) }}>＋ Add</button>}
          <button className="inline-flex items-center font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] px-2.5 py-2 rounded-[9px] text-[13px]" onClick={() => setMobileMenuOpen(o => !o)}>☰</button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-[12px] p-3 flex flex-col gap-1 shadow-[var(--shadow)]">
          <div className="text-[12px] text-[var(--text-secondary)] px-2 pb-2 border-b border-[var(--border)] mb-1">
            <b>{user.display_name || user.username}</b> · {user.role?.label ?? user.role_key}
          </div>
          {pm.manageUsers && <button className="text-left px-3 py-2 rounded-[9px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-2)]" onClick={() => { setAdminOpen(true); setMobileMenuOpen(false) }}>🛡️ Access Control</button>}
          {pm.manageUsers && <button className="text-left px-3 py-2 rounded-[9px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-2)]" onClick={() => { handleImport(); setMobileMenuOpen(false) }}>⬆ Import</button>}
          {pm.manageUsers && <button className="text-left px-3 py-2 rounded-[9px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-2)]" onClick={() => { handleBackup(); setMobileMenuOpen(false) }}>💾 Backup</button>}
          <button className="text-left px-3 py-2 rounded-[9px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-2)]" onClick={() => { handleExportCSV(); setMobileMenuOpen(false) }}>⬇ Export CSV</button>
          <button className="text-left px-3 py-2 rounded-[9px] text-[13px] text-[var(--danger)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] mt-1 pt-3" onClick={logout}>⎋ Logout</button>
        </div>
      )}

      {/* View nav */}
      <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-[11px] w-full sm:w-fit mt-3 mb-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-3 sm:px-5 py-2 rounded-[8px] border-none text-[12px] sm:text-[13.5px] font-[650] cursor-pointer transition-all whitespace-nowrap flex-1 sm:flex-none ${view === t.key ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[var(--shadow)]' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Views */}
      <div className="mt-3">
        <div style={{ display: view === 'machines' ? 'block' : 'none' }}>
          <MachinesView addOpen={addOpen} setAddOpen={setAddOpen} />
        </div>
        {view === 'stock' && <StockView />}
        {view === 'tba'   && <TBAView />}
      </div>

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}

      <footer className="text-center text-[var(--text-muted)] text-[11.5px] mt-6 mb-2.5 leading-relaxed">
        ES Machine Monitoring System · ES Print Group of Companies
      </footer>
    </div>
  )
}
