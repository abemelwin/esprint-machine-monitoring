import { useAddLookup, useLookups } from '../../hooks/useMachines'
import { Select } from './Field'

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
  const addLookup = useAddLookup()

  const list = lookups?.[kind] ?? []
  // Ensure current value is in the list
  const options = value && !list.includes(value) ? [value, ...list] : list

  const handleChange = async (v: string) => {
    if (v === '__add') {
      const newVal = window.prompt(`Add a new ${LABELS[kind]}:`)?.trim()
      if (!newVal) return
      await addLookup.mutateAsync({ table: kind, value: newVal })
      onChange(newVal)
      return
    }
    onChange(v)
  }

  return (
    <Select id={id} value={value} onChange={e => handleChange(e.target.value)}>
      <option value="">{placeholder ?? ''}</option>
      {options.map((o: string) => (
        <option key={o} value={o}>{o}</option>
      ))}
      <option value="__add">＋ Add new…</option>
    </Select>
  )
}
