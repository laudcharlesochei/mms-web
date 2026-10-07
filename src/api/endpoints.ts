import { api } from './client';
import type {
  AcademicYear, AdviseesResponse, AdvisorRow, Allocation, AuditRow, Contact, DashboardSummary, Employer,
  ImportBatchSummary, ImportPreview, Me, Meeting, MeetingRequest, MeetingSummary, Mentor, Message, Page,
  Period, Programme, ProgressRow, PublicConfig, Revision, Role, StorageHealth, StudentDetail, StudentSummary, User,
} from './types';

export const endpoints = {
  config: () => api.get<PublicConfig>('/config'),
  me: () => api.get<Me>('/me'),

  advisees: (year?: number) => api.get<AdviseesResponse>('/advisees', { year }),

  students: (q: { programme?: number; aos?: number; status?: string; q?: string; page?: number; size?: number }) =>
    api.get<Page<StudentSummary>>('/students', q),
  student: (id: number) => api.get<StudentDetail>(`/students/${id}`),
  saveStudent: (id: number | null, body: unknown) =>
    id ? api.put<StudentSummary>(`/students/${id}`, body) : api.post<StudentSummary>('/students', body),
  studentMeetings: (id: number) => api.get<MeetingSummary[]>(`/students/${id}/meetings`),
  latestMeeting: (id: number, exclude?: number) => api.get<Meeting | undefined>(`/students/${id}/meetings/latest`, { exclude }),
  reassign: (id: number, body: { aosUserId: number; academicYearId?: number; effectiveFrom?: string }) =>
    api.post<Allocation>(`/students/${id}/allocations`, body),
  subjectAccess: (id: number) => api.get<unknown>(`/students/${id}/subject-access`),
  eraseStudent: (id: number) => api.del<unknown>(`/students/${id}`),

  meeting: (id: number) => api.get<Meeting>(`/meetings/${id}`),
  createMeeting: (body: MeetingRequest) => api.post<Meeting>('/meetings', body),
  updateMeeting: (id: number, body: MeetingRequest, version: number) =>
    api.put<Meeting>(`/meetings/${id}`, body, { 'If-Match': `"${version}"` }),
  deleteMeeting: (id: number, reason: string) => api.del<void>(`/meetings/${id}`, { reason }),
  restoreMeeting: (id: number) => api.post<Meeting>(`/meetings/${id}/restore`),
  revisions: (id: number) => api.get<Revision[]>(`/meetings/${id}/revisions`),
  drafts: () => api.get<MeetingSummary[]>('/meetings/drafts'),
  deletedMeetings: () => api.get<MeetingSummary[]>('/meetings/deleted'),

  dashboardSummary: (q: { year?: number; programme?: number; aos?: number }) => api.get<DashboardSummary>('/dashboard/summary', q),
  dashboardStudents: (q: { year?: number; status?: string; programme?: number; aos?: number; q?: string }) =>
    api.get<ProgressRow[]>('/dashboard/students', q),
  dashboardAdvisors: (q: { year?: number; programme?: number }) => api.get<AdvisorRow[]>('/dashboard/advisors', q),

  programmes: () => api.get<Programme[]>('/programmes'),
  saveProgramme: (id: number | null, body: unknown) =>
    id ? api.put<Programme>(`/programmes/${id}`, body) : api.post<Programme>('/programmes', body),
  employers: () => api.get<Employer[]>('/employers'),
  saveEmployer: (id: number | null, body: unknown) =>
    id ? api.put<Employer>(`/employers/${id}`, body) : api.post<Employer>('/employers', body),
  mentors: (employer?: number) => api.get<Mentor[]>('/mentors', { employer }),
  saveMentor: (id: number | null, body: unknown) =>
    id ? api.put<Mentor>(`/mentors/${id}`, body) : api.post<Mentor>('/mentors', body),
  years: () => api.get<AcademicYear[]>('/academic-years'),
  saveYear: (id: number | null, body: unknown) =>
    id ? api.put<AcademicYear>(`/academic-years/${id}`, body) : api.post<AcademicYear>('/academic-years', body),
  savePeriods: (id: number, periods: Partial<Period>[]) => api.put<AcademicYear>(`/academic-years/${id}/periods`, periods),

  imports: () => api.get<ImportBatchSummary[]>('/imports'),
  importBatch: (id: number) => api.get<ImportPreview>(`/imports/${id}`),
  uploadImport: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<ImportPreview>('/imports/allocations', fd);
  },
  commitImport: (id: number) => api.post<ImportPreview>(`/imports/${id}/commit`),
  cancelImport: (id: number) => api.post<ImportPreview>(`/imports/${id}/cancel`),

  users: (q?: { role?: Role; q?: string }) => api.get<User[]>('/users', q),
  staff: (role?: Role) => api.get<User[]>('/users/staff', { role }),
  createUser: (body: unknown) => api.post<User>('/users', body),
  updateUser: (id: number, body: unknown) => api.put<User>(`/users/${id}`, body),
  resetMfa: (id: number) => api.post<User>(`/users/${id}/reset-mfa`),
  inviteUser: (id: number) => api.post<{ status: string; link?: string }>(`/users/${id}/invite`),

  audit: (q: { from?: string; to?: string; user?: number; entity?: string; action?: string; page?: number; size?: number }) =>
    api.get<Page<AuditRow>>('/audit', q),

  contacts: () => api.get<Contact[]>('/messages/contacts'),
  conversation: (withId: number) => api.get<Message[]>('/messages', { with: withId }),
  sendMessage: (recipientId: number, body: string) => api.post<Message>('/messages', { recipientId, body }),

  storageHealth: () => api.get<StorageHealth>('/admin/health'),
  provision: () => api.post<{ report: string[] }>('/admin/provision'),
};
