import {
  Button, Card, Checkbox, Field, makeStyles, Radio, RadioGroup, Select, Switch, Text, Textarea, tokens, Input,
} from '@fluentui/react-components';
import { Save20Regular, Send20Regular } from '@fluentui/react-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, newId } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { Meeting, MeetingFormat, MeetingRequest } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { MeetingReadOnly } from '@/components/MeetingReadOnly';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, todayIso } from '@/lib/format';
import { NOTES_FIELDS, meetingSchema, submitErrors, type MeetingFormValues } from '@/lib/meetingSchema';

const useStyles = makeStyles({
  layout: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '20px', alignItems: 'start',
    '@media (max-width: 1100px)': { gridTemplateColumns: '1fr' },
  },
  previous: { order: 2, '@media (max-width: 1100px)': { order: -1 } },
  card: { padding: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  readonly: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 16px', padding: '12px',
    backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium,
  },
  key: { display: 'block', color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap', position: 'sticky', bottom: 0, padding: '12px 0', backgroundColor: tokens.colorNeutralBackground1 },
  counter: { color: tokens.colorNeutralForeground3 },
});

const LABELS: Record<(typeof NOTES_FIELDS)[number], string> = {
  workActivities: 'Activities at work',
  universityProgress: 'How university is going',
  universityFeedback: 'Feedback about the university',
  trainingOpportunities: 'Training opportunities at work',
  agreedActions: 'Agreed actions / next steps',
};

function toRequest(v: MeetingFormValues, studentId: number, status: 'DRAFT' | 'SUBMITTED', extra: Partial<MeetingRequest> = {}): MeetingRequest {
  const t = (x: string) => (x.trim() ? x.trim() : null);
  return {
    studentId,
    meetingDate: v.meetingDate || null,
    format: (v.format || null) as MeetingFormat | null,
    studentPresent: v.studentPresent,
    mentorPresent: v.mentorPresent,
    mentorId: v.mentorId ? Number(v.mentorId) : null,
    workActivities: t(v.workActivities),
    universityProgress: t(v.universityProgress),
    universityFeedback: t(v.universityFeedback),
    trainingOpportunities: t(v.trainingOpportunities),
    agreedActions: t(v.agreedActions),
    concernFlag: v.concernFlag,
    concernNote: v.concernFlag ? t(v.concernNote) : null,
    nextMeetingDate: v.nextMeetingDate || null,
    status,
    ...extra,
  };
}

function fromMeeting(m: Meeting): MeetingFormValues {
  return {
    meetingDate: m.meetingDate || '',
    format: m.format || '',
    studentPresent: m.studentPresent,
    mentorPresent: m.mentorPresent,
    mentorId: m.mentorId ? String(m.mentorId) : '',
    workActivities: m.workActivities || '',
    universityProgress: m.universityProgress || '',
    universityFeedback: m.universityFeedback || '',
    trainingOpportunities: m.trainingOpportunities || '',
    agreedActions: m.agreedActions || '',
    concernFlag: m.concernFlag,
    concernNote: m.concernNote || '',
    nextMeetingDate: m.nextMeetingDate || '',
  };
}

/** S3 New / edit meeting: the form on the left, the previous meeting read-only on the right (FR-10 to FR-16). */
export function MeetingFormPage() {
  const s = useStyles();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const qc = useQueryClient();
  const { me } = useAuth();
  const editingId = id ? Number(id) : null;

  const existing = useQuery({ queryKey: ['meeting', editingId], queryFn: () => endpoints.meeting(editingId!), enabled: !!editingId });
  const studentId = editingId ? existing.data?.studentId : Number(params.get('studentId'));
  const student = useQuery({ queryKey: ['student', studentId], queryFn: () => endpoints.student(studentId!), enabled: !!studentId });
  const previous = useQuery({
    queryKey: ['latest', studentId, editingId],
    queryFn: () => endpoints.latestMeeting(studentId!, editingId ?? undefined),
    enabled: !!studentId,
  });

  const [meetingId, setMeetingId] = useState<number | null>(editingId);
  const [version, setVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const requestId = useRef(newId());
  const [showPrevious, setShowPrevious] = useState(() => !window.matchMedia?.('(max-width: 1100px)').matches);

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    mode: 'onBlur',
    defaultValues: {
      meetingDate: todayIso(), format: '', studentPresent: true, mentorPresent: false, mentorId: '',
      workActivities: '', universityProgress: '', universityFeedback: '', trainingOpportunities: '', agreedActions: '',
      concernFlag: false, concernNote: '', nextMeetingDate: '',
    },
  });
  const { control, handleSubmit, watch, reset, setError: setFieldError, formState } = form;

  // load an existing record into the form
  useEffect(() => {
    if (existing.data) {
      reset(fromMeeting(existing.data));
      setVersion(existing.data.version);
      setStatus(existing.data.status);
    }
  }, [existing.data, reset]);

  // default mentor from the student record
  useEffect(() => {
    if (!editingId && student.data?.student.mentorId && !form.getValues('mentorId')) {
      form.setValue('mentorId', String(student.data.student.mentorId));
    }
  }, [student.data, editingId, form]);

  const save = useCallback(
    async (v: MeetingFormValues, target: 'DRAFT' | 'SUBMITTED', opts: { silent?: boolean; confirmDuplicate?: boolean } = {}) => {
      if (!studentId) return null;
      const req = toRequest(v, studentId, target, { confirmDuplicate: opts.confirmDuplicate, clientRequestId: meetingId ? undefined : requestId.current });
      const saved = meetingId && version !== null
        ? await endpoints.updateMeeting(meetingId, req, version)
        : await endpoints.createMeeting(req);
      setMeetingId(saved.id);
      setVersion(saved.version);
      setStatus(saved.status);
      setSavedAt(saved.updatedAt);
      reset(v, { keepValues: true });
      if (!opts.silent) qc.invalidateQueries();
      return saved;
    },
    [studentId, meetingId, version, reset, qc],
  );

  const applyServerErrors = (e: unknown) => {
    if (e instanceof ApiError && e.status === 400 && e.errors) {
      Object.entries(e.errors).forEach(([k, msg]) => {
        const key = (k === 'present' ? 'studentPresent' : k === 'notes' ? 'workActivities' : k) as keyof MeetingFormValues;
        setFieldError(key, { message: msg });
      });
    }
    setError(e);
  };

  const onDraft = handleSubmit(async (v) => {
    setBusy(true);
    setError(null);
    try {
      await save(v, status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT');
      notify(status === 'SUBMITTED' ? 'Amendment saved' : 'Draft saved');
    } catch (e) {
      applyServerErrors(e);
    } finally {
      setBusy(false);
    }
  });

  const doSubmit = async (v: MeetingFormValues, confirmDuplicate = false) => {
    const errs = submitErrors(v);
    if (Object.keys(errs).length) {
      Object.entries(errs).forEach(([k, msg]) => setFieldError(k as keyof MeetingFormValues, { message: msg }));
      setError(new Error('Please complete the highlighted fields before submitting.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await save(v, 'SUBMITTED', { confirmDuplicate });
      notify('Meeting submitted', 'success', 'The record is saved centrally.');
      if (saved) navigate(`/meetings/${saved.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'duplicate-meeting') setDuplicate(true);
      else applyServerErrors(e);
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = handleSubmit((v) => doSubmit(v));

  // autosave the draft every 60 s while there are unsaved changes (Section 8.4)
  const dirty = formState.isDirty;
  useEffect(() => {
    if (status !== 'DRAFT') return;
    const t = window.setInterval(() => {
      if (dirty && !busy) {
        const v = form.getValues();
        if (meetingSchema.safeParse(v).success) {
          save(v, 'DRAFT', { silent: true }).then(() => setSavedAt(new Date().toISOString())).catch(() => undefined);
        }
      }
    }, 60_000);
    return () => window.clearInterval(t);
  }, [dirty, busy, status, save, form]);

  if ((editingId && existing.isLoading) || student.isLoading) return <Loading />;
  if (existing.error) return <ErrorBox error={existing.error} />;
  if (student.error) return <ErrorBox error={student.error} />;
  if (!studentId || !student.data) return <Notice intent="warning">Choose an advisee from My advisees to start a meeting.</Notice>;
  if (existing.data && !existing.data.canEdit) {
    return <Notice intent="warning" title="This record cannot be edited">The edit window has closed or you are not the author.</Notice>;
  }

  const st = student.data.student;
  const concern = watch('concernFlag');
  const values = watch();
  const amending = status === 'SUBMITTED';

  return (
    <>
      <PageHeader
        title={amending ? 'Amend meeting' : editingId || meetingId ? 'Edit draft meeting' : 'New mentor meeting'}
        subtitle={savedAt ? `Saved ${formatDateTime(savedAt)}` : amending ? 'Changes are versioned and audited.' : 'Save a draft at any point and come back later.'}
      />
      <div className={s.layout}>
        <Card className={s.card}>
          <form className={s.form} onSubmit={(e) => e.preventDefault()} noValidate aria-label="Mentor meeting form">
            <ErrorBox error={error} title="Could not save" />
            <div className={s.readonly}>
              <div><span className={s.key}>Student</span><Text weight="semibold">{st.fullName} ({st.matricNo})</Text></div>
              <div><span className={s.key}>Programme</span><Text>{st.programmeName}</Text></div>
              <div><span className={s.key}>Employer</span><Text>{st.employerName || '—'}</Text></div>
              <div><span className={s.key}>Advisor of Studies</span><Text>{existing.data?.aosName || me?.displayName}</Text></div>
            </div>

            <div className={s.row}>
              <Controller name="meetingDate" control={control} render={({ field, fieldState }) => (
                <Field label="Meeting date" required validationMessage={fieldState.error?.message}>
                  <Input type="date" max={todayIso()} value={field.value} onChange={(_, d) => field.onChange(d.value)} onBlur={field.onBlur} />
                </Field>
              )} />
              <Controller name="mentorId" control={control} render={({ field }) => (
                <Field label="Workplace mentor" hint="Change if a different mentor attended">
                  <Select value={field.value} onChange={(_, d) => field.onChange(d.value)}>
                    <option value="">— none —</option>
                    {student.data!.employerMentors.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </Select>
                </Field>
              )} />
            </div>

            <Controller name="format" control={control} render={({ field, fieldState }) => (
              <Field label="Format" required validationMessage={fieldState.error?.message}>
                <RadioGroup layout="horizontal" value={field.value} onChange={(_, d) => field.onChange(d.value)}>
                  <Radio value="IN_PERSON" label="In person" />
                  <Radio value="ONLINE" label="Online" />
                  <Radio value="PHONE" label="Phone" />
                </RadioGroup>
              </Field>
            )} />

            <Field label="Present (tick at least one)" validationMessage={formState.errors.studentPresent?.message}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Controller name="studentPresent" control={control} render={({ field }) => (
                  <Checkbox label="Student" checked={field.value} onChange={(_, d) => field.onChange(!!d.checked)} />
                )} />
                <Controller name="mentorPresent" control={control} render={({ field }) => (
                  <Checkbox label="Workplace mentor" checked={field.value} onChange={(_, d) => field.onChange(!!d.checked)} />
                )} />
              </div>
            </Field>

            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              Keep notes short and factual. Do not record health or other special-category information.
            </Text>

            {NOTES_FIELDS.map((name) => (
              <Controller key={name} name={name} control={control} render={({ field, fieldState }) => (
                <Field label={LABELS[name]} validationMessage={fieldState.error?.message}
                  hint={<span className={s.counter}>{field.value.length} / 2,000</span>}>
                  <Textarea resize="vertical" rows={3} maxLength={2000} value={field.value}
                    onChange={(_, d) => field.onChange(d.value)} onBlur={field.onBlur} />
                </Field>
              )} />
            ))}

            <Controller name="concernFlag" control={control} render={({ field }) => (
              <Switch label="Engagement concern" checked={field.value} onChange={(_, d) => field.onChange(d.checked)} />
            )} />
            {concern && (
              <Controller name="concernNote" control={control} render={({ field, fieldState }) => (
                <Field label="Concern note" required validationMessage={fieldState.error?.message}
                  hint={<span className={s.counter}>{field.value.length} / 500</span>}>
                  <Textarea rows={2} maxLength={500} value={field.value} onChange={(_, d) => field.onChange(d.value)} />
                </Field>
              )} />
            )}

            <Controller name="nextMeetingDate" control={control} render={({ field, fieldState }) => (
              <Field label="Proposed next meeting" validationMessage={fieldState.error?.message} style={{ maxWidth: 260 }}>
                <Input type="date" min={values.meetingDate || undefined} value={field.value} onChange={(_, d) => field.onChange(d.value)} />
              </Field>
            )} />

            <div className={s.actions}>
              {!amending && (
                <Button appearance="primary" icon={<Send20Regular />} onClick={() => void onSubmit()} disabled={busy}>Submit</Button>
              )}
              <Button icon={<Save20Regular />} onClick={() => void onDraft()} disabled={busy} appearance={amending ? 'primary' : 'secondary'}>
                {amending ? 'Save amendment' : 'Save draft'}
              </Button>
              <Button appearance="subtle" onClick={() => navigate(-1)} disabled={busy}>Cancel</Button>
            </div>
          </form>
        </Card>

        <aside className={s.previous} aria-label="Previous meeting">
          <Card className={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text as="h2" size={500} weight="semibold">Previous meeting</Text>
              <Button size="small" appearance="subtle" aria-expanded={showPrevious} onClick={() => setShowPrevious((x) => !x)}>
                {showPrevious ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showPrevious && previous.isLoading && <Loading />}
            {!showPrevious ? null : previous.data ? (
              <div style={{ marginTop: 12 }}><MeetingReadOnly m={previous.data} compact /></div>
            ) : !previous.isLoading && (
              <Text block style={{ marginTop: 8, color: tokens.colorNeutralForeground3 }}>No previous meeting recorded for this student.</Text>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog open={duplicate} title="A meeting already exists on this date" confirmLabel="Record another"
        onCancel={() => setDuplicate(false)}
        onConfirm={() => { setDuplicate(false); void doSubmit(form.getValues(), true); }}>
        A submitted meeting for {st.fullName} is already recorded on this date. Record another one anyway?
      </ConfirmDialog>
    </>
  );
}
