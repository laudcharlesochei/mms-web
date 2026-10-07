import { Button, Card, CardHeader, Input, makeStyles, Text, tokens } from '@fluentui/react-components';
import { Add20Regular, Edit20Regular, Search20Regular } from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { endpoints } from '@/api/endpoints';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Tiles } from '@/components/Tiles';
import { formatDate } from '@/lib/format';

const useStyles = makeStyles({
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' },
  card: { padding: '16px' },
  meta: { display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '10px', rowGap: '2px', margin: '8px 0 12px' },
  key: { color: tokens.colorNeutralForeground3 },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  drafts: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' },
  search: { maxWidth: '320px', marginBottom: '16px', width: '100%' },
});

/** S2 My advisees: advisee cards with progress, "New meeting" on each card and a "My drafts" strip. */
export function AdviseesPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['advisees'], queryFn: () => endpoints.advisees() });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;
  const rows = data.advisees.filter((r) => !q || r.studentName.toLowerCase().includes(q.toLowerCase()) || r.matricNo.includes(q));
  const sum = data.summary;

  return (
    <>
      <PageHeader title="My advisees" subtitle={`${sum.academicYearLabel}${sum.currentPeriodSeq ? ` · period ${sum.currentPeriodSeq}` : ''}`} />
      <Tiles items={[
        { label: 'Advisees', value: sum.students },
        { label: 'Meetings done / required', value: `${sum.meetingsDone} / ${sum.meetingsRequired}` },
        { label: 'Due this period', value: sum.due, tone: sum.due ? 'warning' : undefined },
        { label: 'Overdue', value: sum.overdue, tone: sum.overdue ? 'danger' : undefined },
        { label: 'Open concerns', value: sum.openConcerns, tone: sum.openConcerns ? 'danger' : undefined },
      ]} />

      {data.drafts.length > 0 && (
        <>
          <Text as="h2" size={500} weight="semibold">My drafts</Text>
          <div className={s.drafts} style={{ marginTop: 8 }}>
            {data.drafts.map((d) => (
              <Button key={d.id} icon={<Edit20Regular />} onClick={() => navigate(`/meetings/${d.id}/edit`)}>
                {d.studentName} · {formatDate(d.meetingDate)}
              </Button>
            ))}
          </div>
        </>
      )}

      <Input className={s.search} contentBefore={<Search20Regular />} placeholder="Find an advisee" aria-label="Find an advisee"
        value={q} onChange={(_, d) => setQ(d.value)} />

      {data.advisees.length === 0 && (
        <Notice title="No advisees yet">
          You have no advisees allocated for this academic year. If a student is missing, contact the GA Administrator
          — they fix allocations (there are no free-text students).
        </Notice>
      )}

      <div className={s.grid}>
        {rows.map((r) => (
          <Card key={r.studentId} className={s.card}>
            <CardHeader
              header={<Link to={`/students/${r.studentId}`}><Text weight="semibold" size={400}>{r.studentName}</Text></Link>}
              description={<Text size={200}>{r.matricNo} · {r.programmeName}</Text>}
              action={<StatusBadge status={r.status} />}
            />
            <div className={s.meta}>
              <Text size={200} className={s.key}>Employer</Text><Text size={200}>{r.employerName || '—'}</Text>
              <Text size={200} className={s.key}>Mentor</Text><Text size={200}>{r.mentorName || '—'}</Text>
              <Text size={200} className={s.key}>Meetings</Text><Text size={200}>{r.meetingsDone} of {r.meetingsRequired}</Text>
              <Text size={200} className={s.key}>Last meeting</Text><Text size={200}>{formatDate(r.lastMeetingDate)}</Text>
            </div>
            <div className={s.actions}>
              <Button appearance="primary" icon={<Add20Regular />} onClick={() => navigate(`/meetings/new?studentId=${r.studentId}`)}>
                New meeting
              </Button>
              <Button onClick={() => navigate(`/students/${r.studentId}`)}>Past meetings</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
