import { Modal } from '../ui/Modal'
import { useMachineHistory } from '../../hooks/useMachines'
import type { Machine } from '../../types/database'

interface Props {
  machine: Machine | null
  onClose: () => void
}

export function HistoryModal({ machine, onClose }: Props) {
  const { data: history, isLoading } = useMachineHistory(machine?.id ?? '')

  return (
    <Modal
      open={!!machine}
      onClose={onClose}
      title={`History — ${machine?.model ?? ''} ${machine?.serial_no ?? ''}`}
      footer={
        <button
          className="inline-flex items-center gap-1.5 font-[550] cursor-pointer bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] px-3.5 py-2 rounded-[9px] text-[13px]"
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      <div className="mt-2 border-t border-[var(--border)] pt-3 flex flex-col gap-1.5">
        {isLoading && <p className="text-[12px] text-[var(--text-muted)]">Loading…</p>}
        {!isLoading && !history?.length && (
          <p className="text-[12px] text-[var(--text-muted)]">No history yet.</p>
        )}
        {history?.map(h => (
          <div key={h.id} className="flex gap-2.5 text-[11.5px] py-1">
            <b className="text-[var(--text-secondary)] font-semibold whitespace-nowrap">{h.created_at.slice(0, 16).replace('T', ' ')}</b>
            <span className="text-[var(--text-muted)]">{h.event}</span>
            {h.actor && <span className="text-[var(--text-muted)] ml-auto">· {h.actor}</span>}
          </div>
        ))}
      </div>
    </Modal>
  )
}
