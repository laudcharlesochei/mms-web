export type Role = 'ADMIN' | 'DIRECTOR' | 'PROG_LEAD' | 'AOS' | 'STUDENT';
export type MeetingFormat = 'IN_PERSON' | 'ONLINE' | 'PHONE';
export type MeetingStatus = 'DRAFT' | 'SUBMITTED';
export type ProgressStatus = 'ON_TRACK' | 'DUE' | 'OVERDUE' | 'CONCERN';
export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'COMPLETED';
export type ImportStatus = 'PREVIEW' | 'COMMITTED' | 'CANCELLED';

export interface PublicConfig {
  authMode: 'local' | 'entra' | 'dev';
  entraTenantId?: string;
  entraClientId?: string;
  entraApiScope?: string;
  messagingEnabled: boolean;
  editWindowDays: number;
  notesMaxLength: number;
  idleTimeoutMinutes: number;
  variant: 'V1' | 'V2';
  storage: string;
}

export interface Me {
  id: number;
  email: string;
  displayName: string;
  roles: Role[];
  mfaEnabled?: boolean;
  authMode: string;
  ledProgrammeIds: number[];
  studentId: number | null;
  scope: string;
  unreadMessages: number;
}

export interface LoginResponse {
  mfaRequired?: boolean;
  challengeToken?: string | null;
  accessToken: string | null;
  refreshToken?: string | null;
  accessExpiresAt: string | null;
  refreshExpiresAt?: string | null;
  mfaSetupRequired?: boolean;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Period {
  id: number;
  seq: number;
  startDate: string;
  endDate: string;
}

export interface AcademicYear {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  requiredMeetings: number;
  current: boolean;
  periods: Period[];
}

export interface Programme {
  id: number;
  code: string;
  name: string;
  leadUserId: number | null;
  leadName: string | null;
  active: boolean;
  studentCount: number;
}

export interface Employer {
  id: number;
  name: string;
  address: string | null;
  active: boolean;
}

export interface Mentor {
  id: number;
  employerId: number;
  employerName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

export interface StudentSummary {
  id: number;
  matricNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  uniEmail: string | null;
  programmeId: number;
  programmeName: string | null;
  employerId: number | null;
  employerName: string | null;
  mentorId: number | null;
  mentorName: string | null;
  yearOfStudy: number | null;
  status: StudentStatus;
  aosUserId: number | null;
  aosName: string | null;
}

export interface Allocation {
  id: number;
  studentId: number;
  aosUserId: number;
  aosName: string | null;
  aosEmail: string | null;
  academicYearId: number;
  academicYearLabel: string | null;
  validFrom: string;
  validTo: string | null;
  source: 'IMPORT' | 'MANUAL' | 'SITS';
}

export interface ProgressRow {
  studentId: number;
  matricNo: string;
  studentName: string;
  programmeId: number;
  programmeCode: string | null;
  programmeName: string | null;
  aosUserId: number;
  aosName: string | null;
  employerName: string | null;
  mentorName: string | null;
  meetingsDone: number;
  meetingsRequired: number;
  lastMeetingDate: string | null;
  status: ProgressStatus;
  openConcern: boolean;
  studentStatus: StudentStatus;
}

export interface StudentDetail {
  student: StudentSummary;
  mentor: Mentor | null;
  employer: Employer | null;
  allocations: Allocation[];
  currentProgress: ProgressRow | null;
  employerMentors: Mentor[];
}

export interface Meeting {
  id: number;
  studentId: number;
  studentName: string | null;
  matricNo: string | null;
  programmeName: string | null;
  employerName: string | null;
  aosUserId: number;
  aosName: string | null;
  aosEmail: string | null;
  mentorId: number | null;
  mentorName: string | null;
  academicYearId: number;
  academicYearLabel: string | null;
  periodSeq: number | null;
  meetingDate: string;
  format: MeetingFormat | null;
  studentPresent: boolean;
  mentorPresent: boolean;
  workActivities: string | null;
  universityProgress: string | null;
  universityFeedback: string | null;
  trainingOpportunities: string | null;
  agreedActions: string | null;
  concernFlag: boolean;
  concernNote: string | null;
  nextMeetingDate: string | null;
  status: MeetingStatus;
  submittedAt: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  deleted: boolean;
  deletedAt: string | null;
  deleteReason: string | null;
  canEdit: boolean;
  canDelete: boolean;
  editableUntil: string | null;
}

export interface MeetingSummary {
  id: number;
  studentId: number;
  studentName: string | null;
  meetingDate: string;
  aosName: string | null;
  format: MeetingFormat | null;
  concernFlag: boolean;
  status: MeetingStatus;
  submittedAt: string | null;
  deletedAt: string | null;
  deleteReason: string | null;
}

export interface MeetingRequest {
  studentId: number;
  meetingDate: string | null;
  format: MeetingFormat | null;
  studentPresent: boolean;
  mentorPresent: boolean;
  mentorId: number | null;
  workActivities: string | null;
  universityProgress: string | null;
  universityFeedback: string | null;
  trainingOpportunities: string | null;
  agreedActions: string | null;
  concernFlag: boolean;
  concernNote: string | null;
  nextMeetingDate: string | null;
  status: MeetingStatus;
  confirmDuplicate?: boolean;
  clientRequestId?: string;
}

export interface Revision {
  id: number;
  version: number;
  changedAt: string;
  changedBy: number | null;
  changedByName: string | null;
  snapshotJson: string;
}

export interface DashboardSummary {
  academicYearId: number;
  academicYearLabel: string;
  currentPeriodSeq: number | null;
  students: number;
  meetingsRequired: number;
  meetingsDone: number;
  percentComplete: number;
  zeroMeetings: number;
  openConcerns: number;
  overdue: number;
  due: number;
  onTrack: number;
}

export interface AdvisorRow {
  aosUserId: number;
  aosName: string | null;
  aosEmail: string | null;
  advisees: number;
  meetingsDone: number;
  meetingsRequired: number;
  adviseesOverdue: number;
  adviseesDue: number;
  openConcerns: number;
}

export interface AdviseesResponse {
  summary: DashboardSummary;
  advisees: ProgressRow[];
  drafts: MeetingSummary[];
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  roles: Role[];
  active: boolean;
  mfaEnabled?: boolean;
  entraLinked: boolean;
  hasPassword?: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface ImportRow {
  rowNo: number;
  matricNo: string;
  firstName: string | null;
  lastName: string | null;
  studentEmail: string | null;
  programmeCode: string;
  aosEmail: string;
  employerName: string | null;
  mentorName: string | null;
  mentorEmail: string | null;
  academicYear: string;
  action: 'ADD' | 'UPDATE';
  errors: string[];
}

export interface ImportPreview {
  batchId: number;
  fileName: string;
  status: ImportStatus;
  rowsTotal: number;
  rowsOk: number;
  rowsError: number;
  rowsAdd: number;
  rowsUpdate: number;
  uploadedAt: string;
  committedAt: string | null;
  rows: ImportRow[];
}

export interface ImportBatchSummary {
  id: number;
  fileName: string;
  status: ImportStatus;
  rowsTotal: number;
  rowsOk: number;
  rowsError: number;
  uploadedAt: string;
  uploadedBy: string | null;
}

export interface AuditRow {
  id: number;
  occurredAt: string;
  userId: number | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
}

export interface Contact {
  id: number;
  displayName: string;
  email: string;
  roles: Role[];
  unread: number;
  lastMessageAt: string | null;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
}

export interface ListCount {
  list: string;
  items: number;
  overThreshold: boolean;
}

export interface StorageHealth {
  storage: string;
  connected: boolean;
  siteId: string | null;
  message: string;
  lastThrottledAt: string | null;
  lastThrottleDetail: string | null;
  throttleEvents: number;
  circuitBreakerState: string;
  lists: ListCount[];
  checkedAt: string;
}
