import { useState, useRef, useEffect } from 'react'
import { useAddLookup, useDeleteLookup, useLookups } from '../../hooks/useMachines'

type LookupKind = 'branches' | 'aes' | 'brands' | 'models'

const LABELS: Record<LookupKind, string> = {
  branches: 'branch code (e.g. MLA, CDO)',
  aes:      'AE / staff initials',
  brands:   'brand (e.g. EPSON)',
  models:   'model (e.g. I3200)',
}

interface Props {
  kind: LookupKind
  value: string
  onChange: (v: string) => void
  placeholder?: string
  id?: string
}

export function LookupSelect({ kind, value, onChange, placeholder, id }: Props) {
  const { data: lookups } = useLookups()
  const addLookup    = useAddLookup()
  const deleteLookup = useDeleteLookup()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const list = lookups?.[kind] ?? []
  const options = value && !list.includes(value) ? [value, ...list] : list

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const handleAdd = async () => {
    const newVal = window.prompt(`Add a new ${LABELS[kind]}:`)?.trim()
    if (!newVal) return
    await addLookup.mutateAsync({ table: kind, value: newVal })
    onChange(newVal)
    setOpen(false)
  }

  const handleDelete = async (e: React.MouseEvent, v: string) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${v}" from the list? This won't affect existing machines that use it.`)) return
    await deleteLookup.mutateAsync({ table: kind, value: v })
    if (value === v) onChange('')
  }

  const inputCls = 'w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2.5 rounded-[9px] text-[13.5px] text-left cursor-pointer flex items-center justify-between focus:outline-none focus:border-[var(--accent)]'

  return (
    <div ref={ref} className="relative" id={id}>
      {/* Trigger */}
      <button
        type="button"
        className={inputCls}
        onClick={() => setOpen(o => !o)}
      >
        <span className={value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {value || placeholder || ''}
        </span>
        <span className="text-[var(--text-muted)] text-[11px] ml-2">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-[9px] shadow-[0_4px_20px_rgba(0,0,0,.25)] overflow-hidden">
          {/* Empty option */}
          <div
            className="px-3 py-2 text-[13px] text-[var(--text-muted)] hover:bg-[var(--surface-2)] cursor-pointer"
            onClick={() => handleSelect('')}
          >
            {placeholder || '—'}
          </div>

          {/* Options with delete button */}
          <div className="max-h-48 overflow-y-auto">
            {options.map((o: string) => (
              <div
                key={o}
                className={`flex items-center justify-between px-3 py-2 text-[13px] cursor-pointer hover:bg-[var(--surface-2)] ${o === value ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}
                onClick={() => handleSelect(o)}
              >
                <span>{o}</span>
                <button
                  type="button"
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] text-[12px] px-1.5 py-0.5 rounded ml-2 hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-colors"
                  onClick={e => handleDelete(e, o)}
                  title={`Delete "${o}"`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div
            className="px-3 py-2 text-[13px] text-[var(--accent)] hover:bg-[var(--surface-2)] cursor-pointer border-t border-[var(--border)] font-[550]"
            onClick={handleAdd}
          >
            ＋ Add new…
          </div>
        </div>
      )}
    </div>
  )
}
