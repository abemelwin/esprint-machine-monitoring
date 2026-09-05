import type { MachineStatus } from '../types/database'

export const STATUS_CONFIG: Record<MachineStatus, { color: string; hex: string; icon: string; rowClass: string }> = {
  'Incoming':      { color: 'var(--incoming)',  hex: '#2a78d6', icon: '🚚', rowClass: 'st-incoming' },
  'In Stock':      { color: 'var(--stock)',      hex: '#1baf7a', icon: '📦', rowClass: 'st-instock' },
  'Recertified':   { color: 'var(--recert)',     hex: '#0d9488', icon: '♻️', rowClass: 'st-recertified' },
  'Demo':          { color: 'var(--demo)',       hex: '#d6459b', icon: '🧪', rowClass: 'st-demo' },
  'Reserved':      { color: 'var(--reserved)',   hex: '#eda100', icon: '🔖', rowClass: 'st-reserved' },
  'Delivered':     { color: 'var(--delivered)',  hex: '#008300', icon: '✅', rowClass: 'st-delivered' },
  'Pullout Parts': { color: 'var(--pullout)',    hex: '#8a5a2b', icon: '🔧', rowClass: 'st-pulloutparts' },
}

export const ALL_STATUSES = Object.keys(STATUS_CONFIG) as MachineStatus[]

export const PERM_DEFS = [
  { k: 'edit',        label: 'Manage inventory',           hint: 'Add, edit, delete units · mark arrived · set reorder points' },
  { k: 'reserve',     label: 'Reserve & move to TBA',      hint: 'Create reservations and transfer them to the TBA list' },
  { k: 'deliver',     label: 'Deliver',                    hint: 'Mark reserved/in-stock units as delivered' },
  { k: 'unreserve',   label: 'Unreserve',                  hint: 'Cancel reservations / remove from TBA' },
  { k: 'manageUsers', label: 'Manage users & roles',       hint: 'Admin — manage roles, users, import & backup' },
  { k: 'viewClient',  label: 'See ALL client names & locations', hint: 'Checked = see every client. Unchecked = see only the clients of own AE / approved AEs.' },
] as const

export const today = () => new Date().toISOString().slice(0, 10)
export const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
