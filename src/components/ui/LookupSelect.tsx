import { useState, useRef, useEffect } from 'react'
import { useAddLookup, useDeleteLookup, useLookups } from '../../hooks/useMachines'
import { Button } from './Button'

type LookupKind = 'branches' | 'aes' | 'brands' | 'models'

const TITLES: Record<LookupKind, string> = {
  branches: 'Branch',
  aes:      'AE',
  brands:   'Brand',
  models:   'Model',
}

const PLACEHOLDERS: Record<LookupKind, string> = {
  branches: 'e.g. CAVITE, ISABELA',
  aes:      'e.g. MORENO, MARCO',
  brands:   'e.g. EPSON, XEROX',
  models:   'e.g. I3200, XP600',
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
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newVal, setNewVal] = useState('')
  const [addErr, setAddErr] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const list = lookups?.[kind] ?? []
  const options = value && !list.includes(value) ? [value, ...list] : list

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto focus input when add modal opens
  useEffect(() => {
    if (addModalOpen) {
      setNewVal('')
      setAddErr('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [addModalOpen])

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  // AEs are strictly tied to existing registered users, so adding or deleting
  // ad-hoc AE codes from here is disabled. Branches, brands, and models remain editable.
  const isEditable = kind !== 'aes'

  const handleOpenAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setAddModalOpen(true)
  }

  const handleSaveAdd = async () => {
    const val = newVal.trim()
    if (!val) {
      setAddErr(`Please enter a ${TITLES[kind].toLowerCase()} name.`)
      return
    }
    const cleanVal = kind === 'branches' ? val.toUpperCase() : val
    try {
      await addLookup.mutateAsync({ table: kind, value: cleanVal })
      onChange(cleanVal)
      setAddModalOpen(false)
    } catch (e: unknown) {
      setAddErr((e as Error)?.message || `Failed to add ${TITLES[kind].toLowerCase()}.`)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, v: string) => {
    e.stopPropagation()
    setOpen(false)
    setDeleteTarget(v)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteLookup.mutateAsync({ table: kind, value: deleteTarget })
      if (value === deleteTarget) onChange('')
      setDeleteTarget(null)
    } catch {
      setDeleteTarget(null)
    }
  }

  const inputCls = 'w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2.5 rounded-[9px] text-[13.5px] text-left cursor-pointer flex items-center justify-between focus:outline-none focus:border-[var(--accent)]'

  return (
    <>
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

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-[9px] shadow-[0_10px_30px_rgba(0,0,0,.35)] overflow-hidden">
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
                  {isEditable && (
                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] text-[12px] px-1.5 py-0.5 rounded ml-2 hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-colors"
                      onClick={e => handleDeleteClick(e, o)}
                      title={`Delete "${o}"`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new button */}
            {isEditable && (
              <div
                className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] text-[var(--accent)] hover:bg-[var(--surface-2)] cursor-pointer border-t border-[var(--border)] font-[550] transition-colors"
                onClick={handleOpenAdd}
              >
                <span>＋</span> Add new {TITLES[kind]}…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modern UI Modal for Adding New Lookup Item */}
      {addModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[110] p-4 animate-in fade-in duration-150"
          onClick={e => { if (e.target === e.currentTarget) setAddModalOpen(false) }}
          onKeyDown={e => {
            if (e.key === 'Escape') setAddModalOpen(false)
          }}
        >
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.45)] w-full max-w-[400px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Add New {TITLES[kind]}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-2">
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                {TITLES[kind]} Name / Code
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newVal}
                onChange={e => { setNewVal(e.target.value); setAddErr('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveAdd() }}
                placeholder={PLACEHOLDERS[kind]}
                className="w-full bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2.5 rounded-[9px] text-[13.5px] focus:outline-none focus:border-[var(--accent)]"
              />
              {addErr && (
                <p className="text-[12px] text-[var(--danger)] mt-2">{addErr}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex gap-2 justify-end mt-4 bg-[var(--surface-1)]">
              <Button type="button" variant="default" size="md" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSaveAdd}
                disabled={addLookup.isPending}
              >
                {addLookup.isPending ? 'Saving…' : `Save ${TITLES[kind]}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern UI Modal for Delete Confirmation */}
      {deleteTarget !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[110] p-4 animate-in fade-in duration-150"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
          onKeyDown={e => { if (e.key === 'Escape') setDeleteTarget(null) }}
        >
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.45)] w-full max-w-[380px] overflow-hidden p-6">
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">
              Delete "{deleteTarget}"?
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-6">
              This will remove <b>{deleteTarget}</b> from the list. Existing records using this will not be affected.
            </p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="default" size="md" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleConfirmDelete}
                disabled={deleteLookup.isPending}
              >
                {deleteLookup.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
