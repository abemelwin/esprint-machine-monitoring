import { useState, useMemo } from 'react'
import { useMachines } from '../../hooks/useMachines'
import { useTBA } from '../../hooks/useTBA'
import { useReorderPoints, useSetReorderPoint } from '../../hooks/useReorderPoints'
import { useAuth } from '../../hooks/useAuth'
import { getPerms } from '../../lib/permissions'
import { Button } from '../ui/Button'

interface StockRow {
  key:      string
  brand:    string
  model:    string
  inStock:  number
  incoming: number
  reserved: number
  physical: number   // inStock + reserved (on hand)
  available:number   // physical + incoming - reserved
  tba:      number
  rp:       number
  rank:     number
  label:    string
  cls:      string
  color:    string
}

function buildRows(
  machines: ReturnType<typeof useMachines>['data'],
  tbaList:  ReturnType<typeof useTBA>['data'],
  reorderPts: ReturnType<typeof useReorderPoints>['data'],
  branchFilter: string,
): StockRow[] {
  const g: Record<string, StockRow> = {}
  ;(machines ?? []).forEach(m => {
    if (branchFilter && (m.branch ?? '') !== branchFilter) return
    const brand = (m.brand ?? '').trim() || '(no brand)'
    const model = (m.model ?? '').trim() || '(no model)'
    const key   = `${brand}||${model}`
    if (!g[key]) g[key] = { key, brand, model, inStock: 0, incoming: 0, reserved: 0, physical: 0, available: 0, tba: 0, rp: 0, rank: 3, label: '—', cls: 'none', color: 'var(--text-muted)' }
    const r = g[key]
    if (m.status === 'In Stock')   r.inStock++
    if (m.status === 'Incoming')   r.incoming++
    if (m.status === 'Reserved')   r.reserved++
  })

  const rpMap: Record<string, number> = {}
  ;(reorderPts ?? []).forEach(rp => { rpMap[`${rp.brand}||${rp.model}`] = rp.quantity })

  const tbaCount: Record<string, number> = {}
  ;(tbaList ?? []).forEach(t => {
    const k = `${(t.brand ?? '').trim() || '(no brand)'}||${(t.model ?? '').trim() || '(no model)'}`
    tbaCount[k] = (tbaCount[k] ?? 0) + 1
  })

  return Object.values(g).map(r => {
    r.physical  = r.inStock + r.reserved
    r.available = r.physical + r.incoming - r.reserved
    r.tba       = tbaCount[r.key] ?? 0
    r.rp        = rpMap[r.key] ?? 0

    if (r.rp > 0) {
      if (r.physical <= r.rp) {
        if (r.incoming > 0) { r.rank = 1; r.label = `Replenish · ${r.incoming} incoming`; r.cls = 'warn'; r.color = 'var(--reserved)' }
        else                { r.rank = 0; r.label = '⚠ Reorder now'; r.cls = 'crit'; r.color = 'var(--danger)' }
      } else {
        r.rank = 2; r.label = 'OK'; r.cls = 'ok'; r.color = 'var(--stock)'
      }
    }
    return r
  })
}

export function StockView() {
  const { user }  = useAuth()
  const pm        = getPerms(user)
  const { data: machines  = [] } = useMachines()
  const { data: tbaList   = [] } = useTBA()
  const { data: reorderPts= [] } = useReorderPoints()
  const setRP = useSetReorderPoint()

  const [q,       setQ]       = useState('')
  const [fBrand,  setFBrand]  = useState('')
  const [fBranch, setFBranch] = useState('')
  const [rpOnly,  setRpOnly]  = useState(false)

  const allBranches = [...new Set(machines.map(m => (m.branch ?? '').trim()).filter(Boolean))].sort()
  const allRows     = useMemo(() => buildRows(machines, tbaList, reorderPts, fBranch), [machines, tbaList, reorderPts, fBranch])
  const allBrands   = [...new Set(allRows.map(r => r.brand))].sort()

  const rows = useMemo(() => {
    let r = allRows.slice()
    if (q.trim()) r = r.filter(x => (x.brand + ' ' + x.model).toLowerCase().includes(q.toLowerCase()))
    if (fBrand)   r = r.filter(x => x.brand === fBrand)
    if (rpOnly)   r = r.filter(x => x.cls === 'crit' || x.cls === 'warn')
    return r.sort((a, b) => a.rank - b.rank || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))
  }, [allRows, q, fBrand, rpOnly])

  const need = allRows.filter(r => r.cls === 'crit' || r.cls === 'warn').length
  const crit = allRows.filter(r => r.cls === 'crit').length

  const exportCSV = () => {
    const head = ['Brand','Model','In Stock','Incoming','Reserved','Available Stock','TBA','Reorder Point','Status']
    const lines = [head.join(','), ...rows.map(r =>
      [r.brand, r.model, r.physical, r.incoming, r.reserved, r.available, r.tba, r.rp || '', r.label.replace(/[⚠·↗]/g,'').trim()]
        .map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    )]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `ES_StockLevels_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const filterSel = (label: string, value: string, onChange: (v: string) => void, opts: string[]) => (
    <select
      className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--accent)]"
      value={value} onChange={e => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  const thCls = 'sticky top-0 bg-[var(--surface-2)] text-left px-3 py-2.5 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wide whitespace-nowrap border-b border-[var(--border)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] align-middle text-[12.5px]'

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2.5 flex-wrap items-center mb-3">
        <input
          type="search"
          placeholder="🔍 Search brand or model…"
          className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] min-w-[220px] focus:outline-none focus:border-[var(--accent)]"
          value={q} onChange={e => setQ(e.target.value)}
        />
        {filterSel('All brands',   fBrand,  setFBrand,  allBrands)}
        {filterSel('All branches', fBranch, setFBranch, allBranches)}
        <label className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] bg-[var(--surface-1)] border border-[var(--border)] px-3 py-2 rounded-[9px] cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={rpOnly} onChange={e => setRpOnly(e.target.checked)} className="cursor-pointer" />
          Show only items to reorder
        </label>
        <Button onClick={exportCSV}>⬇ CSV</Button>
        <span className="flex-1" />
        <span className="text-[12.5px] text-[var(--text-muted)]">{rows.length} brand-models</span>
      </div>

      {/* Reorder note */}
      <div className="text-[12.5px] text-[var(--text-secondary)] mb-3 flex items-center gap-2 flex-wrap">
        {need > 0 ? (
          <>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-[650]" style={{ background: 'rgba(227,73,72,.14)', color: 'var(--danger)' }}>
              ⚠ {need} to replenish
            </span>
            {crit} need reorder now{need > crit ? `, ${need - crit} already have stock incoming` : ''}.
          </>
        ) : null}
        {' '}<b>In Stock</b> counts units physically on hand (including reserved). <b>Available Stock</b> = In Stock + Incoming − Reserved. Set a <b>Reorder Point</b> per brand-model to flag low stock.
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 640, overflowY: 'auto' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thCls} text-left`}>Brand</th>
                <th className={`${thCls} text-left`}>Model</th>
                <th className={`${thCls} text-center`}>In Stock</th>
                <th className={`${thCls} text-center`}>Incoming</th>
                <th className={`${thCls} text-center`}>Reserved</th>
                <th className={`${thCls} text-center`}>Available Stock</th>
                <th className={`${thCls} text-center`}>TBA</th>
                <th className={`${thCls} text-center`}>Reorder Point</th>
                <th className={`${thCls}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-14 text-[var(--text-muted)] text-[13px]">
                  <div className="text-4xl mb-2">📦</div>No brand-models to show.
                </td></tr>
              )}
              {rows.map(r => (
                <tr key={r.key} className={`rp-${r.cls}`}>
                  <td className={`${tdCls} font-semibold`}>{r.brand}</td>
                  <td className={`${tdCls} font-semibold`}>{r.model}</td>
                  <td className={`${tdCls} text-center`}>
                    <span className="text-[15px] font-[750] tabular-nums" style={{ color: r.cls === 'crit' ? 'var(--danger)' : r.cls === 'warn' ? 'var(--reserved)' : 'var(--text-primary)' }}>
                      {r.physical}
                    </span>
                  </td>
                  <td className={`${tdCls} text-center`}>{r.incoming || <span className="text-[var(--text-muted)]">0</span>}</td>
                  <td className={`${tdCls} text-center`}>{r.reserved || <span className="text-[var(--text-muted)]">0</span>}</td>
                  <td className={`${tdCls} text-center`}>
                    <span className="text-[15px] font-[750] tabular-nums" style={{ color: r.available < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {r.available}
                    </span>
                  </td>
                  <td className={`${tdCls} text-center`}>
                    {r.tba > 0 ? (
                      <span className="text-[12.5px] font-bold tabular-nums" style={{ color: 'var(--tba)' }}>{r.tba}</span>
                    ) : <span className="text-[var(--text-muted)]">0</span>}
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <input
                      type="number" min={0}
                      className="w-16 bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-2 py-1.5 rounded-[7px] text-[13px] text-center focus:outline-none focus:border-[var(--accent)]"
                      defaultValue={r.rp || ''}
                      placeholder="—"
                      disabled={!pm.edit}
                      onBlur={e => {
                        const n = parseInt(e.target.value, 10)
                        setRP.mutate({ brand: r.brand, model: r.model, quantity: isNaN(n) ? 0 : n })
                      }}
                    />
                  </td>
                  <td className={tdCls}>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-[650]"
                      style={{ background: `color-mix(in srgb, ${r.color} 15%, transparent)`, color: r.color }}>
                      {r.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
