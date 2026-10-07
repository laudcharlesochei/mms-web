import { makeStyles, Text, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
  },
  sub: { color: tokens.colorNeutralForeground3, display: 'block', marginTop: '4px' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
});

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  const s = useStyles();
  return (
    <div className={s.root}>
      <div>
        <Text as="h1" size={700} weight="semibold" style={{ margin: 0 }}>{title}</Text>
        {subtitle && <Text className={s.sub} size={300}>{subtitle}</Text>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  );
}
