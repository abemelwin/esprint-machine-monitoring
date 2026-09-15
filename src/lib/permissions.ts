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
  if (user.ae_code) s.add(user.ae_code.trim())
  ;(user.approved_aes ?? []).forEach(a => { const t = a.trim(); if (t) s.add(t) })
  return s
}

export function canSeeClient(user: UserProfileWithRole | null, aeVal: string | null): boolean {
  const p = getPerms(user)
  if (p.viewClient) return true
  return clientAESet(user).has((aeVal ?? '').trim())
}

// Whether a whole row (machine / TBA / stock item) is visible to the user.
// Full-access roles (viewClient) see every row. Otherwise the user only sees
// rows whose AE is in their own + approved AE set. Unassigned rows (blank AE)
// are hidden from restricted users.
export function canSeeRow(user: UserProfileWithRole | null, aeVal: string | null): boolean {
  const p = getPerms(user)
  if (p.viewClient) return true
  const ae = (aeVal ?? '').trim()
  if (!ae) return false
  return clientAESet(user).has(ae)
}

export function hideClientCols(user: UserProfileWithRole | null): boolean {
  const p = getPerms(user)
  return !p.viewClient && clientAESet(user).size === 0
}
