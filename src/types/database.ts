export type MachineStatus =
  | 'Incoming'
  | 'In Stock'
  | 'Recertified'
  | 'Demo'
  | 'Reserved'
  | 'Delivered'
  | 'Pullout Parts'

export interface Machine {
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

export interface Role {
  id: string
  key: string
  label: string
  perms: RolePerms
  created_at: string
}

export interface RolePerms {
  edit?: boolean
  reserve?: boolean
  deliver?: boolean
  unreserve?: boolean
  manageUsers?: boolean
  viewClient?: boolean
}

export interface UserProfile {
  id: string
  username: string
  display_name: string | null
  role_key: string
  ae_code: string | null
  approved_aes: string[]
  created_at: string
  updated_at: string
}

// Joined type used in the app
export interface UserProfileWithRole extends UserProfile {
  role: Role
}

// ── Supabase Database type (for typed client) ──────────────────────
export type Database = {
  public: {
    Tables: {
      machines: {
        Row: Machine
        Insert: Omit<Machine, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Machine, 'id' | 'created_at'>>
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
      roles: {
        Row: Role
        Insert: Omit<Role, 'id' | 'created_at'>
        Update: Partial<Omit<Role, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
      }
      branches: { Row: { id: number; code: string }; Insert: { code: string }; Update: { code?: string } }
      aes:      { Row: { id: number; code: string }; Insert: { code: string }; Update: { code?: string } }
      brands:   { Row: { id: number; name: string }; Insert: { name: string }; Update: { name?: string } }
      models:   { Row: { id: number; name: string }; Insert: { name: string }; Update: { name?: string } }
    }
    Functions: {
      has_perm: { Args: { perm: string }; Returns: boolean }
      current_user_role: { Args: Record<never, never>; Returns: string }
    }
  }
}
