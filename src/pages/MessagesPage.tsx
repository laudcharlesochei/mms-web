import { Avatar, Badge, Button, Card, makeStyles, shorthands, Text, Textarea, tokens } from '@fluentui/react-components';
import { Send20Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { endpoints } from '@/api/endpoints';
import { ErrorBox, Loading } from '@/components/Feedback';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, roleLabels } from '@/lib/format';

const useStyles = makeStyles({
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', '@media (max-width: 800px)': { gridTemplateColumns: '1fr' } },
  contacts: { ...shorthands.padding('8px'), maxHeight: '70vh', overflowY: 'auto' },
  contact: {
    display: 'flex', gap: '10px', alignItems: 'center', width: '100%', ...shorthands.padding('8px'), ...shorthands.border('none'),
    background: 'transparent', textAlign: 'left', cursor: 'pointer', ...shorthands.borderRadius(tokens.borderRadiusMedium), color: 'inherit', font: 'inherit',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  selected: { backgroundColor: tokens.colorBrandBackground2 },
  chat: { display: 'flex', flexDirection: 'column', minHeight: '60vh', ...shorthands.padding('12px') },
  thread: { flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', ...shorthands.padding('4px') },
  bubble: { maxWidth: '75%', ...shorthands.padding('8px', '12px'), ...shorthands.borderRadius(tokens.borderRadiusLarge), whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  mine: { alignSelf: 'flex-end', backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand },
  theirs: { alignSelf: 'flex-start', backgroundColor: tokens.colorNeutralBackground3 },
  compose: { display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'flex-end' },
  time: { fontSize: tokens.fontSizeBase100, opacity: 0.8, display: 'block', marginTop: '2px' },
});

/** Direct messages (carried over from MentorSync): e.g. an AoS raising a concern with the Director. */
export function MessagesPage() {
  const s = useStyles();
  const qc = useQueryClient();
  const [withId, setWithId] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: endpoints.contacts, refetchInterval: 30_000 });
  const thread = useQuery({ queryKey: ['thread', withId], queryFn: () => endpoints.conversation(withId!), enabled: !!withId, refetchInterval: 15_000 });
  const send = useMutation({
    mutationFn: () => endpoints.sendMessage(withId!, body.trim()),
    onSuccess: () => { setBody(''); void qc.invalidateQueries({ queryKey: ['thread', withId] }); void qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread.data]);
  useEffect(() => { if (withId) void qc.invalidateQueries({ queryKey: ['contacts'] }); }, [thread.data, withId, qc]);
  const other = contacts.data?.find((c) => c.id === withId);

  return (
    <>
      <PageHeader title="Messages" subtitle="Messages stay inside MMS. Do not share sensitive personal information." />
      <ErrorBox error={contacts.error} />
      <div className={s.layout}>
        <Card className={s.contacts}>
          {contacts.isLoading && <Loading />}
          {contacts.data?.map((c) => (
            <button key={c.id} type="button" className={c.id === withId ? `${s.contact} ${s.selected}` : s.contact} onClick={() => setWithId(c.id)}>
              <Avatar name={c.displayName} size={32} color="colorful" />
              <span style={{ flexGrow: 1, minWidth: 0 }}>
                <Text weight="semibold" block truncate>{c.displayName}</Text>
                <Text size={200} block truncate>{c.roles.map((r) => roleLabels[r]).join(', ')}</Text>
              </span>
              {c.unread > 0 && <Badge color="danger" size="small">{c.unread}</Badge>}
            </button>
          ))}
          {contacts.data?.length === 0 && <Text>No contacts available.</Text>}
        </Card>
        <Card className={s.chat}>
          {!withId ? <Text>Choose a person to start a conversation.</Text> : (
            <>
              <Text weight="semibold" size={400}>{other?.displayName}</Text>
              <div className={s.thread} aria-live="polite">
                {thread.data?.map((m) => (
                  <div key={m.id} className={`${s.bubble} ${m.mine ? s.mine : s.theirs}`}>
                    {m.body}
                    <span className={s.time}>{formatDateTime(m.createdAt)}{m.mine && m.readAt ? ' · read' : ''}</span>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <ErrorBox error={send.error} />
              <div className={s.compose}>
                <Textarea style={{ flexGrow: 1 }} aria-label="Message" value={body} maxLength={4000} onChange={(_, d) => setBody(d.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && body.trim()) send.mutate(); }} />
                <Button appearance="primary" icon={<Send20Regular />} disabled={!body.trim() || send.isPending} onClick={() => send.mutate()}>Send</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
