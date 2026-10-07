import { Badge, Button, Card, Text, tokens } from '@fluentui/react-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { formatDateTime } from '@/lib/format';

/** V2 Admin "Health" screen (FR-V2-05): Graph connectivity, throttling, list sizes vs the 5,000 view threshold. */
export function HealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['health'], queryFn: endpoints.storageHealth });
  const provision = useMutation({ mutationFn: endpoints.provision, onSuccess: () => void refetch() });
  if (isLoading) return <Loading label="Checking SharePoint…" />;
  return (
    <>
      <PageHeader title="SharePoint health" subtitle="Microsoft Graph connectivity and list sizes"
        actions={<>
          <Button onClick={() => void refetch()} disabled={isFetching}>Refresh</Button>
          <Button onClick={() => provision.mutate()} disabled={provision.isPending}>Run provisioning</Button>
        </>} />
      <ErrorBox error={error || provision.error} />
      {provision.data && <Notice intent="success" title="Provisioning finished">{provision.data.report.join(' · ')}</Notice>}
      {data && (
        <>
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text weight="semibold" size={400} block>
              {data.connected ? <Badge color="success">Connected</Badge> : <Badge color="danger">Not connected</Badge>} &nbsp;{data.message}
            </Text>
            <Text size={200} block style={{ color: tokens.colorNeutralForeground3, marginTop: 6 }}>
              Storage: {data.storage} · Site: {data.siteId || '—'} · Circuit breaker: {data.circuitBreakerState} · Checked {formatDateTime(data.checkedAt)}
            </Text>
            <Text size={200} block style={{ marginTop: 6 }}>
              Throttling events since start: {data.throttleEvents}
              {data.lastThrottledAt && ` · last ${formatDateTime(data.lastThrottledAt)} (${data.lastThrottleDetail})`}
            </Text>
          </Card>
          <SimpleTable label="List item counts" rows={data.lists} rowKey={(r) => r.list} empty="No lists (in-memory development store)."
            columns={[
              { key: 'list', header: 'List', render: (r) => r.list },
              { key: 'n', header: 'Items', render: (r) => r.items.toLocaleString('en-GB') },
              { key: 't', header: '5,000 view threshold', render: (r) => (r.overThreshold
                ? <Badge color="warning">Over — queries rely on indexes</Badge> : <Badge color="success" appearance="tint">Under</Badge>) },
            ]} />
        </>
      )}
    </>
  );
}
