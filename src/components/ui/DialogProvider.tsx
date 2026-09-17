import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmOptions {
  title?: string
  message: string | ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary' | 'warning'
}

interface AlertOptions {
  title?: string
  message: string | ReactNode
  okLabel?: string
  variant?: 'info' | 'error' | 'success' | 'warning'
}

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
  alert: (options: AlertOptions | string) => Promise<void>
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string | ReactNode
    confirmLabel: string
    cancelLabel: string
    variant: 'danger' | 'primary' | 'warning'
  } | null>(null)
  const confirmResolver = useRef<((value: boolean) => void) | null>(null)

  // Alert Dialog State
  const [alertState, setAlertState] = useState<{
    open: boolean
    title: string
    message: string | ReactNode
    okLabel: string
    variant: 'info' | 'error' | 'success' | 'warning'
  } | null>(null)
  const alertResolver = useRef<(() => void) | null>(null)

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve
      if (typeof options === 'string') {
        const isDelete = options.toLowerCase().includes('delete') || options.toLowerCase().includes('remove')
        setConfirmState({
          open: true,
          title: isDelete ? 'Confirm Deletion' : 'Confirmation',
          message: options,
          confirmLabel: isDelete ? 'Delete' : 'Confirm',
          cancelLabel: 'Cancel',
          variant: isDelete ? 'danger' : 'primary',
        })
      } else {
        setConfirmState({
          open: true,
          title: options.title || (options.variant === 'danger' ? 'Confirm Action' : 'Confirmation'),
          message: options.message,
          confirmLabel: options.confirmLabel || (options.variant === 'danger' ? 'Delete' : 'Confirm'),
          cancelLabel: options.cancelLabel || 'Cancel',
          variant: options.variant || 'primary',
        })
      }
    })
  }, [])

  const handleConfirmClose = (result: boolean) => {
    setConfirmState(null)
    if (confirmResolver.current) {
      confirmResolver.current(result)
      confirmResolver.current = null
    }
  }

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      alertResolver.current = resolve
      if (typeof options === 'string') {
        const isError = options.toLowerCase().includes('error') || options.toLowerCase().includes('fail') || options.toLowerCase().includes('cannot')
        setAlertState({
          open: true,
          title: isError ? 'Notice' : 'Information',
          message: options,
          okLabel: 'OK',
          variant: isError ? 'error' : 'info',
        })
      } else {
        setAlertState({
          open: true,
          title: options.title || 'Notice',
          message: options.message,
          okLabel: options.okLabel || 'OK',
          variant: options.variant || 'info',
        })
      }
    })
  }, [])

  const handleAlertClose = () => {
    setAlertState(null)
    if (alertResolver.current) {
      alertResolver.current()
      alertResolver.current = null
    }
  }

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  // Keyboard handler for modal dialogs
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (confirmState?.open) {
        if (e.key === 'Escape') {
          e.preventDefault()
          handleConfirmClose(false)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleConfirmClose(true)
        }
      } else if (alertState?.open) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault()
          handleAlertClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmState, alertState])

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}

      {/* Confirmation Modal */}
      {confirmState?.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleConfirmClose(false)
          }}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none text-lg ${
                    confirmState.variant === 'danger'
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : confirmState.variant === 'warning'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}
                >
                  {confirmState.variant === 'danger' ? '🗑️' : confirmState.variant === 'warning' ? '⚠️' : '❓'}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-tight">
                    {confirmState.title}
                  </h3>
                  <div className="mt-2 text-[13.5px] text-[var(--text-secondary)] leading-relaxed break-words">
                    {confirmState.message}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-end gap-2.5">
              <Button
                variant="default"
                size="md"
                onClick={() => handleConfirmClose(false)}
                autoFocus={confirmState.variant === 'danger'}
              >
                {confirmState.cancelLabel}
              </Button>
              <Button
                variant={confirmState.variant === 'danger' ? 'danger' : 'primary'}
                size="md"
                onClick={() => handleConfirmClose(true)}
                autoFocus={confirmState.variant !== 'danger'}
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertState?.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleAlertClose()
          }}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none text-lg ${
                    alertState.variant === 'error'
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : alertState.variant === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : alertState.variant === 'warning'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}
                >
                  {alertState.variant === 'error'
                    ? '⚠️'
                    : alertState.variant === 'success'
                    ? '✅'
                    : alertState.variant === 'warning'
                    ? '⚡'
                    : 'ℹ️'}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-tight">
                    {alertState.title}
                  </h3>
                  <div className="mt-2 text-[13.5px] text-[var(--text-secondary)] leading-relaxed break-words">
                    {alertState.message}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleAlertClose}
                autoFocus
              >
                {alertState.okLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-[13px] font-medium backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ${
                t.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : t.type === 'error'
                  ? 'bg-red-950/90 border-red-500/40 text-red-200'
                  : 'bg-[var(--surface-1)] border-[var(--border-strong)] text-[var(--text-primary)]'
              }`}
            >
              <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <span className="flex-1">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return ctx
}

export function useConfirm() {
  const { confirm } = useDialog()
  return confirm
}

export function useAlert() {
  const { alert } = useDialog()
  return alert
}

export function useToast() {
  const { toast } = useDialog()
  return toast
}
