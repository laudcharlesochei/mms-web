import {
  makeStyles, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Text, tokens,
} from '@fluentui/react-components';
import { useMemo, useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null;
  width?: string;
}

const useStyles = makeStyles({
  wrap: { overflowX: 'auto', backgroundColor: tokens.colorNeutralBackground1, borderRadius: tokens.borderRadiusLarge, boxShadow: tokens.shadow2 },
  empty: { padding: '20px', color: tokens.colorNeutralForeground3 },
  row: { cursor: 'pointer' },
});

/** Accessible, sortable table (keyboard-sortable headers, row click optional). */
export function SimpleTable<T>({ rows, columns, rowKey, onRowClick, empty = 'Nothing to show.', label }: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty?: string;
  label: string;
}) {
  const s = useStyles();
  const [sort, setSort] = useState<{ key: string; dir: 'ascending' | 'descending' } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const f = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = f(a) ?? '';
      const y = f(b) ?? '';
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'ascending' ? r : -r;
    });
  }, [rows, columns, sort]);

  return (
    <div className={s.wrap}>
      <Table aria-label={label} size="small" sortable>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHeaderCell key={c.key} style={c.width ? { width: c.width } : undefined}
                sortDirection={sort?.key === c.key ? sort.dir : undefined}
                onClick={c.sortValue ? () => setSort((p) => ({ key: c.key, dir: p?.key === c.key && p.dir === 'ascending' ? 'descending' : 'ascending' })) : undefined}>
                {c.header}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={rowKey(r)} className={onRowClick ? s.row : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}>
              {columns.map((c) => <TableCell key={c.key}>{c.render(r)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && <Text block className={s.empty}>{empty}</Text>}
    </div>
  );
}
