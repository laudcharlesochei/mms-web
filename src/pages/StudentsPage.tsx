import { Button, Input, makeStyles, Select, Text, tokens } from '@fluentui/react-components';
import { Add20Regular, Search20Regular } from '@fluentui/react-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '@/api/endpoints';
import type { StudentSummary } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { StudentFormDialog } from '@/components/StudentFormDialog';
import { studentStatusLabels } from '@/lib/format';

const useStyles = makeStyles({
  filters: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' },
  pager: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', color: tokens.colorNeutralForeground3 },
});

export function StudentsPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [q, setQ] = useState('');
  const [programme, setProgramme] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<StudentSummary | null | undefined>(undefined);
  const programmes = useQuery({ queryKey: ['programmes'], queryFn: endpoints.programmes });
  const { data, isLoading, error } = useQuery({
    queryKey: ['students', q, programme, status, page],
    queryFn: () => endpoints.students({ q, programme: programme ? Number(programme) : undefined, status: status || undefined, page, size: 50 }),
    placeholderData: keepPreviousData,
  });
  const canManage = hasRole('ADMIN', 'DIRECTOR', 'PROG_LEAD');

  return (
    <>
      <PageHeader title="Students" subtitle="Students you can see, with their current Advisor of Studies"
        actions={canManage && <Button appearance="primary" icon={<Add20Regular />} onClick={() => setEditing(null)}>Add student</Button>} />
      <div className={s.filters}>
        <Input contentBefore={<Search20Regular />} placeholder="Name, matric or email" aria-label="Search students" value={q}
          onChange={(_, d) => { setQ(d.value); setPage(0); }} />
        <Select aria-label="Programme" value={programme} onChange={(_, d) => { setProgramme(d.value); setPage(0); }}>
          <option value="">All programmes</option>
          {programmes.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select aria-label="Status" value={status} onChange={(_, d) => { setStatus(d.value); setPage(0); }}>
          <option value="">Any status</option>
          {Object.entries(studentStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>
      <ErrorBox error={error} />
      {isLoading ? <Loading /> : (
        <SimpleTable label="Students" rows={data?.content || []} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/students/${r.id}`)}
          columns={[
            { key: 'name', header: 'Name', render: (r) => <Text weight="semibold">{r.fullName}</Text>, sortValue: (r) => r.lastName },
            { key: 'matric', header: 'Matric', render: (r) => r.matricNo, sortValue: (r) => r.matricNo },
            { key: 'prog', header: 'Programme', render: (r) => r.programmeName, sortValue: (r) => r.programmeName },
            { key: 'aos', header: 'Advisor of Studies', render: (r) => r.aosName || '—', sortValue: (r) => r.aosName },
            { key: 'emp', header: 'Employer', render: (r) => r.employerName || '—', sortValue: (r) => r.employerName },
            { key: 'status', header: 'Status', render: (r) => studentStatusLabels[r.status], sortValue: (r) => r.status },
          ]} />
      )}
      {data && data.totalPages > 1 && (
        <div className={s.pager}>
          <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Text>Page {data.page + 1} of {data.totalPages} · {data.totalElements} students</Text>
          <Button size="small" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
      <StudentFormDialog open={editing !== undefined} student={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
