import { useState, useMemo } from 'react'
import { useTBA, useAddTBA, useUpdateTBA, useDeleteTBA } from '../../hooks/useTBA'
import { useMachines, useUpdateMachine } from '../../hooks/useMachines'
import { useAuth } from '../../hooks/useAuth'
import { getPerms, canSeeClient, hideClientCols } from '../../lib/permissions'
import { today } from '../../lib/constants'
import { Button } from '../ui/Button'
import { Modal, ModalFooter } from '../ui/Modal'
import { Field, Grid2, Input, Textarea, Banner } from '../ui/Field'
import { LookupSelect } from '../ui/LookupSelect'
import type { TBAItem } from '../../types/database'

type TBAForm = {
  brand: string; model: string; client_name: string; client_code: string
  location: string; ae: string; reservation_date: string; notes: string
}

const emptyForm: TBAForm = { brand: '', model: '', client_name: '', client_code: '', location: '', ae: '', reservation_date: today(), notes: '' }

function fromItem(t: TBAItem): TBAForm {
  return { brand: t.brand ?? '', model: t.model, client_name: t.client_name ?? '', client_code: t.client_code ?? '', location: t.location ?? '', ae: t.ae ?? '', reservation_date: t.reservation_date ?? today(), notes: t.notes ?? '' }
}

export function TBAView() {
  const { user } = useAuth()
  const pm       = getPerms(user)
  const hideCols = hideClientCols(user)

  const { data: tbaList  = [] } = useTBA()
  const { data: machines = [] } = useMachines()
  const addTBA    = useAddTBA()
  const updateTBA = useUpdateTBA()
  const deleteTBA = useDeleteTBA()
  const updateMachine = useUpdateMachine()

  const [q,      setQ]      = useState('')
  const [fBrand, setFBrand] = useState('')
  const [fModel, setFModel] = useState('')
  const [fAE,    setFAE]    = useState('')

  const [editTarget, setEditTarget] = useState<TBAItem | null>(null)
  const [addOpen,    setAddOpen]    = useState(false)

  const [form, setForm]   = useState<TBAForm>(emptyForm)
  const [fErr, setFErr]   = useState('')

  const openAdd = () => { setForm(emptyForm); setFErr(''); setAddOpen(true) }
  const openEdit = (t: TBAItem) => { setForm(fromItem(t)); setFErr(''); setEditTarget(t) }
  const set = (k: keyof TBAForm) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const filtered = useMemo(() => {
    let rows = tbaList.slice()
    if (q.trim()) {
      const lq = q.toLowerCase()
      rows = rows.filter(t => [t.brand, t.model, t.client_name, t.client_code, t.ae, t.location].some(v => String(v ?? '').toLowerCase().includes(lq)))
    }
    if (fBrand) rows = rows.filter(t => t.brand === fBrand)
    if (fModel) rows = rows.filter(t => t.model === fModel)
    if (fAE)    rows = rows.filter(t => t.ae    === fAE)
    return rows.sort((a, b) => (a.brand ?? '').localeCompare(b.brand ?? '') || a.model.localeCompare(b.model))
  }, [tbaList, q, fBrand, fModel, fAE])

  const uniq = (k: keyof TBAItem) => [...new Set(tbaList.map(t => t[k]).filter(Boolean))].sort() as string[]

  const handleSave = () => {
    if (!form.model.trim())       { setFErr('Please enter a Model.'); return }
    if (!form.client_name.trim()) { setFErr('Please enter a Client Name.'); return }
    setFErr('')
    if (editTarget) {
      updateTBA.mutate({ id: editTarget.id, updates: form }, { onSuccess: () => setEditTarget(null) })
    } else {
      addTBA.mutate(form, { onSuccess: () => setAddOpen(false) })
    }
  }

  const handleDelete = (t: TBAItem) => {
    if (!window.confirm(`Delete TBA reservation for ${t.client_name} (${t.brand} ${t.model})?`)) return
    deleteTBA.mutate(t.id)
  }

  const handleFulfil = (t: TBAItem) => {
    const unit = machines.find(m => m.status === 'In Stock' && (m.brand ?? '').trim() === (t.brand ?? '').trim() && m.model.trim() === t.model.trim())
    if (!unit) { alert(`No available In Stock unit of ${t.brand} ${t.model} to allot. Add stock first.`); return }
    if (!window.confirm(`Allot in-stock unit ${unit.serial_no ?? '(no serial)'} to ${t.client_name} and reserve it?`)) return
    updateMachine.mutate({
      id: unit.id,
      updates: { status: 'Reserved', client_name: t.client_name, client_code: t.client_code, ae: t.ae, reservation_date: t.reservation_date ?? today(), location: t.location ?? null },
      event: `Reserved for ${t.client_name} — fulfilled from TBA list`,
    })
    deleteTBA.mutate(t.id)
    alert(`Reserved ${unit.serial_no ?? 'a unit'} for ${t.client_name}.`)
  }

  const filterSel = (label: string, value: string, onChange: (v: string) => void, opts: string[]) => (
    <select className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--accent)]" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  const thCls = 'sticky top-0 bg-[var(--surface-2)] text-left px-3 py-2.5 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wide whitespace-nowrap border-b border-[var(--border)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] align-middle text-[12.5px]'
  const DASH  = <span className="text-[var(--text-muted)]">—</span>

  const cols = [
    { key: 'brand', label: 'Brand' }, { key: 'model', label: 'Model' },
    ...(!hideCols ? [{ key: 'client_name', label: 'Client Name' }] : []),
    { key: 'client_code', label: 'Code' },
    ...(!hideCols ? [{ key: 'location', label: 'Location' }] : []),
    { key: 'ae', label: 'AE' }, { key: 'reservation_date', label: 'Reservation Date' }, { key: 'notes', label: 'Notes' },
  ]

  const tbaForm = (
    <div className="flex flex-col gap-4 mt-2">
      <Banner>A TBA reservation records a client's demand without holding a unit. Fulfil it later when stock is available.</Banner>
      <Grid2>
        <Field label="Brand"><LookupSelect kind="brands" value={form.brand} onChange={set('brand')} /></Field>
        <Field label="Model" required><LookupSelect kind="models" value={form.model} onChange={set('model')} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Client Name" required><Input value={form.client_name} onChange={e => set('client_name')(e.target.value)} /></Field>
        <Field label="Code"><Input value={form.client_code} onChange={e => set('client_code')(e.target.value)} /></Field>
      </Grid2>
      <Grid2>
        <Field label="AE"><LookupSelect kind="aes" value={form.ae} onChange={set('ae')} /></Field>
        <Field label="Reservation Date"><Input type="date" value={form.reservation_date} onChange={e => set('reservation_date')(e.target.value)} /></Field>
      </Grid2>
      <Field label="Location"><Input value={form.location} onChange={e => set('location')(e.target.value)} placeholder="Client / site location" /></Field>
      <Field label="Notes"><Textarea value={form.notes} onChange={e => set('notes')(e.target.value)} /></Field>
      {fErr && <p className="text-[12.5px] text-[var(--danger)]">{fErr}</p>}
    </div>
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2.5 flex-wrap items-center mb-3.5">
        <input type="search" placeholder="🔍 Search brand, model, client…"
          className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] min-w-[220px] focus:outline-none focus:border-[var(--accent)]"
          value={q} onChange={e => setQ(e.target.value)} />
        {filterSel('All brands',  fBrand, setFBrand, uniq('brand'))}
        {filterSel('All models',  fModel, setFModel, uniq('model'))}
        {filterSel('All AEs',     fAE,    setFAE,    uniq('ae'))}
        <span className="flex-1" />
        {pm.reserve && <Button variant="primary" onClick={openAdd}>＋ Add TBA</Button>}
        <span className="text-[12.5px] text-[var(--text-muted)]">{filtered.length} of {tbaList.length} reservations</span>
      </div>

      <div className="text-[12.5px] text-[var(--text-secondary)] mb-3">
        TBA reservations are client demands <b>not allotted to any unit</b> — inventory stays available. Use <b>📦 Fulfil</b> when stock is on hand to reserve an available unit for the client.
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 640, overflowY: 'auto' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {cols.map(c => <th key={c.key} className={thCls}>{c.label}</th>)}
                {pm.reserve && <th className={`${thCls} sticky right-0 z-10 text-right shadow-[-7px_0_9px_-7px_rgba(0,0,0,.18)]`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={cols.length + 1} className="text-center py-14 text-[var(--text-muted)] text-[13px]">
                  <div className="text-4xl mb-2">📝</div>No TBA reservations.
                  {pm.reserve && <div className="mt-3"><Button variant="primary" size="sm" onClick={openAdd}>＋ Add a TBA reservation</Button></div>}
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="st-tba">
                  {cols.map(c => {
                    const v = (t as Record<string, unknown>)[c.key]
                    const masked = (c.key === 'client_name' || c.key === 'location') && !canSeeClient(user, t.ae)
                    if (masked) return <td key={c.key} className={tdCls}><span className="text-[var(--text-muted)]">•••</span></td>
                    if (c.key === 'brand' || c.key === 'model' || c.key === 'client_name') return <td key={c.key} className={`${tdCls} font-semibold`}>{v ? String(v) : DASH}</td>
                    if (c.key === 'notes') return <td key={c.key} className={`${tdCls} text-[var(--text-muted)] max-w-[200px] overflow-hidden text-ellipsis`} title={v ? String(v) : undefined}>{v ? String(v) : ''}</td>
                    return <td key={c.key} className={tdCls}>{v ? String(v) : DASH}</td>
                  })}
                  {pm.reserve && (
                    <td className={`${tdCls} sticky right-0 bg-inherit shadow-[-7px_0_9px_-7px_rgba(0,0,0,.14)]`}>
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" onClick={() => handleFulfil(t)} title="Fulfil — allot an available unit">📦 Fulfil</Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit">✎</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(t)} title="Delete">🗑</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add TBA Reservation"
        footer={<ModalFooter onCancel={() => setAddOpen(false)} onConfirm={handleSave} confirmLabel="Save" loading={addTBA.isPending} />}>
        {tbaForm}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit TBA Reservation"
        footer={<ModalFooter onCancel={() => setEditTarget(null)} onConfirm={handleSave} confirmLabel="Save" loading={updateTBA.isPending} />}>
        {tbaForm}
      </Modal>
    </div>
  )
}
