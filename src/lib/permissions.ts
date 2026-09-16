import type { RolePerms, UserProfileWithRole } from '../types/database'

export function getPerms(user: UserProfileWithRole | null): Required<RolePerms> {
  // Permissions come from inv_role (renamed from "role" in old schema)
  const p = user?.inv_role?.perms ?? {}
  return {
    edit:        !!p.edit,
    reserve:     !!p.reserve,
    deliver:     !!p.deliver,
    unreserve:   !!p.unreserve,
    manageUsers: !!p.manageUsers,
    viewClient:  !!p.viewClient,
  }
}

export function clientAESet(user: UserProfileWithRole | null): Set<string> {
  const s = new Set<string>()
  if (!user) return s
  if (user.ae_code) s.add(user.ae_code.trim().toUpperCase())
  ;(user.approved_aes ?? []).forEach(a => { const t = a.trim().toUpperCase(); if (t) s.add(t) })
  return s
}

export function canSeeClient(user: UserProfileWithRole | null, aeVal: string | null): boolean {
  const p = getPerms(user)
  if (p.viewClient) return true
  if (!aeVal || !aeVal.trim()) return false
  return clientAESet(user).has(aeVal.trim().toUpperCase())
}

export function hideClientCols(user: UserProfileWithRole | null): boolean {
  const p = getPerms(user)
  return !p.viewClient && clientAESet(user).size === 0
}

