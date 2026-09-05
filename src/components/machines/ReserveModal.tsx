import { useState } from 'react'
import { Modal, ModalFooter } from '../ui/Modal'
import { Field, Grid2, Input, Banner } from '../ui/Field'
import { LookupSelect } from '../ui/LookupSelect'
import { today } from '../../lib/constants'
import type { Machine } from '../../types/database'

interface Props {
  machine: Machine | null
  onClose: () => void
  onConfirm: (data: { client_name: string; client_code: string; ae: string; reservation_date: string }) => void
  loading?: boolean
}

export function ReserveModal({ machine, onClose, onConfirm, loading }: Props) {
  const [client, setClient] = useState(machine?.client_name ?? '')
  const [code, setCode]     = useState(machine?.client_code ?? '')
  const [ae, setAe]         = useState(machine?.ae ?? '')
  const [date, setDate]     = useState(machine?.reservation_date ?? today())
  const [err, setErr]       = useState('')

  const handleConfirm = () => {
    if (!client.trim()) { setErr('Please enter a client name.'); return }
    setErr('')
    onConfirm({ client_name: client, client_code: code, ae, reservation_date: date || today() })
  }

  return (
    <Modal
      open={!!machine}
      onClose={onClose}
      title="🔖 Reserve Machine"
      footer={<ModalFooter onCancel={onClose} onConfirm={handleConfirm} confirmLabel="Reserve Machine" loading={loading} />}
    >
      <div className="flex flex-col gap-4 mt-2">
        <Banner>
          <b>{machine?.model}</b>{machine?.serial_no ? ` · ${machine.serial_no}` : ''} — assign to a client. It moves to <b>Reservations</b>.
        </Banner>
        <Grid2>
          <Field label="Client Name" required>
            <Input value={client} onChange={e => setClient(e.target.value)} placeholder="Client / company name" />
          </Field>
          <Field label="Code">
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Short code" />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="AE">
            <LookupSelect kind="aes" value={ae} onChange={setAe} />
          </Field>
          <Field label="Reservation Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </Grid2>
        {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}
      </div>
    </Modal>
  )
}
