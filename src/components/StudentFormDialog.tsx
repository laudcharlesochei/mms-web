import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input, Select } from '@fluentui/react-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { StudentStatus, StudentSummary } from '@/api/types';
import { studentStatusLabels } from '@/lib/format';
import { ErrorBox } from './Feedback';
import { useNotify } from './Notify';

const empty = { matricNo: '', firstName: '', lastName: '', uniEmail: '', programmeId: '', employerId: '', mentorId: '', yearOfStudy: '', status: 'ACTIVE' };

export function StudentFormDialog({ open, student, onClose }: { open: boolean; student: StudentSummary | null; onClose: () => void }) {
  const qc = useQueryClient();
  const notify = useNotify();
  const [v, setV] = useState(empty);
  const programmes = useQuery({ queryKey: ['programmes'], queryFn: endpoints.programmes, enabled: open });
  const employers = useQuery({ queryKey: ['employers'], queryFn: endpoints.employers, enabled: open });
  const mentors = useQuery({ queryKey: ['mentors', v.employerId], queryFn: () => endpoints.mentors(Number(v.employerId)), enabled: open && !!v.employerId });

  useEffect(() => {
    if (open) {
      setV(student ? {
        matricNo: student.matricNo, firstName: student.firstName, lastName: student.lastName, uniEmail: student.uniEmail || '',
        programmeId: String(student.programmeId), employerId: student.employerId ? String(student.employerId) : '',
        mentorId: student.mentorId ? String(student.mentorId) : '', yearOfStudy: student.yearOfStudy ? String(student.yearOfStudy) : '',
        status: student.status,
      } : empty);
    }
  }, [open, student]);

  const save = useMutation({
    mutationFn: () => endpoints.saveStudent(student?.id ?? null, {
      matricNo: v.matricNo.trim(), firstName: v.firstName.trim(), lastName: v.lastName.trim(), uniEmail: v.uniEmail.trim() || null,
      programmeId: Number(v.programmeId), employerId: v.employerId ? Number(v.employerId) : null,
      mentorId: v.mentorId ? Number(v.mentorId) : null, yearOfStudy: v.yearOfStudy ? Number(v.yearOfStudy) : null,
      status: v.status as StudentStatus,
    }),
    onSuccess: () => {
      notify(student ? 'Student updated' : 'Student added');
      qc.invalidateQueries();
      onClose();
    },
  });
  const fe = save.error instanceof ApiError ? save.error.errors : {};
  const set = (k: keyof typeof empty) => (_: unknown, d: { value: string }) => setV((p) => ({ ...p, [k]: d.value, ...(k === 'employerId' ? { mentorId: '' } : {}) }));

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{student ? 'Edit student' : 'Add student'}</DialogTitle>
          <DialogContent style={{ display: 'grid', gap: 12 }}>
            <ErrorBox error={save.error} title="Could not save" />
            <Field label="Matriculation number" required validationMessage={fe.matricNo}><Input value={v.matricNo} onChange={set('matricNo')} /></Field>
            <Field label="First name" required validationMessage={fe.firstName}><Input value={v.firstName} onChange={set('firstName')} /></Field>
            <Field label="Last name" required validationMessage={fe.lastName}><Input value={v.lastName} onChange={set('lastName')} /></Field>
            <Field label="University email" validationMessage={fe.uniEmail}><Input type="email" value={v.uniEmail} onChange={set('uniEmail')} /></Field>
            <Field label="Programme" required>
              <Select value={v.programmeId} onChange={set('programmeId')}>
                <option value="">Choose…</option>
                {programmes.data?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </Select>
            </Field>
            <Field label="Employer">
              <Select value={v.employerId} onChange={set('employerId')}>
                <option value="">— none —</option>
                {employers.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label="Workplace mentor">
              <Select value={v.mentorId} onChange={set('mentorId')} disabled={!v.employerId}>
                <option value="">— none —</option>
                {mentors.data?.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Year of study"><Input type="number" min={1} max={6} value={v.yearOfStudy} onChange={set('yearOfStudy')} /></Field>
            <Field label="Status">
              <Select value={v.status} onChange={set('status')}>
                {Object.entries(studentStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button appearance="primary" disabled={save.isPending || !v.matricNo || !v.firstName || !v.lastName || !v.programmeId}
              onClick={() => save.mutate()}>Save</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
