import { Badge, Button, Card, Input, makeStyles, Tab, TabList, Text, tokens } from '@fluentui/react-components';
import { Add20Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '@/api/endpoints';
import type { AcademicYear, Employer, Mentor, Programme } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { FormDialog, type FieldDef, type FieldValue } from '@/components/FormDialog';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { formatDate } from '@/lib/format';

type TabKey = 'programmes' | 'employers' | 'mentors' | 'years';

const useStyles = makeStyles({
  bar: { display: 'flex', justifyContent: 'flex-end', margin: '12px 0' },
  periods: { display: 'grid', gap: '8px', gridTemplateColumns: 'auto 1fr 1fr', alignItems: 'center', maxWidth: '520px', marginTop: '10px' },
});

/** S7 Admin - Data: programmes, employers, workplace mentors, academic years (FR-05, FR-06). */
export function DataPage() {
  const s = useStyles();
  const qc = useQueryClient();
  const notify = useNotify();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN', 'DIRECTOR');
  const [tab, setTab] = useState<TabKey>(isAdmin ? 'programmes' : 'employers');
  const [dialog, setDialog] = useState<{ title: string; fields: FieldDef[]; initial: Record<string, FieldValue>; save: (v: Record<string, FieldValue>) => Promise<unknown> } | null>(null);
  const [periodYear, setPeriodYear] = useState<AcademicYear | null>(null);

  const programmes = useQuery({ queryKey: ['programmes'], queryFn: endpoints.programmes });
  const employers = useQuery({ queryKey: ['employers'], queryFn: endpoints.employers });
  const mentors = useQuery({ queryKey: ['mentors', 'all'], queryFn: () => endpoints.mentors() });
  const years = useQuery({ queryKey: ['years'], queryFn: endpoints.years });
  const staff = useQuery({ queryKey: ['staff', 'PROG_LEAD'], queryFn: () => endpoints.staff('PROG_LEAD'), enabled: isAdmin });

  const done = (msg: string) => {
    notify(msg);
    void qc.invalidateQueries();
  };
  const bool = (v: FieldValue | undefined) => v === true;
  const str = (v: FieldValue | undefined) => (typeof v === 'string' ? v.trim() : '');
  const num = (v: FieldValue | undefined) => (str(v) ? Number(v) : null);

  const editProgramme = (p: Programme | null) => setDialog({
    title: p ? 'Edit programme' : 'Add programme',
    fields: [
      { name: 'code', label: 'Code', required: true, hint: 'e.g. GA-SE' },
      { name: 'name', label: 'Name', required: true },
      { name: 'leadUserId', label: 'Programme Lead', type: 'select', options: [{ value: '', label: '— none —' }, ...(staff.data || []).map((u) => ({ value: String(u.id), label: u.displayName }))] },
      { name: 'active', label: 'Active', type: 'checkbox' },
    ],
    initial: { code: p?.code || '', name: p?.name || '', leadUserId: p?.leadUserId ? String(p.leadUserId) : '', active: p ? p.active : true },
    save: (v) => endpoints.saveProgramme(p?.id ?? null, { code: str(v.code), name: str(v.name), leadUserId: num(v.leadUserId), active: bool(v.active) }).then(() => done('Programme saved')),
  });
  const editEmployer = (e: Employer | null) => setDialog({
    title: e ? 'Edit employer' : 'Add employer',
    fields: [{ name: 'name', label: 'Name', required: true }, { name: 'address', label: 'Address' }, { name: 'active', label: 'Active', type: 'checkbox' }],
    initial: { name: e?.name || '', address: e?.address || '', active: e ? e.active : true },
    save: (v) => endpoints.saveEmployer(e?.id ?? null, { name: str(v.name), address: str(v.address) || null, active: bool(v.active) }).then(() => done('Employer saved')),
  });
  const editMentor = (m: Mentor | null) => setDialog({
    title: m ? 'Edit workplace mentor' : 'Add workplace mentor',
    fields: [
      { name: 'employerId', label: 'Employer', type: 'select', required: true, options: [{ value: '', label: 'Choose…' }, ...(employers.data || []).map((e) => ({ value: String(e.id), label: e.name }))] },
      { name: 'fullName', label: 'Full name', required: true },
      { name: 'email', label: 'Email', type: 'email', hint: 'Optional — mentors may not have a university email' },
      { name: 'phone', label: 'Phone' },
      { name: 'active', label: 'Active', type: 'checkbox' },
    ],
    initial: { employerId: m ? String(m.employerId) : '', fullName: m?.fullName || '', email: m?.email || '', phone: m?.phone || '', active: m ? m.active : true },
    save: (v) => endpoints.saveMentor(m?.id ?? null, { employerId: num(v.employerId), fullName: str(v.fullName), email: str(v.email) || null, phone: str(v.phone) || null, active: bool(v.active) }).then(() => done('Mentor saved')),
  });
  const editYear = (y: AcademicYear | null) => setDialog({
    title: y ? 'Edit academic year' : 'Add academic year',
    fields: [
      { name: 'label', label: 'Label', required: true, hint: 'e.g. 2027/28' },
      { name: 'startDate', label: 'Start date', type: 'date', required: true },
      { name: 'endDate', label: 'End date', type: 'date', required: true },
      { name: 'requiredMeetings', label: 'Meetings required per student', type: 'number', required: true, hint: 'Periods are generated evenly; edit them afterwards if needed' },
      { name: 'current', label: 'Current academic year', type: 'checkbox' },
    ],
    initial: { label: y?.label || '', startDate: y?.startDate || '', endDate: y?.endDate || '', requiredMeetings: String(y?.requiredMeetings ?? 3), current: y ? y.current : false },
    save: (v) => endpoints.saveYear(y?.id ?? null, { label: str(v.label), startDate: str(v.startDate), endDate: str(v.endDate), requiredMeetings: Number(v.requiredMeetings), current: bool(v.current) }).then(() => done('Academic year saved')),
  });

  const loading = programmes.isLoading || employers.isLoading || mentors.isLoading || years.isLoading;
  const addButton = useMemo(() => ({
    programmes: isAdmin ? () => editProgramme(null) : null,
    employers: () => editEmployer(null),
    mentors: () => editMentor(null),
    years: isAdmin ? () => editYear(null) : null,
  }), [isAdmin, staff.data, employers.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Reference data" subtitle={<>Students are managed on the <Link to="/students">Students</Link> page; allocations via <Link to="/admin/import">Import</Link>.</>} />
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as TabKey)}>
        {isAdmin && <Tab value="programmes">Programmes</Tab>}
        <Tab value="employers">Employers</Tab>
        <Tab value="mentors">Workplace mentors</Tab>
        {isAdmin && <Tab value="years">Academic years</Tab>}
      </TabList>
      <div className={s.bar}>
        {addButton[tab] && <Button appearance="primary" icon={<Add20Regular />} onClick={addButton[tab]!}>Add</Button>}
      </div>
      {loading && <Loading />}
      <ErrorBox error={programmes.error || employers.error || mentors.error || years.error} />

      {tab === 'programmes' && programmes.data && (
        <SimpleTable label="Programmes" rows={programmes.data} rowKey={(r) => r.id} onRowClick={editProgramme}
          columns={[
            { key: 'code', header: 'Code', render: (r) => r.code, sortValue: (r) => r.code },
            { key: 'name', header: 'Name', render: (r) => r.name, sortValue: (r) => r.name },
            { key: 'lead', header: 'Programme Lead', render: (r) => r.leadName || '—' },
            { key: 'n', header: 'Students', render: (r) => r.studentCount, sortValue: (r) => r.studentCount },
            { key: 'a', header: 'Status', render: (r) => (r.active ? 'Active' : <Badge color="subtle">Inactive</Badge>) },
          ]} />
      )}
      {tab === 'employers' && employers.data && (
        <SimpleTable label="Employers" rows={employers.data} rowKey={(r) => r.id} onRowClick={editEmployer}
          columns={[
            { key: 'name', header: 'Name', render: (r) => r.name, sortValue: (r) => r.name },
            { key: 'addr', header: 'Address', render: (r) => r.address || '—' },
            { key: 'a', header: 'Status', render: (r) => (r.active ? 'Active' : <Badge color="subtle">Inactive</Badge>) },
          ]} />
      )}
      {tab === 'mentors' && mentors.data && (
        <SimpleTable label="Workplace mentors" rows={mentors.data} rowKey={(r) => r.id} onRowClick={editMentor}
          columns={[
            { key: 'name', header: 'Name', render: (r) => r.fullName, sortValue: (r) => r.fullName },
            { key: 'emp', header: 'Employer', render: (r) => r.employerName, sortValue: (r) => r.employerName },
            { key: 'email', header: 'Email', render: (r) => r.email || '—' },
            { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
            { key: 'a', header: 'Status', render: (r) => (r.active ? 'Active' : <Badge color="subtle">Inactive</Badge>) },
          ]} />
      )}
      {tab === 'years' && years.data && (
        <>
          <Notice>Each September: create the new year, make it current, then import the allocations.</Notice>
          <SimpleTable label="Academic years" rows={years.data} rowKey={(r) => r.id}
            columns={[
              { key: 'label', header: 'Year', render: (r) => <Text weight="semibold">{r.label}{r.current && <Badge style={{ marginLeft: 8 }} color="brand">Current</Badge>}</Text> },
              { key: 'dates', header: 'Dates', render: (r) => `${formatDate(r.startDate)} – ${formatDate(r.endDate)}` },
              { key: 'req', header: 'Meetings required', render: (r) => r.requiredMeetings },
              { key: 'periods', header: 'Periods', render: (r) => r.periods.map((p) => `${p.seq}: ${formatDate(p.startDate)}–${formatDate(p.endDate)}`).join(' · ') },
              { key: 'act', header: '', render: (r) => (
                <span style={{ display: 'flex', gap: 6 }}>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); editYear(r); }}>Edit</Button>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); setPeriodYear(r); }}>Periods</Button>
                </span>
              ) },
            ]} />
        </>
      )}

      {dialog && <FormDialog open title={dialog.title} fields={dialog.fields} initial={dialog.initial} onSave={dialog.save} onClose={() => setDialog(null)} />}
      {periodYear && <PeriodsEditor year={periodYear} onClose={() => setPeriodYear(null)} />}
    </>
  );
}

function PeriodsEditor({ year, onClose }: { year: AcademicYear; onClose: () => void }) {
  const s = useStyles();
  const qc = useQueryClient();
  const notify = useNotify();
  const [rows, setRows] = useState(year.periods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })));
  const save = useMutation({
    mutationFn: () => endpoints.savePeriods(year.id, rows),
    onSuccess: () => {
      notify('Periods saved');
      void qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <Card style={{ padding: 16, marginTop: 16 }}>
      <Text weight="semibold" size={400}>Meeting periods · {year.label}</Text>
      <Text size={200} block style={{ color: tokens.colorNeutralForeground3 }}>One submitted meeting is expected per period. The number of periods sets the meetings required.</Text>
      <ErrorBox error={save.error} />
      <div className={s.periods}>
        {rows.map((r, i) => (
          <PeriodRow key={i} index={i} start={r.startDate} end={r.endDate}
            onChange={(start, end) => setRows((p) => p.map((x, j) => (j === i ? { startDate: start, endDate: end } : x)))} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button onClick={() => setRows((p) => [...p, { startDate: year.endDate, endDate: year.endDate }])}>Add period</Button>
        {rows.length > 1 && <Button onClick={() => setRows((p) => p.slice(0, -1))}>Remove last</Button>}
        <Button appearance="primary" onClick={() => save.mutate()} disabled={save.isPending}>Save periods</Button>
        <Button appearance="subtle" onClick={onClose}>Close</Button>
      </div>
    </Card>
  );
}

function PeriodRow({ index, start, end, onChange }: { index: number; start: string; end: string; onChange: (s: string, e: string) => void }) {
  return (
    <>
      <Text>Period {index + 1}</Text>
      <Input type="date" aria-label={`Period ${index + 1} start`} value={start} onChange={(_, d) => onChange(d.value, end)} />
      <Input type="date" aria-label={`Period ${index + 1} end`} value={end} onChange={(_, d) => onChange(start, d.value)} />
    </>
  );
}
