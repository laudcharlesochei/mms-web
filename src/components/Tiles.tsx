import { makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' },
  tile: {
    textAlign: 'left', ...shorthands.padding('14px', '16px'), ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground1, ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    boxShadow: tokens.shadow2, cursor: 'default', color: tokens.colorNeutralForeground1, font: 'inherit',
  },
  clickable: { cursor: 'pointer', ':hover': { boxShadow: tokens.shadow8 }, ':focus-visible': { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: tokens.colorBrandStroke1 } },
  selected: { ...shorthands.borderColor(tokens.colorBrandStroke1), backgroundColor: tokens.colorBrandBackground2 },
  value: { display: 'block', fontSize: tokens.fontSizeHero700, fontWeight: tokens.fontWeightSemibold, lineHeight: tokens.lineHeightHero700 },
  label: { color: tokens.colorNeutralForeground3 },
});

export interface TileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  onClick?: () => void;
  selected?: boolean;
  tone?: 'danger' | 'warning' | 'success';
}

export function Tiles({ items }: { items: TileProps[] }) {
  const s = useStyles();
  return (
    <div className={s.grid}>
      {items.map((t) => {
        const color = t.tone === 'danger' ? tokens.colorPaletteRedForeground1 : t.tone === 'warning'
          ? tokens.colorPaletteDarkOrangeForeground1 : t.tone === 'success' ? tokens.colorPaletteGreenForeground1 : undefined;
        const content = (
          <>
            <span className={s.value} style={color ? { color } : undefined}>{t.value}</span>
            <Text className={s.label} size={300}>{t.label}</Text>
            {t.hint && <Text size={200} block className={s.label}>{t.hint}</Text>}
          </>
        );
        return t.onClick ? (
          <button key={t.label} type="button" onClick={t.onClick} aria-pressed={t.selected}
            className={`${s.tile} ${s.clickable} ${t.selected ? s.selected : ''}`}>{content}</button>
        ) : (
          <div key={t.label} className={s.tile}>{content}</div>
        );
      })}
    </div>
  );
}
