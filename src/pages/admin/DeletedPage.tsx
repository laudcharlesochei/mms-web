import { Button, Text } from '@fluentui/react-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { formatDate, formatDateTime } from '@/lib/format';

/** Soft-deleted records (FR-26): hidden but recoverable by an Administrator. */
export function DeletedPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['deleted'], queryFn: endpoints.deletedMeetings });
  const restore = useMutation({
    mutationFn: (id: number) => endpoints.restoreMeeting(id),
    onSuccess: () => { notify('Record restored'); void qc.invalidateQueries(); },
    onError: (e) => notify('Could not restore', 'error', errorMessage(e)),
  });
  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader title="Deleted records" subtitle="Soft-deleted meeting records with the reason given" />
      <ErrorBox error={error} />
      <SimpleTable label="Deleted records" rows={data || []} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/meetings/${r.id}`)}
        empty="No deleted records."
        columns={[
          { key: 'student', header: 'Student', render: (r) => <Text weight="semibold">{r.studentName}</Text> },
          { key: 'date', header: 'Meeting date', render: (r) => formatDate(r.meetingDate) },
          { key: 'aos', header: 'AoS', render: (r) => r.aosName },
          { key: 'deleted', header: 'Deleted', render: (r) => formatDateTime(r.deletedAt) },
          { key: 'reason', header: 'Reason', render: (r) => r.deleteReason },
          { key: 'act', header: '', render: (r) => (hasRole('ADMIN')
            ? <Button size="small" onClick={(e) => { e.stopPropagation(); restore.mutate(r.id); }}>Restore</Button> : null) },
        ]} />
    </>
  );
}
