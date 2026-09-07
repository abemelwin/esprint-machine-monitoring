import { useState } from 'react'
import { useRoles, useUsers, useSaveRole, useDeleteRole, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useAdmin'
import { useAuth } from '../../hooks/useAuth'
import { PERM_DEFS } from '../../lib/constants'
import type { Role, RolePerms, UserProfileWithRole } from '../../types/database'
import { Button } from '../ui/Button'
import { Modal, ModalFooter } from '../ui/Modal'
import { Field, Grid2, Input, Select, Banner } from '../ui/Field'
import { useLookups } from '../../hooks/useMachines'

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
  const [editTarget, setEditTarget] = useState<Role | null | 'new'>(null)

  const handleDelete = (r: Role) => {
    const inUse = users.filter(u => u.role_key === r.key).length
    if (inUse) { alert(`Cannot delete "${r.label}" — ${inUse} user(s) assigned. Reassign them first.`); return }
    if (!window.confirm(`Delete role "${r.label}"?`)) return
    deleteRole.mutate(r.id)
  }

  const thCls = 'bg-[var(--surface-2)] text-left px-3 py-2.5 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wide border-b border-[var(--border)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] text-[12.5px]'

  return (
    <>
      <Banner>Define what each role can do, then assign people to roles under the <b>Users</b> tab.</Banner>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden mb-4" style={{ maxHeight: '44vh', overflowY: 'auto' }}>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={thCls}>Role</th>
            <th className={thCls}>Permissions</th>
            <th className={`${thCls} text-center`}>Users</th>
            <th className={`${thCls} text-right`}>Actions</th>
          </tr></thead>
          <tbody>
            {roles.map(r => {
              const nUsers = users.filter(u => u.role_key === r.key).length
              const tags = permSummary(r.perms)
              return (
                <tr key={r.id}>
                  <td className={`${tdCls} font-semibold`}>{r.label}</td>
                  <td className={tdCls}>
                    <div className="flex flex-wrap gap-1">
                      {tags.map(t => (
                        <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)]">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className={`${tdCls} text-center`}>{nUsers}</td>
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
              editTarget === 'new' ? { label, perms } : { id: (editTarget as Role).id, label, perms },
              { onSuccess: () => setEditTarget(null) }
            )
          }}
          loading={saveRole.isPending}
        />
      )}
    </>
  )
}

function RoleForm({ role, onClose, onSave, loading }: { role: Role | null; onClose: () => void; onSave: (label: string, perms: RolePerms) => void; loading: boolean }) {
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
              <label key={d.k} className="flex gap-2.5 items-start cursor-pointer text-[13px] text-[var(--text-primary)]">
                <input type="checkbox" className="mt-0.5 w-4 h-4 cursor-pointer flex-none"
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

  const handleDelete = (u: UserProfileWithRole) => {
    if (u.id === currentUser?.id) { alert('You cannot delete your own account.'); return }
    if (!window.confirm(`Delete user "${u.username}"?`)) return
    deleteUser.mutate(u.id)
  }

  const thCls = 'bg-[var(--surface-2)] text-left px-3 py-2.5 font-[650] text-[var(--text-secondary)] text-[11px] uppercase tracking-wide border-b border-[var(--border)]'
  const tdCls = 'px-3.5 py-2.5 border-b border-[var(--border)] text-[12.5px]'

  return (
    <>
      <Banner>Each person signs in with their own username &amp; password. Assign a <b>Role</b> and set <b>AE access</b> for client visibility.</Banner>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden mb-4" style={{ maxHeight: '44vh', overflowY: 'auto' }}>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={thCls}>Username</th>
            <th className={thCls}>Name</th>
            <th className={thCls}>Role</th>
            <th className={thCls}>Client access</th>
            <th className={`${thCls} text-right`}>Actions</th>
          </tr></thead>
          <tbody>
            {users.map(u => {
              const rl = u.role
              const aeAccess = (rl?.perms?.viewClient)
                ? 'All clients'
                : [...(u.ae_code ? [u.ae_code] : []), ...(u.approved_aes ?? [])].filter(Boolean).join(', ') || '—'
              return (
                <tr key={u.id}>
                  <td className={`${tdCls} font-mono font-semibold`}>{u.username}</td>
                  <td className={tdCls}>{u.display_name || <span className="text-[var(--text-muted)]">—</span>}</td>
                  <td className={tdCls}>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[650] bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      {rl?.label ?? u.role_key}
                    </span>
                  </td>
                  <td className={`${tdCls} text-[11.5px] text-[var(--text-muted)]`}>{aeAccess}</td>
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
              await updateUser.mutateAsync({ id: (editTarget as UserProfileWithRole).id, ...data })
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
  roles: Role[]; aes: string[]
  onClose: () => void
  onSave: (data: { email: string; display_name: string; role_key: string; password: string; ae_code: string | null; approved_aes: string[] }) => Promise<void>
  loading: boolean
}) {
  const isEdit = !!user
  const [email,       setEmail]       = useState(user ? `${user.username}@esprintmedia.com` : '')
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [roleKey,     setRoleKey]     = useState(user?.role_key ?? roles[0]?.key ?? '')
  const [password,    setPassword]    = useState('')
  const [aeCode,      setAeCode]      = useState(user?.ae_code ?? '')
  const [approvedAEs, setApprovedAEs] = useState<string[]>(user?.approved_aes ?? [])
  const [err,         setErr]         = useState('')

  const toggleAE = (ae: string) => setApprovedAEs(prev => prev.includes(ae) ? prev.filter(a => a !== ae) : [...prev, ae])

  const handleSave = async () => {
    if (!email.trim()) {
      setErr('Please enter an email.')
      return
    }
    if (!isEdit && !password) {
      setErr('Please set a password.')
      return
    }
    if (!isEdit && password.length < 6) {
      setErr('Password must be at least 6 characters.')
      return
    }
    setErr('')
    try {
      await onSave({ email, display_name: displayName, role_key: roleKey, password, ae_code: aeCode || null, approved_aes: approvedAEs })
    } catch (e: any) {
      setErr(e?.message || 'Failed to save user.')
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
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Full name" />
          </Field>
        </Grid2>
        <Grid2>
          <Field label="Role" required>
            <Select value={roleKey} onChange={e => setRoleKey(e.target.value)}>
              {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label={isEdit ? 'Password (blank = keep)' : 'Password'} required={!isEdit}>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? '••••••' : 'Set a password'} autoComplete="new-password" />
          </Field>
        </Grid2>
        <Banner>
          Set an <b>Own AE code</b> for Account Executives. Pick <b>Approved AEs</b> for Managers / Team Leaders. Full-access roles see all clients.
        </Banner>
        <Grid2>
          <Field label="Own AE code" hint="For Account Executives — their own AE.">
            <Select value={aeCode} onChange={e => setAeCode(e.target.value)}>
              <option value="">— none —</option>
              {aes.map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="Approved AEs (multi-select)">
            <div className="flex flex-col gap-1.5 bg-[var(--surface-0)] border border-[var(--border)] rounded-[9px] p-2.5 max-h-28 overflow-y-auto">
              {aes.map(a => (
                <label key={a} className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={approvedAEs.includes(a)} onChange={() => toggleAE(a)} className="cursor-pointer" />
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
