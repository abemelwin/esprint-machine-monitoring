import { useState } from 'react'
import { useRoles, useUsers, useSaveRole, useDeleteRole, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useAdmin'
import { useAuth } from '../../hooks/useAuth'
import { PERM_DEFS } from '../../lib/constants'
import type { InvRole, RolePerms, UserProfileWithRole } from '../../types/database'
import { Button } from '../ui/Button'
import { Modal, ModalFooter } from '../ui/Modal'
import { Field, Grid2, Input, Select, Banner } from '../ui/Field'
import { useLookups } from '../../hooks/useMachines'
import { useConfirm, useAlert } from '../ui/DialogProvider'

type AdminTab = 'roles' | 'users'

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>('roles')
  return (
    <Modal open onClose={onClose} title="Access Control" maxWidth="max-w-3xl"
      footer={<Button variant="default" onClick={onClose}>Close</Button>}>
      {/* Tab nav */}
      <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-[11px] w-fit mb-4 mt-2">
        {(['roles','users'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-[8px] border-none text-[13.5px] font-[650] cursor-pointer transition-all ${tab === t ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[var(--shadow)]' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {t === 'roles' ? '🛡️ Roles' : '👤 Users'}
          </button>
        ))}
      </div>
      {tab === 'roles' ? <RolesTab /> : <UsersTab />}
    </Modal>
  )
}

/* ── Roles ──────────────────────────────────────────────────────── */
function RolesTab() {
  const { data: roles = [] } = useRoles()
  const { data: users = [] } = useUsers()
  const saveRole   = useSaveRole()
  const deleteRole = useDeleteRole()
  const [editTarget, setEditTarget] = useState<InvRole | null | 'new'>(null)
  const confirm = useConfirm()
  const alert = useAlert()

  const handleDelete = async (r: InvRole) => {
    const inUse = users.filter(u => u.inv_role_key === r.key).length
    if (inUse) {
      await alert(`Cannot delete "${r.label}" — ${inUse} user(s) assigned. Reassign them first.`)
      return
    }
    const ok = await confirm({
      title: 'Delete Role',
      message: `Delete role "${r.label}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    deleteRole.mutate(r.id)
  }

  const thCls = 'bg-[var(--surface-2)] text-left px-3.5 py-3 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wider border-b border-[var(--border)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] text-[12.5px]'

  return (
    <>
      <Banner>Define what each role can do, then assign people to roles under the <b>Users</b> tab.</Banner>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden mb-4 custom-scrollbar" style={{ maxHeight: '44vh', overflowY: 'auto' }}>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={thCls}>Role</th>
            <th className={thCls}>Permissions</th>
            <th className={`${thCls} text-center`}>Users</th>
            <th className={`${thCls} text-right`}>Actions</th>
          </tr></thead>
          <tbody>
            {roles.map(r => {
              const nUsers = users.filter(u => u.inv_role_key === r.key).length
              const tags = permSummary(r.perms)
              return (
                <tr key={r.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                  <td className={`${tdCls} font-semibold text-[var(--text-primary)]`}>{r.label}</td>
                  <td className={tdCls}>
                    <div className="flex flex-wrap gap-1">
                      {tags.map(t => (
                        <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] font-medium">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className={`${tdCls} text-center font-medium`}>{nUsers}</td>
                  <td className={`${tdCls} text-right`}>
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditTarget(r)}>✎</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>🗑</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button variant="primary" onClick={() => setEditTarget('new')}>＋ Add Role</Button>

      {editTarget !== null && (
        <RoleForm
          role={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(label, perms) => {
            saveRole.mutate(
              editTarget === 'new' ? { label, perms } : { id: (editTarget as InvRole).id, label, perms },
              { onSuccess: () => setEditTarget(null) }
            )
          }}
          loading={saveRole.isPending}
        />
      )}
    </>
  )
}

function RoleForm({ role, onClose, onSave, loading }: {
  role: InvRole | null
  onClose: () => void
  onSave: (label: string, perms: RolePerms) => void
  loading: boolean
}) {
  const [label, setLabel] = useState(role?.label ?? '')
  const [perms, setPerms] = useState<RolePerms>(role?.perms ?? {})
  const [err,   setErr]   = useState('')

  const toggle = (k: string) => setPerms(p => ({ ...p, [k]: !p[k as keyof RolePerms] }))

  const handleSave = () => {
    if (!label.trim()) { setErr('Please enter a role name.'); return }
    setErr('')
    onSave(label, perms)
  }

  return (
    <Modal open onClose={onClose} title={role ? 'Edit Role' : 'Add Role'}
      footer={<ModalFooter onCancel={onClose} onConfirm={handleSave} confirmLabel="Save Role" loading={loading} />}>
      <div className="flex flex-col gap-4 mt-2">
        <Field label="Role Name" required>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Warehouse Staff" />
        </Field>
        <Field label="Permissions">
          <div className="flex flex-col gap-2.5 bg-[var(--surface-0)] border border-[var(--border)] rounded-[10px] p-3.5">
            {PERM_DEFS.map(d => (
              <label key={d.k} className="flex gap-2.5 items-start cursor-pointer text-[13px] text-[var(--text-primary)] hover:opacity-90">
                <input type="checkbox" className="mt-0.5 w-4 h-4 cursor-pointer flex-none accent-[var(--accent)]"
                  checked={!!perms[d.k as keyof RolePerms]}
                  onChange={() => toggle(d.k)} />
                <span><b>{d.label}</b><br /><span className="text-[11px] text-[var(--text-muted)]">{d.hint}</span></span>
              </label>
            ))}
          </div>
        </Field>
        {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}
      </div>
    </Modal>
  )
}

/* ── Users ──────────────────────────────────────────────────────── */
function UsersTab() {
  const { user: currentUser } = useAuth()
  const { data: users  = [] } = useUsers()
  const { data: roles  = [] } = useRoles()
  const { data: lookups }     = useLookups()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const [editTarget, setEditTarget] = useState<UserProfileWithRole | null | 'new'>(null)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const confirm = useConfirm()
  const alert = useAlert()

  // Filter by search text (email / name / username) and by role
  const q = search.trim().toLowerCase()
  const filteredUsers = users.filter(u => {
    if (roleFilter && u.inv_role_key !== roleFilter) return false
    if (!q) return true
    return (
      (u.email        ?? '').toLowerCase().includes(q) ||
      (u.display_name ?? '').toLowerCase().includes(q) ||
      (u.username     ?? '').toLowerCase().includes(q)
    )
  })

  const handleDelete = async (u: UserProfileWithRole) => {
    if (u.user_id === currentUser?.user_id) {
      await alert('You cannot delete your own account.')
      return
    }
    const ok = await confirm({
      title: 'Delete User',
      message: `Delete user "${u.email ?? u.display_name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    deleteUser.mutate(u.user_id)
  }

  const thCls = 'bg-[var(--surface-2)] text-left px-3.5 py-3 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wider border-b border-[var(--border)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] text-[12.5px]'

  return (
    <>
      <Banner>Each person signs in with their own email &amp; password. Assign a <b>Role</b> and set <b>AE access</b> for client visibility.</Banner>

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name or email…"
          className="flex-1 bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-primary)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
        >
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <span className="flex items-center px-3 text-[12px] font-medium text-[var(--text-muted)] whitespace-nowrap bg-[var(--surface-2)] rounded-md border border-[var(--border)]">
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden mb-4 custom-scrollbar" style={{ maxHeight: '44vh', overflowY: 'auto' }}>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={thCls}>Email</th>
            <th className={thCls}>Name</th>
            <th className={thCls}>Role</th>
            <th className={thCls}>AE Codes</th>
            <th className={`${thCls} text-right`}>Actions</th>
          </tr></thead>
          <tbody>
            {filteredUsers.map(u => {
              const rl = u.inv_role
              const aeAccess = (rl?.perms?.viewClient)
                ? 'All clients'
                : (u.inv_role_key === 'account_exec' || u.role === 'account_executive')
                  ? (u.ae_code || '—')
                  : (u.approved_aes && u.approved_aes.length > 0)
                    ? u.approved_aes.join(', ')
                    : '—'
              return (
                <tr key={u.user_id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                  <td className={`${tdCls} font-mono font-semibold text-[var(--text-primary)]`}>{u.email ?? u.username ?? u.user_id}</td>
                  <td className={tdCls}>{u.display_name || <span className="text-[var(--text-muted)]">—</span>}</td>
                  <td className={tdCls}>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[650] bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                      {rl?.label ?? u.inv_role_key ?? '—'}
                    </span>
                  </td>
                  <td className={`${tdCls} text-[11.5px] text-[var(--text-muted)] font-mono`}>{aeAccess}</td>
                  <td className={`${tdCls} text-right`}>
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditTarget(u)}>✎</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(u)}>🗑</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button variant="primary" onClick={() => setEditTarget('new')}>＋ Add User</Button>

      {editTarget !== null && (
        <UserForm
          user={editTarget === 'new' ? null : editTarget}
          roles={roles}
          aes={lookups?.aes ?? []}
          onClose={() => setEditTarget(null)}
          onSave={async data => {
            if (editTarget === 'new') {
              await createUser.mutateAsync(data as Parameters<typeof createUser.mutate>[0])
            } else {
              await updateUser.mutateAsync({ user_id: (editTarget as UserProfileWithRole).user_id, ...data })
            }
            setEditTarget(null)
          }}
          loading={createUser.isPending || updateUser.isPending}
        />
      )}
    </>
  )
}

function UserForm({ user, roles, aes, onClose, onSave, loading }: {
  user: UserProfileWithRole | null
  roles: InvRole[]
  aes: string[]
  onClose: () => void
  onSave: (data: {
    email: string
    display_name: string
    inv_role_key: string
    password: string
    ae_code: string | null
    approved_aes: string[]
  }) => Promise<void>
  loading: boolean
}) {
  const isEdit = !!user
  const [email,       setEmail]       = useState(user?.email ?? '')
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [roleKey,     setRoleKey]     = useState(user?.inv_role_key ?? roles[0]?.key ?? '')
  const [password,    setPassword]    = useState('')
  const [aeCode,      setAeCode]      = useState(user?.ae_code ?? '')
  const [approvedAEs, setApprovedAEs] = useState<string[]>(user?.approved_aes ?? [])
  const [err,         setErr]         = useState('')

  const isAccountExec = roleKey === 'account_exec'

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val)
    // Auto-suggest last name as AE code if creating new Account Executive
    if (!isEdit && isAccountExec) {
      const parts = val.trim().split(/\s+/)
      if (parts.length > 0) {
        const last = parts[parts.length - 1].replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ-]/g, '').toUpperCase()
        if (last && (!aeCode || parts.some(p => p.toUpperCase() === aeCode))) {
          setAeCode(last)
        }
      }
    }
  }

  const handleRoleChange = (newRole: string) => {
    setRoleKey(newRole)
    if (newRole === 'account_exec') {
      if (!aeCode && displayName) {
        const parts = displayName.trim().split(/\s+/)
        const last = parts[parts.length - 1].replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ-]/g, '').toUpperCase()
        if (last) setAeCode(last)
      }
    } else {
      setAeCode('')
    }
  }

  const toggleAE = (ae: string) => setApprovedAEs(prev => prev.includes(ae) ? prev.filter(a => a !== ae) : [...prev, ae])

  const handleSave = async () => {
    if (!email.trim()) { setErr('Please enter an email.'); return }
    if (!isEdit && !password) { setErr('Please set a password.'); return }
    if (!isEdit && password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    setErr('')
    try {
      const finalAe = isAccountExec && aeCode.trim() ? aeCode.trim().toUpperCase() : null
      await onSave({ email, display_name: displayName, inv_role_key: roleKey, password, ae_code: finalAe, approved_aes: approvedAEs })
    } catch (e: unknown) {
      setErr((e as Error)?.message || 'Failed to save user.')
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit User' : 'Add User'}
      footer={<ModalFooter onCancel={onClose} onConfirm={handleSave} confirmLabel="Save User" loading={loading} />}>
      <div className="flex flex-col gap-4 mt-2">
        <Grid2>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@esprintmedia.com" readOnly={isEdit} />
          </Field>
          <Field label="Display Name">
            <Input value={displayName} onChange={e => handleDisplayNameChange(e.target.value)} placeholder="Full name (e.g. Angelica Moreno)" />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Role" required>
            <Select value={roleKey} onChange={e => handleRoleChange(e.target.value)}>
              {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label={isEdit ? 'Password (blank = keep)' : 'Password'} required={!isEdit}>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? '••••••' : 'Set a password'} autoComplete="new-password" />
          </Field>
        </Grid2>
        <Banner>
          Set an <b>Own AE code</b> (Last Name) for Account Executives. Pick <b>Approved AEs</b> for Managers / Team Leaders. Full-access roles see all clients.
        </Banner>
        <Grid2>
          <Field
            label="Own AE code (Last name)"
            hint={isAccountExec ? "AE's Last Name (e.g. MORENO, MARCO)" : "Only applicable for Account Executives"}
          >
            <div className="relative">
              <Input
                list="ae-codes-list"
                value={aeCode}
                disabled={!isAccountExec}
                onChange={e => setAeCode(e.target.value.toUpperCase())}
                placeholder={isAccountExec ? "e.g. MORENO" : "— N/A for this role —"}
              />
              <datalist id="ae-codes-list">
                {aes.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
          </Field>
          <Field label="Approved AEs (multi-select)">
            <div className="flex flex-col gap-1.5 bg-[var(--surface-0)] border border-[var(--border)] rounded-[9px] p-2.5 max-h-28 overflow-y-auto custom-scrollbar">
              {aes.map(a => (
                <label key={a} className="flex items-center gap-2 text-[13px] cursor-pointer hover:opacity-90">
                  <input type="checkbox" checked={approvedAEs.includes(a)} onChange={() => toggleAE(a)} className="cursor-pointer accent-[var(--accent)]" />
                  {a}
                </label>
              ))}
            </div>
          </Field>
        </Grid2>
        {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}
      </div>
    </Modal>
  )
}

// ── helpers ─────────────────────────────────────────────────────
function permSummary(perms: RolePerms): string[] {
  const tags: string[] = PERM_DEFS.filter(d => d.k !== 'viewClient').filter(d => perms[d.k as keyof RolePerms]).map(d => d.label as string)
  if (perms.viewClient === false) tags.push('⊘ client hidden')
  return tags.length ? tags : ['View only']
}
