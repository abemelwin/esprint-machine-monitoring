export type MachineStatus =
  | 'Incoming'
  | 'In Stock'
  | 'Recertified'
  | 'Demo'
  | 'Reserved'
  | 'Delivered'
  | 'Pullout Parts'

// ── Inventory unit (was "Machine" — now stored in inventory_units table) ──
export interface InventoryUnit {
  id: string
  serial_no: string | null
  po_no: string | null
  brand: string | null
  model: string
  branch: string | null
  status: MachineStatus
  client_name: string | null
  client_code: string | null
  location: string | null
  ae: string | null
  reservation_date: string | null
  delivery_date: string | null
  dispatch_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

// Keep "Machine" as an alias so components need minimal changes
export type Machine = InventoryUnit

export interface MachineHistory {
  id: string
  machine_id: string
  event: string
  actor: string | null
  created_at: string
}

export interface TBAItem {
  id: string
  brand: string | null
  model: string
  client_name: string | null
  client_code: string | null
  location: string | null
  ae: string | null
  reservation_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface ReorderPoint {
  id: number
  brand: string
  model: string
  quantity: number
}

// ── Inventory roles (stored in inv_roles table) ──────────────────
export interface InvRole {
  id: string
  key: string
  label: string
  perms: RolePerms
  created_at: string
}

// Keep "Role" as alias so components need minimal changes
export type Role = InvRole

export interface RolePerms {
  edit?: boolean
  reserve?: boolean
  deliver?: boolean
  unreserve?: boolean
  manageUsers?: boolean
  viewClient?: boolean
}

// ── User profile (shared with Sales Portal, uses user_id FK) ─────
// The SP user_profiles table uses user_id (not id) as the auth FK.
// MM-specific columns added via migration: username, inv_role_key, ae_code, approved_aes
export interface UserProfile {
  // SP columns
  user_id: string          // FK to auth.users
  display_name: string | null
  role: string             // SP role string (e.g. 'account_executive')
  is_active: boolean
  email: string | null
  created_at: string
  // MM-specific columns (added by migration)
  username: string | null
  inv_role_key: string | null
  ae_code: string | null
  approved_aes: string[]
  // Membership flags — which app's Users panel shows this person
  is_sp_member: boolean
  is_mm_member: boolean
}

// Joined type used in the MM app — includes the full inv_role object
export interface UserProfileWithRole extends UserProfile {
  inv_role: InvRole | null
}

// ── Supabase Database type ────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      inventory_units: {
        Row: InventoryUnit
        Insert: Omit<InventoryUnit, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InventoryUnit, 'id' | 'created_at'>>
      }
      machine_history: {
        Row: MachineHistory
        Insert: Omit<MachineHistory, 'id' | 'created_at'>
        Update: never
      }
      tba_list: {
        Row: TBAItem
        Insert: Omit<TBAItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TBAItem, 'id' | 'created_at'>>
      }
      reorder_points: {
        Row: ReorderPoint
        Insert: Omit<ReorderPoint, 'id'>
        Update: Partial<Omit<ReorderPoint, 'id'>>
      }
      inv_roles: {
        Row: InvRole
        Insert: Omit<InvRole, 'id' | 'created_at'>
        Update: Partial<Omit<InvRole, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at'>
        Update: Partial<Omit<UserProfile, 'user_id' | 'created_at'>>
      }
      branches: { Row: { id: number; code: string }; Insert: { code: string }; Update: { code?: string } }
      aes:      { Row: { id: number; code: string }; Insert: { code: string }; Update: { code?: string } }
      brands:   { Row: { id: number; name: string }; Insert: { name: string }; Update: { name?: string } }
      models:   { Row: { id: number; name: string }; Insert: { name: string }; Update: { name?: string } }
    }
    Functions: {
      has_inv_perm: { Args: { perm: string }; Returns: boolean }
    }
  }
}
