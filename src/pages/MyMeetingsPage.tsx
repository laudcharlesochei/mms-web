import { Text } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { formatDate, formatLabels } from '@/lib/format';

/** Student view (Phase 2, read-only): own meeting records. */
export function MyMeetingsPage() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const sid = me?.studentId ?? null;
  const { data, isLoading, error } = useQuery({ queryKey: ['studentMeetings', sid], queryFn: () => endpoints.studentMeetings(sid!), enabled: !!sid });
  if (!sid) return <Notice intent="warning">Your account is not linked to a student record yet. Contact the GA office.</Notice>;
  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader title="My mentor meetings" subtitle="Records written by your Advisor of Studies (read-only)" />
      <ErrorBox error={error} />
      <SimpleTable label="My meetings" rows={data || []} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/meetings/${r.id}`)}
        empty="No meetings recorded yet."
        columns={[
          { key: 'date', header: 'Date', render: (r) => <Text weight="semibold">{formatDate(r.meetingDate)}</Text> },
          { key: 'aos', header: 'Advisor of Studies', render: (r) => r.aosName },
          { key: 'format', header: 'Format', render: (r) => (r.format ? formatLabels[r.format] : '—') },
        ]} />
    </>
  );
}
