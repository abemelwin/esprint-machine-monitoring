import { useState, useMemo } from 'react'
import { useMachines, useAddMachine, useUpdateMachine, useDeleteMachine } from '../../hooks/useMachines'
import { useAddTBA } from '../../hooks/useTBA'
import { useAuth } from '../../hooks/useAuth'
import { getPerms, canSeeClient, hideClientCols } from '../../lib/permissions'
import { STATUS_CONFIG, ALL_STATUSES } from '../../lib/constants'
import { StatusPill } from '../ui/Pill'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MachineForm } from './MachineForm'
import type { MachineFormData } from './MachineForm'
import { ReserveModal } from './ReserveModal'
import { DeliverModal } from './DeliverModal'
import { HistoryModal } from './HistoryModal'
import type { Machine, MachineStatus } from '../../types/database'

type SortDir = 1 | -1

const DASH = <span className="text-[var(--text-muted)]">—</span>

export function MachinesView() {
  const { user } = useAuth()
  const pm = getPerms(user)
  const hideCols = hideClientCols(user)

  const { data: machines = [], isLoading } = useMachines()

  const addMachine    = useAddMachine()
  const updateMachine = useUpdateMachine()
  const deleteMachine = useDeleteMachine()
  const addTBA        = useAddTBA()

  // ── filters ──────────────────────────────────────────────────
  const [q,         setQ]         = useState('')
  const [fStatus,   setFStatus]   = useState('')
  const [fBrand,    setFBrand]    = useState('')
  const [fModel,    setFModel]    = useState('')
  const [fBranch,   setFBranch]   = useState('')
  const [fAE,       setFAE]       = useState('')
  const [hideDel,   setHideDel]   = useState(false)
  const [sortKey,   setSortKey]   = useState<keyof Machine>('updated_at')
  const [sortDir,   setSortDir]   = useState<SortDir>(-1)

  // ── modals ────────────────────────────────────────────────────
  const [addOpen,      setAddOpen]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<Machine | null>(null)
  const [reserveTarget,setReserveTarget]= useState<Machine | null>(null)
  const [deliverTarget,setDeliverTarget]= useState<Machine | null>(null)
  const [histTarget,   setHistTarget]   = useState<Machine | null>(null)

  const setSort = (k: keyof Machine) => {
    if (sortKey === k) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortKey(k); setSortDir(1) }
  }

  const filtered = useMemo(() => {
    let rows = machines.slice()
    if (hideDel) rows = rows.filter(m => m.status !== 'Delivered')
    if (fStatus) rows = rows.filter(m => m.status === fStatus)
    if (fBrand)  rows = rows.filter(m => m.brand  === fBrand)
    if (fModel)  rows = rows.filter(m => m.model  === fModel)
    if (fBranch) rows = rows.filter(m => m.branch === fBranch)
    if (fAE)     rows = rows.filter(m => m.ae     === fAE)
    if (q.trim()) {
      const lq = q.toLowerCase()
      rows = rows.filter(m => {
        const base = ['serial_no','po_no','model','brand','client_code','branch','ae','notes']
          .some(k => String((m as Record<string,unknown>)[k] ?? '').toLowerCase().includes(lq))
        const cli = canSeeClient(user, m.ae) &&
          [m.client_name, m.location].some(v => String(v ?? '').toLowerCase().includes(lq))
        return base || cli
      })
    }
    return rows.sort((a, b) => {
      const x = String((a as Record<string,unknown>)[sortKey] ?? '')
      const y = String((b as Record<string,unknown>)[sortKey] ?? '')
      return x.localeCompare(y, undefined, { numeric: true }) * sortDir
    })
  }, [machines, hideDel, fStatus, fBrand, fModel, fBranch, fAE, q, sortKey, sortDir, user])

  // ── unique filter options ─────────────────────────────────────
  const uniq = (key: keyof Machine) =>
    [...new Set(machines.map(m => m[key]).filter(Boolean))].sort() as string[]

  // ── actions ───────────────────────────────────────────────────
  const markArrived = (m: Machine) => {
    updateMachine.mutate({ id: m.id, updates: { status: 'In Stock' }, event: 'Arrived → moved to In Stock' })
  }

  const doReserve = (m: Machine, data: { client_name: string; client_code: string; ae: string; reservation_date: string }) => {
    updateMachine.mutate({
      id: m.id,
      updates: { status: 'Reserved', ...data },
      event: `Reserved for ${data.client_name}`,
    }, { onSuccess: () => setReserveTarget(null) })
  }

  const doDeliver = (m: Machine, data: Parameters<typeof updateMachine.mutate>[0]['updates']) => {
    updateMachine.mutate({
      id: m.id,
      updates: { status: 'Delivered', ...data },
      event: `Delivered to ${(data as { client_name?: string }).client_name} on ${(data as { delivery_date?: string }).delivery_date}`,
    }, { onSuccess: () => setDeliverTarget(null) })
  }

  const moveToTBA = (m: Machine) => {
    if (!window.confirm(`Move reservation for ${m.client_name} to TBA list? The unit returns to In Stock.`)) return
    addTBA.mutate({
      brand: m.brand, model: m.model, client_name: m.client_name, client_code: m.client_code,
      ae: m.ae, reservation_date: m.reservation_date, location: m.location, notes: m.notes,
    })
    updateMachine.mutate({
      id: m.id,
      updates: { status: 'In Stock', client_name: null, client_code: null, ae: null, reservation_date: null },
      event: `Moved reservation (${m.client_name}) to TBA list — unit returned to available stock`,
    })
  }

  const cancelReserve = (m: Machine) => {
    if (!window.confirm(`Unreserve ${m.model} from ${m.client_name}?`)) return
    updateMachine.mutate({
      id: m.id,
      updates: { status: 'In Stock', client_name: null, client_code: null, ae: null, reservation_date: null },
      event: `Reservation cancelled (was ${m.client_name})`,
    })
  }

  const doDelete = (m: Machine) => {
    if (!window.confirm(`Delete ${m.model} ${m.serial_no ?? ''}? This removes it from the system.`)) return
    deleteMachine.mutate(m.id)
  }

  const doAdd = (data: MachineFormData, qty: number) => {
    addMachine.mutate({
      data: { ...data, status: data.status as MachineStatus },
      qty,
    }, { onSuccess: () => setAddOpen(false) })
  }

  const doEdit = (data: MachineFormData) => {
    if (!editTarget) return
    const oldStatus = editTarget.status
    const newStatus = data.status as MachineStatus
    updateMachine.mutate({
      id: editTarget.id,
      updates: { ...data, status: newStatus },
      event: oldStatus !== newStatus ? `Status changed: ${oldStatus} → ${newStatus} (edit)` : 'Details edited',
    }, { onSuccess: () => setEditTarget(null) })
  }

  // ── columns ────────────────────────────────────────────────────
  const baseCols: { key: keyof Machine; label: string }[] = [
    { key: 'status',           label: 'Status' },
    { key: 'po_no',            label: 'PO No.' },
    { key: 'brand',            label: 'Brand' },
    { key: 'model',            label: 'Model' },
    { key: 'branch',           label: 'Branch' },
    ...(!hideCols ? [
      { key: 'client_name' as keyof Machine,  label: 'Client Name' },
      { key: 'client_code' as keyof Machine,  label: 'Code' },
      { key: 'location'    as keyof Machine,  label: 'Location' },
    ] : []),
    { key: 'ae',               label: 'AE' },
    { key: 'reservation_date', label: 'Reservation Date' },
    { key: 'delivery_date',    label: 'Delivery Date' },
    { key: 'serial_no',        label: 'Serial' },
    { key: 'dispatch_date',    label: 'Shipment Receipt / Transfer Date' },
    { key: 'notes',            label: 'Notes' },
  ]
  const showActions = pm.edit || pm.reserve || pm.deliver || pm.unreserve

  const thCls = 'sticky top-0 bg-[var(--surface-2)] text-left px-3 py-2.5 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wide whitespace-nowrap cursor-pointer border-b border-[var(--border)] hover:text-[var(--text-primary)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] align-middle whitespace-nowrap text-[12.5px]'

  // ── filter selects ─────────────────────────────────────────────
  const filterSel = (label: string, value: string, onChange: (v: string) => void, opts: string[]) => (
    <select
      className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--accent)]"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2.5 flex-wrap items-center mb-3.5">
        <input
          type="search"
          placeholder="🔍 Search serial, model, client, code, branch…"
          className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] min-w-[260px] focus:outline-none focus:border-[var(--accent)]"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {filterSel('All statuses', fStatus, setFStatus, ALL_STATUSES)}
        {filterSel('All brands',   fBrand,  setFBrand,  uniq('brand'))}
        {filterSel('All models',   fModel,  setFModel,  uniq('model'))}
        {filterSel('All branches', fBranch, setFBranch, uniq('branch'))}
        {filterSel('All AEs',      fAE,     setFAE,     uniq('ae'))}
        <label className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] bg-[var(--surface-1)] border border-[var(--border)] px-3 py-2 rounded-[9px] cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={hideDel} onChange={e => setHideDel(e.target.checked)} className="cursor-pointer" />
          Hide delivered
        </label>
        <span className="flex-1" />
        <span className="text-[12.5px] text-[var(--text-muted)] whitespace-nowrap">
          {filtered.length} of {machines.length} shown
        </span>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 640, overflowY: 'auto' }}>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {baseCols.map(c => (
                  <th
                    key={c.key}
                    className={thCls}
                    onClick={() => setSort(c.key)}
                  >
                    {c.label}{sortKey === c.key ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                {showActions && (
                  <th className={`${thCls} sticky right-0 z-10 text-right shadow-[-7px_0_9px_-7px_rgba(0,0,0,.18)]`}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={baseCols.length + 1} className="text-center py-14 text-[var(--text-muted)] text-[13px]">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={baseCols.length + 1}>
                    <div className="text-center py-14 text-[var(--text-muted)]">
                      <div className="text-4xl mb-2">📭</div>
                      No machines to show.
                      {pm.edit && (
                        <div className="mt-3">
                          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>＋ Add a machine</Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map(m => {
                const rowCls = STATUS_CONFIG[m.status]?.rowClass ?? ''
                return (
                  <tr key={m.id} className={`${rowCls} hover:cursor-default`}>
                    {baseCols.map(c => {
                      const v = (m as Record<string, unknown>)[c.key]
                      if (c.key === 'status') return <td key={c.key} className={tdCls}><StatusPill status={m.status} /></td>
                      if (c.key === 'serial_no' || c.key === 'po_no') return <td key={c.key} className={`${tdCls} font-mono text-[11.5px] text-[var(--text-secondary)]`}>{v ? String(v) : DASH}</td>
                      if (c.key === 'model') return <td key={c.key} className={`${tdCls} font-semibold`}>{v ? String(v) : DASH}</td>
                      if (c.key === 'client_name') {
                        if (!canSeeClient(user, m.ae)) return <td key={c.key} className={tdCls}><span className="text-[var(--text-muted)]" title="Hidden — not your AE">•••</span></td>
                        return <td key={c.key} className={`${tdCls} font-semibold`}>{v ? String(v) : DASH}</td>
                      }
                      if (c.key === 'location') {
                        if (!canSeeClient(user, m.ae)) return <td key={c.key} className={tdCls}><span className="text-[var(--text-muted)]">•••</span></td>
                        return <td key={c.key} className={tdCls}>{v ? String(v) : DASH}</td>
                      }
                      if (c.key === 'notes') return (
                        <td key={c.key} className={`${tdCls} text-[var(--text-muted)] max-w-[240px] overflow-hidden text-ellipsis`} title={v ? String(v) : undefined}>
                          {v ? String(v) : ''}
                        </td>
                      )
                      return <td key={c.key} className={tdCls}>{v ? String(v) : DASH}</td>
                    })}
                    {showActions && (
                      <td className={`${tdCls} sticky right-0 bg-inherit shadow-[-7px_0_9px_-7px_rgba(0,0,0,.14)]`}>
                        <div className="flex gap-1.5 justify-end flex-nowrap">
                          {pm.edit    && m.status === 'Incoming'  && <Button size="sm" onClick={() => markArrived(m)} title="Mark arrived (→ In Stock)">📦</Button>}
                          {pm.reserve && ['In Stock','Demo','Recertified'].includes(m.status) && <Button size="sm" onClick={() => setReserveTarget(m)} title="Reserve">🔖</Button>}
                          {pm.deliver && (['In Stock','Demo','Recertified','Reserved'].includes(m.status)) && <Button size="sm" onClick={() => setDeliverTarget(m)} title="Deliver">✅</Button>}
                          {pm.reserve && m.status === 'Reserved' && <Button size="sm" onClick={() => moveToTBA(m)} title="Move to TBA list">📝</Button>}
                          {pm.unreserve && m.status === 'Reserved' && <Button size="sm" onClick={() => cancelReserve(m)} title="Unreserve">↩</Button>}
                          <Button size="sm" variant="ghost" onClick={() => setHistTarget(m)} title="History">🕒</Button>
                          {pm.edit && <Button size="sm" variant="ghost" onClick={() => setEditTarget(m)} title="Edit">✎</Button>}
                          {pm.edit && <Button size="sm" variant="danger" onClick={() => doDelete(m)} title="Delete">🗑</Button>}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Machine" maxWidth="max-w-2xl">
        <div className="mt-2">
          <MachineForm onSubmit={doAdd} onCancel={() => setAddOpen(false)} loading={addMachine.isPending} />
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Machine" maxWidth="max-w-2xl">
        <div className="mt-2">
          {editTarget && (
            <MachineForm
              machine={editTarget}
              onSubmit={doEdit}
              onCancel={() => setEditTarget(null)}
              loading={updateMachine.isPending}
            />
          )}
        </div>
      </Modal>

      {/* Reserve modal */}
      <ReserveModal
        machine={reserveTarget}
        onClose={() => setReserveTarget(null)}
        onConfirm={data => reserveTarget && doReserve(reserveTarget, data)}
        loading={updateMachine.isPending}
      />

      {/* Deliver modal */}
      <DeliverModal
        machine={deliverTarget}
        onClose={() => setDeliverTarget(null)}
        onConfirm={data => deliverTarget && doDeliver(deliverTarget, data)}
        loading={updateMachine.isPending}
      />

      {/* History modal */}
      <HistoryModal machine={histTarget} onClose={() => setHistTarget(null)} />
    </div>
  )
}
