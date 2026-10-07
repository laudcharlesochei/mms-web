import { Badge, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { Warning16Filled } from '@fluentui/react-icons';
import type { Meeting } from '@/api/types';
import { formatDate, formatDateTime, formatLabels } from '@/lib/format';

const useStyles = makeStyles({
  meta: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 18px',
    ...shorthands.padding('14px'), backgroundColor: tokens.colorNeutralBackground3, ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  key: { display: 'block', color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  section: { marginTop: '14px' },
  box: {
    whiteSpace: 'pre-wrap', ...shorthands.padding('10px', '12px'), ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium), backgroundColor: tokens.colorNeutralBackground1, minHeight: '20px', overflowWrap: 'anywhere',
  },
  concern: { ...shorthands.borderColor(tokens.colorPaletteRedBorder2) },
  h: { display: 'block', marginBottom: '4px' },
});

const SECTIONS: [keyof Meeting, string][] = [
  ['workActivities', 'Activities at work'],
  ['universityProgress', 'How university is going'],
  ['universityFeedback', 'Feedback about the university'],
  ['trainingOpportunities', 'Training opportunities at work'],
  ['agreedActions', 'Agreed actions / next steps'],
];

/** A meeting laid out like the form (FR-17, Section 8.3) - text is rendered as text, never HTML. */
export function MeetingReadOnly({ m, compact = false }: { m: Meeting; compact?: boolean }) {
  const s = useStyles();
  const present = [m.studentPresent && 'Student', m.mentorPresent && 'Workplace mentor'].filter(Boolean).join(', ') || 'Not recorded';
  return (
    <div>
      <div className={s.meta}>
        {!compact && <div><span className={s.key}>Student</span><Text>{m.studentName} ({m.matricNo})</Text></div>}
        {!compact && <div><span className={s.key}>Programme</span><Text>{m.programmeName || '—'}</Text></div>}
        {!compact && <div><span className={s.key}>Employer</span><Text>{m.employerName || '—'}</Text></div>}
        <div><span className={s.key}>Workplace mentor</span><Text>{m.mentorName || '—'}</Text></div>
        {!compact && <div><span className={s.key}>Advisor of Studies</span><Text>{m.aosName}</Text></div>}
        <div><span className={s.key}>Meeting date</span><Text>{formatDate(m.meetingDate)}</Text></div>
        <div><span className={s.key}>Format</span><Text>{m.format ? formatLabels[m.format] : '—'}</Text></div>
        <div><span className={s.key}>Present</span><Text>{present}</Text></div>
        {!compact && <div><span className={s.key}>Academic year</span><Text>{m.academicYearLabel}{m.periodSeq ? ` · period ${m.periodSeq}` : ''}</Text></div>}
      </div>
      {SECTIONS.map(([k, label]) => (
        <div key={k} className={s.section}>
          <Text weight="semibold" className={s.h}>{label}</Text>
          <div className={s.box}>{(m[k] as string | null) || '—'}</div>
        </div>
      ))}
      <div className={s.section}>
        <Text weight="semibold" className={s.h}>Engagement concern</Text>
        <div className={m.concernFlag ? `${s.box} ${s.concern}` : s.box}>
          {m.concernFlag ? (
            <><Badge appearance="outline" color="danger" icon={<Warning16Filled />}>Concern</Badge> {m.concernNote}</>
          ) : 'No'}
        </div>
      </div>
      <div className={s.section}>
        <Text weight="semibold" className={s.h}>Proposed next meeting</Text>
        <div className={s.box}>{formatDate(m.nextMeetingDate)}</div>
      </div>
      {!compact && (
        <Text size={200} block style={{ marginTop: 14, color: tokens.colorNeutralForeground3 }}>
          {m.status === 'SUBMITTED' ? `Submitted ${formatDateTime(m.submittedAt)}` : 'Draft — not submitted'} · Version {m.version} · Record {m.id}
        </Text>
      )}
    </div>
  );
}
