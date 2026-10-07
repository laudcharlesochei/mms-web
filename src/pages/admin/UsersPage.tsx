import {
  Badge, Button, Checkbox, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input,
  Switch, Text,
} from '@fluentui/react-components';
import { Add20Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { Role, User } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { formatDateTime, roleLabels } from '@/lib/format';

const ROLES: Role[] = ['ADMIN', 'DIRECTOR', 'PROG_LEAD', 'AOS', 'STUDENT'];

/** S8 Users and roles (FR-03). */
export function UsersPage() {
  const qc = useQueryClient();
  const notify = useNotify();
  const { publicConfig } = useAuth();
  const local = publicConfig?.authMode === 'local';
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const users = useQuery({ queryKey: ['users', q], queryFn: () => endpoints.users({ q: q || undefined }) });

  const action = useMutation({
    mutationFn: (f: () => Promise<unknown>) => f(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => notify('Action failed', 'error', errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Users and roles"
        subtitle={local ? 'Local accounts: new users get an invitation to set their password, then enrol two-step verification.'
          : 'Users sign in with Microsoft Entra ID. Roles may also come from Entra app roles.'}
        actions={<Button appearance="primary" icon={<Add20Regular />} onClick={() => setEditing(null)}>Add user</Button>} />
      {inviteLink && (
        <Notice intent="warning" title="Email is disabled — send this invitation link yourself">
          <Text style={{ wordBreak: 'break-all' }}>{inviteLink}</Text>
        </Notice>
      )}
      <Input placeholder="Search name or email" aria-label="Search users" value={q} onChange={(_, d) => setQ(d.value)} style={{ marginBottom: 12, maxWidth: 320, width: '100%' }} />
      {users.isLoading ? <Loading /> : <ErrorBox error={users.error} />}
      <SimpleTable label="Users" rows={users.data || []} rowKey={(r) => r.id} onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'name', header: 'Name', render: (r) => <Text weight="semibold">{r.displayName}</Text>, sortValue: (r) => r.displayName },
          { key: 'email', header: 'Email', render: (r) => r.email, sortValue: (r) => r.email },
          { key: 'roles', header: 'Roles', render: (r) => r.roles.map((x) => roleLabels[x]).join(', ') || '—' },
          { key: 'status', header: 'Status', render: (r) => (r.active ? 'Active' : <Badge color="danger" appearance="tint">Deactivated</Badge>) },
          ...(local ? [{ key: 'mfa', header: 'MFA', render: (r: User) => (r.mfaEnabled ? 'On' : r.hasPassword ? 'Off' : 'Invited') }] : []),
          { key: 'last', header: 'Last sign-in', render: (r) => formatDateTime(r.lastLoginAt), sortValue: (r) => r.lastLoginAt },
          { key: 'act', header: '', render: (r) => local ? (
            <span style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <Button size="small" onClick={() => action.mutate(() => endpoints.inviteUser(r.id).then((x) => {
                if (x.link) setInviteLink(x.link); else notify('Invitation sent');
              }))}>Invite</Button>
              {r.mfaEnabled && <Button size="small" onClick={() => action.mutate(() => endpoints.resetMfa(r.id).then(() => notify('MFA reset')))}>Reset MFA</Button>}
            </span>
          ) : null },
        ]} />
      <UserDialog open={editing !== undefined} user={editing ?? null} local={local} onClose={() => setEditing(undefined)}
        onInviteLink={setInviteLink} />
    </>
  );
}

function UserDialog({ open, user, local, onClose, onInviteLink }: { open: boolean; user: User | null; local: boolean; onClose: () => void; onInviteLink: (l: string) => void }) {
  const qc = useQueryClient();
  const notify = useNotify();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (open) {
      setEmail(user?.email || '');
      setName(user?.displayName || '');
      setRoles(user?.roles || ['AOS']);
      setActive(user ? user.active : true);
    }
  }, [open, user]);
  const save = useMutation({
    mutationFn: async () => {
      if (user) return endpoints.updateUser(user.id, { displayName: name, active, roles });
      const created = await endpoints.createUser({ email, displayName: name, roles, sendInvite: false });
      if (local) {
        const r = await endpoints.inviteUser(created.id).catch(() => null);
        if (r?.link) onInviteLink(r.link);
      }
      return created;
    },
    onSuccess: () => {
      notify(user ? 'User updated' : 'User created');
      void qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });
  const toggle = (r: Role, on: boolean) => setRoles((p) => (on ? [...new Set([...p, r])] : p.filter((x) => x !== r)));
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{user ? 'Edit user' : 'Add user'}</DialogTitle>
          <DialogContent style={{ display: 'grid', gap: 12 }}>
            <ErrorBox error={save.error} title="Could not save" />
            <Field label="Email" required><Input type="email" value={email} disabled={!!user} onChange={(_, d) => setEmail(d.value)} /></Field>
            <Field label="Display name" required><Input value={name} onChange={(_, d) => setName(d.value)} /></Field>
            <Field label="Roles" hint="A user can hold more than one role">
              <div style={{ display: 'grid', gap: 4 }}>
                {ROLES.map((r) => <Checkbox key={r} label={roleLabels[r]} checked={roles.includes(r)} onChange={(_, d) => toggle(r, !!d.checked)} />)}
              </div>
            </Field>
            {user && <Switch label={active ? 'Active' : 'Deactivated'} checked={active} onChange={(_, d) => setActive(d.checked)} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button appearance="primary" disabled={save.isPending || !email || !name} onClick={() => save.mutate()}>Save</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
