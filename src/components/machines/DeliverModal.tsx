import { useState } from 'react'
import { Modal, ModalFooter } from '../ui/Modal'
import { Field, Grid2, Input, Banner } from '../ui/Field'
import { LookupSelect } from '../ui/LookupSelect'
import { today } from '../../lib/constants'
import type { Machine } from '../../types/database'

interface Props {
  machine: Machine | null
  onClose: () => void
  onConfirm: (data: {
    brand: string; model: string; client_name: string; client_code: string
    ae: string; branch: string; location: string; delivery_date: string
  }) => void
  loading?: boolean
}

// Inner form — always receives a non-null machine
function DeliverForm({ machine, onClose, onConfirm, loading }: Props & { machine: Machine }) {
  const [brand,    setBrand]    = useState(machine.brand    ?? '')
  const [model,    setModel]    = useState(machine.model    ?? '')
  const [client,   setClient]   = useState(machine.client_name ?? '')
  const [code,     setCode]     = useState(machine.client_code  ?? '')
  const [ae,       setAe]       = useState(machine.ae ?? '')
  const [branch,   setBranch]   = useState(machine.branch ?? '')
  const [location, setLocation] = useState(machine.location ?? '')
  const [date,     setDate]     = useState(today())
  const [err,      setErr]      = useState('')

  const handleConfirm = () => {
    if (!client.trim()) { setErr('Please enter a client name.'); return }
    if (!date)          { setErr('Please enter a delivery date.'); return }
    setErr('')
    onConfirm({ brand, model, client_name: client, client_code: code, ae, branch, location, delivery_date: date })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="✅ Deliver Machine"
      footer={<ModalFooter onCancel={onClose} onConfirm={handleConfirm} confirmLabel="Mark Delivered" loading={loading} />}
    >
      <div className="flex flex-col gap-4 mt-2">
        <Banner>
          <b>{machine.model}</b>{machine.serial_no ? ` · ${machine.serial_no}` : ''} — record delivery. It moves to <b>Deliveries</b>.
        </Banner>

        {/* Read-only summary — pre-filled, still editable if needed */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-[9px] px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px]">
          {[
            ['Brand',       brand    || '—'],
            ['Model',       model    || '—'],
            ['Client',      client   || '—'],
            ['Code',        code     || '—'],
            ['AE',          ae       || '—'],
            ['Branch',      branch   || '—'],
            ['Location',    location || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <span className="text-[var(--text-muted)] w-16 flex-none">{label}</span>
              <span className="text-[var(--text-primary)] font-[550]">{value}</span>
            </div>
          ))}
        </div>

        {/* Only editable fields shown prominently */}
        <Grid2>
          <Field label="Client Name" required>
            <Input value={client} onChange={e => setClient(e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Client / site location" />
          </Field>
        </Grid2>

        <Grid2>
          <Field label="Delivery Date" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} autoFocus />
          </Field>
          <div />
        </Grid2>

        {/* Expandable section for other edits */}
        <details className="text-[12.5px] text-[var(--text-muted)] cursor-pointer">
          <summary className="hover:text-[var(--text-primary)] select-none">Edit other details…</summary>
          <div className="flex flex-col gap-3 mt-3">
            <Grid2>
              <Field label="Brand">
                <LookupSelect kind="brands" value={brand} onChange={setBrand} />
              </Field>
              <Field label="Model">
                <LookupSelect kind="models" value={model} onChange={setModel} />
              </Field>
            </Grid2>
            <Grid2>
              <Field label="Code">
                <Input value={code} onChange={e => setCode(e.target.value)} />
              </Field>
              <Field label="AE">
                <LookupSelect kind="aes" value={ae} onChange={setAe} />
              </Field>
            </Grid2>
            <Field label="Branch">
              <LookupSelect kind="branches" value={branch} onChange={setBranch} />
            </Field>
          </div>
        </details>

        {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}
      </div>
    </Modal>
  )
}

export function DeliverModal({ machine, onClose, onConfirm, loading }: Props) {
  if (!machine) return null
  // key=machine.id ensures state resets when a different machine is opened
  return <DeliverForm key={machine.id} machine={machine} onClose={onClose} onConfirm={onConfirm} loading={loading} />
}
