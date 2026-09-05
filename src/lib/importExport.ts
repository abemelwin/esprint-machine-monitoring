import type { Machine } from '../types/database'

// ── CSV export for machines ────────────────────────────────────────
export function exportMachinesCSV(rows: Machine[], hideCols: boolean, canSeeClientFn: (ae: string | null) => boolean) {
  let head  = ['Status','PO No.','Brand','Model','Branch','Client Name','Code','Location','AE','Reservation Date','Delivery Date','Serial','Shipment Receipt / Transfer Date','Notes','Updated']
  let keys: (keyof Machine)[] = ['status','po_no','brand','model','branch','client_name','client_code','location','ae','reservation_date','delivery_date','serial_no','dispatch_date','notes','updated_at']

  if (hideCols) {
    const drop = new Set<keyof Machine>(['client_name','location'])
    const dropIdx = keys.map((k, i) => drop.has(k) ? i : -1).filter(i => i >= 0)
    keys = keys.filter(k => !drop.has(k))
    head = head.filter((_, i) => !dropIdx.includes(i))
  }

  const lines = [head.join(',')]
  rows.forEach(m => {
    lines.push(keys.map(k => {
      let v: unknown
      if ((k === 'client_name' || k === 'location') && !canSeeClientFn(m.ae)) v = '•••'
      else v = m[k] ?? ''
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(','))
  })

  download(lines.join('\n'), `ES_machines_${today()}.csv`, 'text/csv')
}

// ── JSON backup (full state) ───────────────────────────────────────
export function exportJSON(data: unknown) {
  download(JSON.stringify(data, null, 2), `ES_backup_${today()}.json`, 'application/json')
}

// ── Import legacy JSON backup from the old HTML app ────────────────
export interface LegacyBackup {
  seq?: number
  machines?: LegacyMachine[]
  tbaList?: LegacyTBA[]
  reorder?: Record<string, number>
  branches?: string[]
  aes?: string[]
  brands?: string[]
  models?: string[]
}

interface LegacyMachine {
  serial?: string; poNo?: string; model?: string; brand?: string; branch?: string
  status?: string; client?: string; clientCode?: string; location?: string; ae?: string
  reservationDate?: string; deliveryDate?: string; dispatchDate?: string; notes?: string
  updated?: string; history?: { t: string; e: string }[]
}

interface LegacyTBA {
  brand?: string; model?: string; client?: string; clientCode?: string; location?: string
  ae?: string; reservationDate?: string; notes?: string; created?: string
}

export function parseLegacyBackup(obj: LegacyBackup) {
  const machines = (obj.machines ?? []).map(m => ({
    serial_no:        m.serial        ?? null,
    po_no:            m.poNo          ?? null,
    model:            m.model         ?? '',
    brand:            m.brand         ?? null,
    branch:           m.branch        ?? null,
    status:           (m.status ?? 'In Stock') as Machine['status'],
    client_name:      m.client        ?? null,
    client_code:      m.clientCode    ?? null,
    location:         m.location      ?? null,
    ae:               m.ae            ?? null,
    reservation_date: m.reservationDate ?? null,
    delivery_date:    m.deliveryDate  ?? null,
    dispatch_date:    m.dispatchDate  ?? null,
    notes:            m.notes         ?? null,
  }))

  const tba = (obj.tbaList ?? []).map(t => ({
    brand:            t.brand         ?? null,
    model:            t.model         ?? '',
    client_name:      t.client        ?? null,
    client_code:      t.clientCode    ?? null,
    location:         t.location      ?? null,
    ae:               t.ae            ?? null,
    reservation_date: t.reservationDate ?? null,
    notes:            t.notes         ?? null,
  }))

  const reorder = Object.entries(obj.reorder ?? {}).map(([key, quantity]) => {
    const [brand, model] = key.split('||')
    return { brand, model, quantity }
  })

  return { machines, tba, reorder, lookups: { branches: obj.branches ?? [], aes: obj.aes ?? [], brands: obj.brands ?? [], models: obj.models ?? [] } }
}

function today() { return new Date().toISOString().slice(0, 10) }

function download(content: string, filename: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  a.click()
}
