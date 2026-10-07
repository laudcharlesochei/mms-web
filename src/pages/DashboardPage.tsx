import { Button, Input, makeStyles, Select, Tab, TabList, Text } from '@fluentui/react-components';
import { ArrowDownload20Regular, Search20Regular } from '@fluentui/react-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { download, errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Tiles } from '@/components/Tiles';
import { useYear } from '@/components/YearContext';
import { formatDate, statusLabels } from '@/lib/format';

const useStyles = makeStyles({
  filters: { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '12px 0 14px' },
});

const STATUS_OPTIONS = [
  ['', 'Any status'], ['ON_TRACK', statusLabels.ON_TRACK], ['DUE', statusLabels.DUE], ['OVERDUE', statusLabels.OVERDUE],
  ['CONCERN', statusLabels.CONCERN], ['ZERO', 'No meeting yet'],
];

/** S6 Dashboard (FR-21 to FR-24): tiles, per-student and per-AoS tables, filters, drill-down, CSV export. */
export function DashboardPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const notify = useNotify();
  const { hasRole } = useAuth();
  const { yearId, year } = useYear();
  const [tab, setTab] = useState<'students' | 'advisors'>('students');
  const [programme, setProgramme] = useState('');
  const [aos, setAos] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const filters = { year: yearId, programme: programme ? Number(programme) : undefined, aos: aos ? Number(aos) : undefined };

  const programmes = useQuery({ queryKey: ['programmes'], queryFn: endpoints.programmes });
  const summary = useQuery({ queryKey: ['dash-summary', filters], queryFn: () => endpoints.dashboardSummary(filters), enabled: !!yearId, placeholderData: keepPreviousData });
  const students = useQuery({
    queryKey: ['dash-students', filters, status, q],
    queryFn: () => endpoints.dashboardStudents({ ...filters, status: status || undefined, q: q || undefined }),
    enabled: !!yearId,
    placeholderData: keepPreviousData,
  });
  const advisors = useQuery({ queryKey: ['dash-advisors', yearId, programme], queryFn: () => endpoints.dashboardAdvisors({ year: yearId, programme: filters.programme }), enabled: !!yearId });

  const drill = (st: string) => {
    setStatus((cur) => (cur === st ? '' : st));
    setTab('students');
  };
  const exportCsv = () =>
    download('/dashboard/students/export', 'mms-progress.csv', { ...filters, status: status || undefined, q: q || undefined })
      .catch((e) => notify('Export failed', 'error', errorMessage(e)));

  const sum = summary.data;
  return (
    <>
      <PageHeader title="Dashboard"
        subtitle={sum ? `${sum.academicYearLabel}${sum.currentPeriodSeq ? ` · current period ${sum.currentPeriodSeq}` : ''}` : year?.label}
        actions={hasRole('ADMIN', 'DIRECTOR', 'PROG_LEAD') && <Button icon={<ArrowDownload20Regular />} onClick={exportCsv}>Export CSV</Button>} />
      <ErrorBox error={summary.error} />
      {sum && (
        <Tiles items={[
          { label: 'Students', value: sum.students, onClick: () => drill(''), selected: status === '' },
          { label: 'Meetings done / required', value: `${sum.meetingsDone} / ${sum.meetingsRequired}` },
          { label: '% complete', value: `${sum.percentComplete}%` },
          { label: 'No meeting yet', value: sum.zeroMeetings, onClick: () => drill('ZERO'), selected: status === 'ZERO', tone: sum.zeroMeetings ? 'warning' : undefined },
          { label: 'Overdue', value: sum.overdue, onClick: () => drill('OVERDUE'), selected: status === 'OVERDUE', tone: sum.overdue ? 'danger' : undefined },
          { label: 'Due this period', value: sum.due, onClick: () => drill('DUE'), selected: status === 'DUE', tone: sum.due ? 'warning' : undefined },
          { label: 'Open concerns', value: sum.openConcerns, onClick: () => drill('CONCERN'), selected: status === 'CONCERN', tone: sum.openConcerns ? 'danger' : undefined },
          { label: 'On track', value: sum.onTrack, onClick: () => drill('ON_TRACK'), selected: status === 'ON_TRACK', tone: 'success' },
        ]} />
      )}

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as 'students' | 'advisors')}>
        <Tab value="students">By student</Tab>
        <Tab value="advisors">By Advisor of Studies</Tab>
      </TabList>

      <div className={s.filters}>
        <Select aria-label="Programme" value={programme} onChange={(_, d) => setProgramme(d.value)}>
          <option value="">All programmes</option>
          {programmes.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        {tab === 'students' && (
          <>
            <Select aria-label="Advisor of Studies" value={aos} onChange={(_, d) => setAos(d.value)}>
              <option value="">All advisors</option>
              {advisors.data?.map((a) => <option key={a.aosUserId} value={a.aosUserId}>{a.aosName}</option>)}
            </Select>
            <Select aria-label="Status" value={status} onChange={(_, d) => setStatus(d.value)}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input contentBefore={<Search20Regular />} placeholder="Student name or matric" aria-label="Search" value={q} onChange={(_, d) => setQ(d.value)} />
          </>
        )}
      </div>

      {tab === 'students' ? (
        students.isLoading ? <Loading /> : (
          <>
            <Text size={200} block style={{ marginBottom: 6 }}>{students.data?.length ?? 0} student(s)</Text>
            <SimpleTable label="Progress by student" rows={students.data || []} rowKey={(r) => r.studentId}
              onRowClick={(r) => navigate(`/students/${r.studentId}`)} empty="No students match these filters."
              columns={[
                { key: 'name', header: 'Student', render: (r) => <Text weight="semibold">{r.studentName}</Text>, sortValue: (r) => r.studentName },
                { key: 'prog', header: 'Programme', render: (r) => r.programmeName, sortValue: (r) => r.programmeName },
                { key: 'aos', header: 'Advisor of Studies', render: (r) => r.aosName, sortValue: (r) => r.aosName },
                { key: 'done', header: 'Done / required', render: (r) => `${r.meetingsDone} / ${r.meetingsRequired}`, sortValue: (r) => r.meetingsDone },
                { key: 'last', header: 'Last meeting', render: (r) => formatDate(r.lastMeetingDate), sortValue: (r) => r.lastMeetingDate },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
              ]} />
          </>
        )
      ) : (
        <SimpleTable label="Progress by Advisor of Studies" rows={advisors.data || []} rowKey={(r) => r.aosUserId}
          onRowClick={(r) => { setAos(String(r.aosUserId)); setTab('students'); }}
          columns={[
            { key: 'name', header: 'Advisor of Studies', render: (r) => <Text weight="semibold">{r.aosName}</Text>, sortValue: (r) => r.aosName },
            { key: 'adv', header: 'Advisees', render: (r) => r.advisees, sortValue: (r) => r.advisees },
            { key: 'done', header: 'Done / required', render: (r) => `${r.meetingsDone} / ${r.meetingsRequired}`, sortValue: (r) => r.meetingsDone },
            { key: 'over', header: 'Advisees overdue', render: (r) => r.adviseesOverdue, sortValue: (r) => r.adviseesOverdue },
            { key: 'due', header: 'Due', render: (r) => r.adviseesDue, sortValue: (r) => r.adviseesDue },
            { key: 'con', header: 'Concerns', render: (r) => r.openConcerns, sortValue: (r) => r.openConcerns },
          ]} />
      )}
      {(students.error || advisors.error) ? <ErrorBox error={students.error || advisors.error} /> : null}
    </>
  );
}
