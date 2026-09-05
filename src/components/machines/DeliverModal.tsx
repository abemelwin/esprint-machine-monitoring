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

export function DeliverModal({ machine, onClose, onConfirm, loading }: Props) {
  const [brand,    setBrand]    = useState(machine?.brand    ?? '')
  const [model,    setModel]    = useState(machine?.model    ?? '')
  const [client,   setClient]   = useState(machine?.client_name ?? '')
  const [code,     setCode]     = useState(machine?.client_code  ?? '')
  const [ae,       setAe]       = useState(machine?.ae ?? '')
  const [branch,   setBranch]   = useState(machine?.branch ?? '')
  const [location, setLocation] = useState(machine?.location ?? '')
  const [date,     setDate]     = useState(machine?.delivery_date ?? today())
  const [err,      setErr]      = useState('')

  const handleConfirm = () => {
    if (!client.trim()) { setErr('Please enter a client name.'); return }
    if (!date)          { setErr('Please enter a delivery date.'); return }
    setErr('')
    onConfirm({ brand, model, client_name: client, client_code: code, ae, branch, location, delivery_date: date })
  }

  return (
    <Modal
      open={!!machine}
      onClose={onClose}
      title="✅ Deliver Machine"
      footer={<ModalFooter onCancel={onClose} onConfirm={handleConfirm} confirmLabel="Mark Delivered" loading={loading} />}
    >
      <div className="flex flex-col gap-4 mt-2">
        <Banner>
          <b>{machine?.model}</b>{machine?.serial_no ? ` · ${machine.serial_no}` : ''} — record delivery. It moves to <b>Deliveries</b>.
        </Banner>
        <Grid2>
          <Field label="Brand">
            <LookupSelect kind="brands" value={brand} onChange={setBrand} />
          </Field>
          <Field label="Model">
            <LookupSelect kind="models" value={model} onChange={setModel} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Client Name" required>
            <Input value={client} onChange={e => setClient(e.target.value)} />
          </Field>
          <Field label="Code">
            <Input value={code} onChange={e => setCode(e.target.value)} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="AE">
            <LookupSelect kind="aes" value={ae} onChange={setAe} />
          </Field>
          <Field label="Branch">
            <LookupSelect kind="branches" value={branch} onChange={setBranch} />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Location">
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Client / site location" />
          </Field>
          <Field label="Delivery Date" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </Grid2>
        {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}
      </div>
    </Modal>
  )
}
