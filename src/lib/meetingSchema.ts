import { z } from 'zod';
import { todayIso } from './format';

export const NOTES_FIELDS = ['workActivities', 'universityProgress', 'universityFeedback', 'trainingOpportunities', 'agreedActions'] as const;

const notes = z.string().max(2000, 'At most 2,000 characters');

/**
 * Browser-side validation for the meeting form (Section 8.2). The API re-validates as the authority.
 * These rules apply to drafts too; submitErrors() adds the rules that apply only on submit.
 */
export const meetingSchema = z
  .object({
    meetingDate: z.string().min(1, 'Meeting date is required'),
    format: z.enum(['', 'IN_PERSON', 'ONLINE', 'PHONE']),
    studentPresent: z.boolean(),
    mentorPresent: z.boolean(),
    mentorId: z.string(),
    workActivities: notes,
    universityProgress: notes,
    universityFeedback: notes,
    trainingOpportunities: notes,
    agreedActions: notes,
    concernFlag: z.boolean(),
    concernNote: z.string().max(500, 'At most 500 characters'),
    nextMeetingDate: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.meetingDate && v.meetingDate > todayIso()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meetingDate'], message: 'Meeting date cannot be in the future' });
    }
    if (v.nextMeetingDate && v.meetingDate && v.nextMeetingDate <= v.meetingDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nextMeetingDate'], message: 'Must be after the meeting date' });
    }
  });

export type MeetingFormValues = z.infer<typeof meetingSchema>;

/** Extra rules on submit: format, at least one attendee, at least one notes field, note when concern flagged. */
export function submitErrors(v: MeetingFormValues): Partial<Record<keyof MeetingFormValues, string>> {
  const e: Partial<Record<keyof MeetingFormValues, string>> = {};
  if (!v.format) e.format = 'Choose in person, online or phone';
  if (!v.studentPresent && !v.mentorPresent) e.studentPresent = 'Tick at least one attendee';
  if (!NOTES_FIELDS.some((f) => v[f].trim().length > 0)) e.workActivities = 'Write something in at least one notes field';
  if (v.concernFlag && !v.concernNote.trim()) e.concernNote = 'Add a note explaining the engagement concern';
  return e;
}
