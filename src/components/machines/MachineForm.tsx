import { useState } from 'react'
import { Field, Grid2, Input, Select, Textarea, Banner } from '../ui/Field'
import { LookupSelect } from '../ui/LookupSelect'
import { ALL_STATUSES } from '../../lib/constants'
import type { Machine } from '../../types/database'

export interface MachineFormData {
  serial_no: string
  po_no: string
  brand: string
  model: string
  branch: string
  status: string
  client_name: string
  client_code: string
  location: string
  ae: string
  reservation_date: string
  delivery_date: string
  dispatch_date: string
  notes: string
}

const empty: MachineFormData = {
  serial_no: '', po_no: '', brand: '', model: '', branch: '',
  status: 'In Stock', client_name: '', client_code: '', location: '',
  ae: '', reservation_date: '', delivery_date: '', dispatch_date: '', notes: '',
}

function fromMachine(m: Machine): MachineFormData {
  return {
    serial_no:        m.serial_no        ?? '',
    po_no:            m.po_no            ?? '',
    brand:            m.brand            ?? '',
    model:            m.model            ?? '',
    branch:           m.branch           ?? '',
    status:           m.status,
    client_name:      m.client_name      ?? '',
    client_code:      m.client_code      ?? '',
    location:         m.location         ?? '',
    ae:               m.ae               ?? '',
    reservation_date: m.reservation_date ?? '',
    delivery_date:    m.delivery_date    ?? '',
    dispatch_date:    m.dispatch_date    ?? '',
    notes:            m.notes            ?? '',
  }
}

interface Props {
  machine?: Machine       // undefined = add mode
  onSubmit: (data: MachineFormData, qty: number) => void
  onCancel: () => void
  loading?: boolean
}

export function MachineForm({ machine, onSubmit, onCancel, loading }: Props) {
  const isAdd = !machine
  const [form, setForm] = useState<MachineFormData>(machine ? fromMachine(machine) : { ...empty })
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')

  const set = (k: keyof MachineFormData) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const onChange = (k: keyof MachineFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k)(e.target.value)

  const handleSubmit = () => {
    if (!form.status)           { setErr('Status is required.'); return }
    if (!form.po_no.trim())     { setErr('PO No. is required.'); return }
    if (!form.brand)            { setErr('Brand is required.'); return }
    if (!form.model.trim())     { setErr('Model is required.'); return }
    if (!form.serial_no.trim()) { setErr('Serial No. is required.'); return }
    if (!form.branch)           { setErr('Branch is required.'); return }
    setErr('')
    onSubmit(form, isAdd ? Math.max(1, Math.min(qty, 500)) : 1)
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdd && (
        <Banner>
          Add one unit or a batch. Pick a <b>Status</b> and set <b>Quantity</b> to add several at once.
        </Banner>
      )}

      <Grid2>
        <Field label="Status" required>
          <Select value={form.status} onChange={onChange('status')}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="PO No." required>
          <Input value={form.po_no} onChange={onChange('po_no')} placeholder="Purchase order no." />
        </Field>
      </Grid2>

      {isAdd && (
        <Grid2>
          <Field label="Quantity" required hint="Add several identical units at once — each becomes its own row.">
            <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
          </Field>
          <div />
        </Grid2>
      )}

      <Grid2>
        <Field label="Brand" required>
          <LookupSelect kind="brands" value={form.brand} onChange={set('brand')} />
        </Field>
        <Field label="Model" required>
          <LookupSelect kind="models" value={form.model} onChange={set('model')} />
        </Field>
      </Grid2>

      <Grid2>
        <Field label="Serial No." required>
          <Input value={form.serial_no} onChange={onChange('serial_no')} placeholder="e.g. GR20241280" />
        </Field>
        <Field label="Branch" required>
          <LookupSelect kind="branches" value={form.branch} onChange={set('branch')} />
        </Field>
      </Grid2>

      <Grid2>
        <Field label="Client Name">
          <Input value={form.client_name} onChange={onChange('client_name')} />
        </Field>
        <Field label="Code">
          <Input value={form.client_code} onChange={onChange('client_code')} />
        </Field>
      </Grid2>

      <Grid2>
        <Field label="Location">
          <Input value={form.location} onChange={onChange('location')} placeholder="Client / site location" />
        </Field>
        <Field label="AE">
          <LookupSelect kind="aes" value={form.ae} onChange={set('ae')} />
        </Field>
      </Grid2>

      <Grid2>
        <Field label="Reservation Date">
          <Input type="date" value={form.reservation_date} onChange={onChange('reservation_date')} />
        </Field>
        <Field label="Delivery Date">
          <Input type="date" value={form.delivery_date} onChange={onChange('delivery_date')} />
        </Field>
      </Grid2>

      <Grid2>
        <Field label="Shipment Receipt / Transfer Date">
          <Input type="date" value={form.dispatch_date} onChange={onChange('dispatch_date')} />
        </Field>
        <div />
      </Grid2>

      <Field label="Notes">
        <Textarea value={form.notes} onChange={onChange('notes')} placeholder="Anything worth remembering about this unit" />
      </Field>

      {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}

      <div className="flex gap-2.5 justify-end pt-1">
        <button
          className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--accent)] text-white border border-[var(--accent)] hover:brightness-110 px-3.5 py-2 rounded-[9px] text-[13px] disabled:opacity-50"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving…' : isAdd ? 'Add Machine' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
