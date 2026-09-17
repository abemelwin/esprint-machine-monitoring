import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useMachineHistory } from '../../hooks/useMachines'
import { useAuth } from '../../hooks/useAuth'
import { useUsers } from '../../hooks/useAdmin'
import { canSeeClient } from '../../lib/permissions'
import type { Machine } from '../../types/database'

interface Props {
  machine: Machine | null
  onClose: () => void
}

function sanitizeEvent(event: string, canSee: boolean): string {
  if (canSee) return event
  return event
    .replace(/^Reserved for .*?( — fulfilled from TBA list)?$/i, (_match, p1) => `Reserved for [Hidden Client]${p1 ?? ''}`)
    .replace(/^Delivered to .*?( on .*)$/i, 'Delivered to [Hidden Client]$1')
    .replace(/Moved reservation \(.*?\) to TBA list/i, 'Moved reservation to TBA list')
    .replace(/Reservation cancelled \(was .*?\)/i, 'Reservation cancelled')
}

export function HistoryModal({ machine, onClose }: Props) {
  const { user } = useAuth()
  const { data: history, isLoading } = useMachineHistory(machine?.id ?? '')
  const { data: users } = useUsers()
  const canSee = canSeeClient(user, machine?.ae ?? null)

  const formatActor = (actor: string | null) => {
    if (!actor) return null
    if (!actor.includes('@')) return actor
    // Look up matching user's display name
    const match = users?.find(
      u => u.email?.toLowerCase() === actor.toLowerCase() ||
           u.username?.toLowerCase() === actor.toLowerCase()
    )
    return match?.display_name || actor.split('@')[0]
  }

  return (
    <Modal
      open={!!machine}
      onClose={onClose}
      title={`History — ${machine?.model ?? ''} ${machine?.serial_no ?? ''}`}
      footer={
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-[13px] text-[var(--text-muted)] py-4 text-center">Loading…</p>}
        {!isLoading && !history?.length && (
          <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">
            <div className="text-3xl mb-1">🕒</div>
            No history yet.
          </div>
        )}
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--border)]">
          {history?.map(h => {
            const actorName = formatActor(h.actor)
            return (
              <div key={h.id} className="relative flex flex-col gap-1 text-[12.5px]">
                <span className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-4 ring-[var(--surface-1)]" />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[11.5px] font-semibold text-[var(--text-secondary)]">
                    {h.created_at.slice(0, 16).replace('T', ' ')}
                  </span>
                  {actorName && (
                    <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {actorName}
                    </span>
                  )}
                </div>
                <div className="text-[var(--text-primary)] font-medium bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-2.5">
                  {sanitizeEvent(h.event, canSee)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
