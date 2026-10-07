import { Button, Field, Input, makeStyles, Text } from '@fluentui/react-components';
import { ArrowDownload20Regular } from '@fluentui/react-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { download, errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { ErrorBox, Loading } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { formatDateTime } from '@/lib/format';

const useStyles = makeStyles({ filters: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' } });

/** S8 Audit log (FR-25): who did what, when. */
export function AuditPage() {
  const s = useStyles();
  const notify = useNotify();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(0);
  const query = { from: from || undefined, to: to || undefined, action: action.trim().toUpperCase() || undefined, entity: entity.trim() || undefined };
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', query, page],
    queryFn: () => endpoints.audit({ ...query, page, size: 50 }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader title="Audit log" subtitle="Sign-in, create, edit, submit, view, export, delete and import events"
        actions={<Button icon={<ArrowDownload20Regular />} onClick={() => download('/audit/export', 'mms-audit.csv', query).catch((e) => notify('Export failed', 'error', errorMessage(e)))}>Export CSV</Button>} />
      <div className={s.filters}>
        <Field label="From"><Input type="date" value={from} onChange={(_, d) => { setFrom(d.value); setPage(0); }} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(_, d) => { setTo(d.value); setPage(0); }} /></Field>
        <Field label="Action"><Input placeholder="e.g. MEETING_SUBMIT" value={action} onChange={(_, d) => { setAction(d.value); setPage(0); }} /></Field>
        <Field label="Entity"><Input placeholder="e.g. MentorMeeting" value={entity} onChange={(_, d) => { setEntity(d.value); setPage(0); }} /></Field>
      </div>
      <ErrorBox error={error} />
      {isLoading ? <Loading /> : (
        <SimpleTable label="Audit events" rows={data?.content || []} rowKey={(r) => r.id} empty="No events for these filters."
          columns={[
            { key: 'when', header: 'When', render: (r) => formatDateTime(r.occurredAt) },
            { key: 'who', header: 'User', render: (r) => r.userEmail || 'system' },
            { key: 'what', header: 'Action', render: (r) => <Text weight="semibold">{r.action}</Text> },
            { key: 'entity', header: 'Entity', render: (r) => (r.entityType ? `${r.entityType} ${r.entityId ?? ''}` : '—') },
            { key: 'details', header: 'Details', render: (r) => <Text size={200}>{r.details || ''}</Text> },
          ]} />
      )}
      {data && data.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Text>Page {data.page + 1} of {data.totalPages}</Text>
          <Button size="small" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}
