import {
  Badge, Button, Card, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input,
  makeStyles, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Select, Text, tokens,
} from '@fluentui/react-components';
import { Add20Regular, MoreHorizontal20Regular, Warning16Filled } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorBox, Loading } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { StatusBadge } from '@/components/StatusBadge';
import { StudentFormDialog } from '@/components/StudentFormDialog';
import { useYear } from '@/components/YearContext';
import { formatDate, formatLabels, studentStatusLabels, todayIso } from '@/lib/format';

const useStyles = makeStyles({
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' },
  card: { padding: '16px' },
  dl: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', marginTop: '10px' },
  key: { color: tokens.colorNeutralForeground3 },
  h2: { margin: '8px 0 10px' },
});

/** S5 Student record: details, mentor, AoS history, timeline of meetings newest first (FR-17). */
export function StudentPage() {
  const s = useStyles();
  const { id } = useParams();
  const studentId = Number(id);
  const navigate = useNavigate();
  const notify = useNotify();
  const qc = useQueryClient();
  const { me, hasRole } = useAuth();
  const { years } = useYear();
  const [editOpen, setEditOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [aosId, setAosId] = useState('');
  const [yearId, setYearId] = useState('');
  const [from, setFrom] = useState(todayIso());

  const detail = useQuery({ queryKey: ['student', studentId], queryFn: () => endpoints.student(studentId) });
  const meetings = useQuery({ queryKey: ['studentMeetings', studentId], queryFn: () => endpoints.studentMeetings(studentId) });
  const canManage = hasRole('ADMIN', 'DIRECTOR', 'PROG_LEAD');
  const staff = useQuery({ queryKey: ['staff', 'AOS'], queryFn: () => endpoints.staff('AOS'), enabled: reassignOpen });

  const reassign = useMutation({
    mutationFn: () => endpoints.reassign(studentId, { aosUserId: Number(aosId), academicYearId: yearId ? Number(yearId) : undefined, effectiveFrom: from }),
    onSuccess: () => {
      notify('Advisor of Studies reassigned', 'success', 'Allocation history has been kept.');
      setReassignOpen(false);
      qc.invalidateQueries();
    },
  });
  const erase = useMutation({
    mutationFn: () => endpoints.eraseStudent(studentId),
    onSuccess: () => {
      notify('Student and their records erased');
      qc.invalidateQueries();
      navigate('/students');
    },
    onError: (e) => notify('Could not erase', 'error', errorMessage(e)),
  });
  const exportSar = async () => {
    try {
      const data = await endpoints.subjectAccess(studentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `subject-access-${detail.data?.student.matricNo || studentId}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      notify('Export failed', 'error', errorMessage(e));
    }
  };

  if (detail.isLoading) return <Loading />;
  if (detail.error) return <ErrorBox error={detail.error} title="Cannot open this student" />;
  if (!detail.data) return null;
  const { student: st, mentor, employer, allocations, currentProgress } = detail.data;
  const iAmAdvisor = !!me && st.aosUserId === me.id;

  return (
    <>
      <PageHeader title={st.fullName} subtitle={`${st.matricNo} · ${st.programmeName}`}
        actions={
          <>
            {iAmAdvisor && <Button appearance="primary" icon={<Add20Regular />} onClick={() => navigate(`/meetings/new?studentId=${st.id}`)}>New meeting</Button>}
            {canManage && <Button onClick={() => setEditOpen(true)}>Edit</Button>}
            {canManage && <Button onClick={() => setReassignOpen(true)}>Reassign AoS</Button>}
            {hasRole('ADMIN') && (
              <Menu>
                <MenuTrigger disableButtonEnhancement><Button icon={<MoreHorizontal20Regular />} aria-label="More actions" /></MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={() => void exportSar()}>Subject access export (JSON)</MenuItem>
                    <MenuItem onClick={() => setEraseOpen(true)}>Erase student (data subject request)</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}
          </>
        } />

      <div className={s.grid}>
        <Card className={s.card}>
          <Text weight="semibold" size={400}>Details</Text>
          <div className={s.dl}>
            <Text className={s.key}>Status</Text><Text>{studentStatusLabels[st.status]}</Text>
            <Text className={s.key}>Email</Text><Text>{st.uniEmail || '—'}</Text>
            <Text className={s.key}>Year of study</Text><Text>{st.yearOfStudy ?? '—'}</Text>
            <Text className={s.key}>Advisor of Studies</Text><Text>{st.aosName || 'Not allocated'}</Text>
          </div>
        </Card>
        <Card className={s.card}>
          <Text weight="semibold" size={400}>Employer and mentor</Text>
          <div className={s.dl}>
            <Text className={s.key}>Employer</Text><Text>{employer?.name || '—'}</Text>
            <Text className={s.key}>Mentor</Text><Text>{mentor?.fullName || '—'}</Text>
            <Text className={s.key}>Mentor email</Text><Text>{mentor?.email || '—'}</Text>
            <Text className={s.key}>Mentor phone</Text><Text>{mentor?.phone || '—'}</Text>
          </div>
        </Card>
        <Card className={s.card}>
          <Text weight="semibold" size={400}>This year</Text>
          {currentProgress ? (
            <div className={s.dl}>
              <Text className={s.key}>Status</Text><span><StatusBadge status={currentProgress.status} /></span>
              <Text className={s.key}>Meetings</Text><Text>{currentProgress.meetingsDone} of {currentProgress.meetingsRequired}</Text>
              <Text className={s.key}>Last meeting</Text><Text>{formatDate(currentProgress.lastMeetingDate)}</Text>
            </div>
          ) : <Text block style={{ marginTop: 8 }}>No allocation in the current academic year.</Text>}
        </Card>
      </div>

      <Text as="h2" size={500} weight="semibold" className={s.h2} block>Meetings</Text>
      <ErrorBox error={meetings.error} />
      <SimpleTable label="Meetings, newest first" rows={meetings.data || []} rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/meetings/${r.id}`)} empty="No meetings recorded yet."
        columns={[
          { key: 'date', header: 'Date', render: (r) => <Text weight="semibold">{formatDate(r.meetingDate)}</Text>, sortValue: (r) => r.meetingDate },
          { key: 'aos', header: 'Advisor of Studies', render: (r) => r.aosName },
          { key: 'format', header: 'Format', render: (r) => (r.format ? formatLabels[r.format] : '—') },
          { key: 'concern', header: 'Concern', render: (r) => (r.concernFlag ? <Badge appearance="outline" color="danger" icon={<Warning16Filled />}>Concern</Badge> : 'No') },
          { key: 'status', header: 'Status', render: (r) => (r.status === 'DRAFT' ? <Badge appearance="tint" color="informative">Draft</Badge> : 'Submitted') },
        ]} />

      <Text as="h2" size={500} weight="semibold" className={s.h2} block style={{ marginTop: 24 }}>Advisor of Studies history</Text>
      <SimpleTable label="Allocation history" rows={allocations} rowKey={(r) => r.id} empty="No allocations."
        columns={[
          { key: 'year', header: 'Academic year', render: (r) => r.academicYearLabel },
          { key: 'aos', header: 'Advisor of Studies', render: (r) => r.aosName },
          { key: 'from', header: 'From', render: (r) => formatDate(r.validFrom) },
          { key: 'to', header: 'To', render: (r) => (r.validTo ? formatDate(r.validTo) : 'Current') },
          { key: 'src', header: 'Source', render: (r) => r.source.toLowerCase() },
        ]} />

      <StudentFormDialog open={editOpen} student={st} onClose={() => setEditOpen(false)} />

      <Dialog open={reassignOpen} onOpenChange={(_, d) => setReassignOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reassign Advisor of Studies</DialogTitle>
            <DialogContent style={{ display: 'grid', gap: 12 }}>
              <ErrorBox error={reassign.error} />
              <Field label="New Advisor of Studies" required>
                <Select value={aosId} onChange={(_, d) => setAosId(d.value)}>
                  <option value="">Choose…</option>
                  {staff.data?.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
                </Select>
              </Field>
              <Field label="Academic year">
                <Select value={yearId} onChange={(_, d) => setYearId(d.value)}>
                  <option value="">Current year</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </Select>
              </Field>
              <Field label="Effective from"><Input type="date" value={from} onChange={(_, d) => setFrom(d.value)} /></Field>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReassignOpen(false)}>Cancel</Button>
              <Button appearance="primary" disabled={!aosId || reassign.isPending} onClick={() => reassign.mutate()}>Reassign</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <ConfirmDialog open={eraseOpen} danger busy={erase.isPending} title="Erase this student?" confirmLabel="Erase permanently"
        onCancel={() => setEraseOpen(false)} onConfirm={() => { setEraseOpen(false); erase.mutate(); }}>
        This permanently deletes the student, their allocations and every meeting record. Use only for a valid erasure request.
        Export the subject-access file first if it is needed.
      </ConfirmDialog>
    </>
  );
}
