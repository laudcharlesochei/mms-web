import { describe, expect, it } from 'vitest';
import { todayIso } from '@/lib/format';
import { meetingSchema, submitErrors, type MeetingFormValues } from '@/lib/meetingSchema';

const base: MeetingFormValues = {
  meetingDate: todayIso(), format: 'ONLINE', studentPresent: true, mentorPresent: false, mentorId: '',
  workActivities: 'Building ETL jobs', universityProgress: '', universityFeedback: '', trainingOpportunities: '', agreedActions: '',
  concernFlag: false, concernNote: '', nextMeetingDate: '',
};

describe('meeting form rules (Section 8.2)', () => {
  it('accepts a complete meeting', () => {
    expect(meetingSchema.safeParse(base).success).toBe(true);
    expect(submitErrors(base)).toEqual({});
  });

  it('rejects a future meeting date', () => {
    const r = meetingSchema.safeParse({ ...base, meetingDate: '2999-01-01' });
    expect(r.success).toBe(false);
  });

  it('requires next meeting after the meeting date', () => {
    const r = meetingSchema.safeParse({ ...base, meetingDate: '2026-10-01', nextMeetingDate: '2026-09-30' });
    expect(r.success).toBe(false);
  });

  it('limits notes to 2,000 characters', () => {
    expect(meetingSchema.safeParse({ ...base, agreedActions: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('on submit needs format, an attendee, one notes field and a concern note', () => {
    const e = submitErrors({ ...base, format: '', studentPresent: false, workActivities: ' ', concernFlag: true });
    expect(Object.keys(e).sort()).toEqual(['concernNote', 'format', 'studentPresent', 'workActivities']);
  });
});
