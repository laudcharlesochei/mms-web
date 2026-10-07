import type { MeetingFormat, ProgressStatus, Role, StudentStatus } from '@/api/types';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00Z') : new Date(iso);
  return isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : dateTimeFmt.format(d);
}

/** Today's date in the UK as yyyy-mm-dd. */
export function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrator',
  DIRECTOR: 'Programme Director',
  PROG_LEAD: 'Programme Lead',
  AOS: 'Advisor of Studies',
  STUDENT: 'Student',
};

export const statusLabels: Record<ProgressStatus, string> = {
  ON_TRACK: 'On track',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  CONCERN: 'Concern',
};

export const formatLabels: Record<MeetingFormat, string> = {
  IN_PERSON: 'In person',
  ONLINE: 'Online',
  PHONE: 'Phone',
};

export const studentStatusLabels: Record<StudentStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  WITHDRAWN: 'Withdrawn',
  COMPLETED: 'Completed',
};
