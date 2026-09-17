import { useEffect, type ReactNode } from 'react'
import { Button } from './Button'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-xl' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handler)
      // Prevent body scroll while modal is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 ease-out`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)] flex-none">
          <h2 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors border-none bg-transparent cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-[var(--border)] flex gap-2.5 justify-end bg-[var(--surface-2)] flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Convenience: standard Cancel + primary action footer
export function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel = 'Save',
  confirmVariant = 'primary' as const,
  loading = false,
}: {
  onCancel: () => void
  onConfirm?: () => void
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}) {
  return (
    <>
      <Button variant="default" onClick={onCancel} disabled={loading}>Cancel</Button>
      {onConfirm && (
        <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>{confirmLabel === 'Save' ? 'Saving…' : confirmLabel}</span>
            </span>
          ) : (
            confirmLabel
          )}
        </Button>
      )}
    </>
  )
}
