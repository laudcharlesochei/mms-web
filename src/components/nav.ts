import type { Role } from '@/api/types';

export interface NavItem {
  to: string;
  label: string;
  roles: Role[] | 'all';
  section?: 'main' | 'admin';
  feature?: 'messaging';
  variant?: 'V1' | 'V2';
}

/** Left menu shows only the items a role may use (Section 8.1). */
export const NAV: NavItem[] = [
  { to: '/advisees', label: 'My advisees', roles: ['AOS', 'DIRECTOR', 'PROG_LEAD'] },
  { to: '/dashboard', label: 'Dashboard', roles: ['DIRECTOR', 'PROG_LEAD', 'ADMIN'] },
  { to: '/students', label: 'Students', roles: ['ADMIN', 'DIRECTOR', 'PROG_LEAD', 'AOS'] },
  { to: '/my-meetings', label: 'My meetings', roles: ['STUDENT'] },
  { to: '/messages', label: 'Messages', roles: 'all', feature: 'messaging' },
  { to: '/admin/data', label: 'Reference data', roles: ['ADMIN', 'DIRECTOR', 'PROG_LEAD'], section: 'admin' },
  { to: '/admin/import', label: 'Import allocations', roles: ['ADMIN', 'DIRECTOR'], section: 'admin' },
  { to: '/admin/users', label: 'Users & roles', roles: ['ADMIN'], section: 'admin' },
  { to: '/admin/audit', label: 'Audit log', roles: ['ADMIN', 'DIRECTOR'], section: 'admin' },
  { to: '/admin/deleted', label: 'Deleted records', roles: ['ADMIN', 'DIRECTOR'], section: 'admin' },
  { to: '/admin/health', label: 'SharePoint health', roles: ['ADMIN'], section: 'admin', variant: 'V2' },
];

export function homeFor(roles: Role[]): string {
  if (roles.includes('AOS')) return '/advisees';
  if (roles.some((r) => r === 'DIRECTOR' || r === 'PROG_LEAD' || r === 'ADMIN')) return '/dashboard';
  if (roles.includes('STUDENT')) return '/my-meetings';
  return '/account';
}
