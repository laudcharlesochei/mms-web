import { Badge, Button, Card, makeStyles, Text, tokens } from '@fluentui/react-components';
import { ArrowDownload20Regular, ArrowUpload20Regular, Checkmark20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { download, errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { ImportPreview } from '@/api/types';
import { ErrorBox, Notice } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { SimpleTable } from '@/components/SimpleTable';
import { Tiles } from '@/components/Tiles';
import { formatDateTime } from '@/lib/format';

const useStyles = makeStyles({
  steps: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  drop: { padding: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  err: { color: tokens.colorPaletteRedForeground1 },
});

/** S8 Import wizard: upload -> preview (add / update / errors) -> commit (FR-07, FR-08, workflow 7.2). */
export function ImportPage() {
  const s = useStyles();
  const qc = useQueryClient();
  const notify = useNotify();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const recent = useQuery({ queryKey: ['imports'], queryFn: endpoints.imports });

  const upload = useMutation({ mutationFn: (f: File) => endpoints.uploadImport(f), onSuccess: (p) => setPreview(p) });
  const commit = useMutation({
    mutationFn: (id: number) => endpoints.commitImport(id),
    onSuccess: (p) => {
      setPreview(p);
      notify('Import committed', 'success', `${p.rowsOk} row(s) saved. Advisors see their new advisees at next sign-in.`);
      void qc.invalidateQueries();
    },
  });
  const cancel = useMutation({ mutationFn: (id: number) => endpoints.cancelImport(id), onSuccess: () => { setPreview(null); void qc.invalidateQueries({ queryKey: ['imports'] }); } });
  const step = !preview ? 1 : preview.status === 'PREVIEW' ? 2 : 3;
  const rows = (preview?.rows || []).filter((r) => !onlyErrors || r.errors.length > 0);

  return (
    <>
      <PageHeader title="Import allocations" subtitle="Each September: load the AoS allocations sent by programme leads"
        actions={<Button icon={<ArrowDownload20Regular />} onClick={() => download('/imports/template', 'mms-allocation-template.csv').catch((e) => notify('Download failed', 'error', errorMessage(e)))}>CSV template</Button>} />
      <div className={s.steps} aria-label="Steps">
        <Badge appearance={step === 1 ? 'filled' : 'outline'}>1 Upload</Badge>
        <Badge appearance={step === 2 ? 'filled' : 'outline'}>2 Preview</Badge>
        <Badge appearance={step === 3 ? 'filled' : 'outline'}>3 Done</Badge>
      </div>

      {step === 1 && (
        <Card className={s.drop}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" hidden aria-label="Allocation file"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
          <Button appearance="primary" icon={<ArrowUpload20Regular />} disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
            {upload.isPending ? 'Checking…' : 'Choose CSV or XLSX'}
          </Button>
          <Text size={200}>Columns: matric_no, first_name, last_name, student_email, programme_code, aos_email, employer_name, mentor_name, mentor_email, academic_year. Header row required, max 2,000 rows / 2 MB.</Text>
          <ErrorBox error={upload.error} title="The file could not be imported" />
        </Card>
      )}

      {preview && (
        <>
          <Tiles items={[
            { label: 'Rows in file', value: preview.rowsTotal },
            { label: 'New students', value: preview.rowsAdd, tone: 'success' },
            { label: 'Updates', value: preview.rowsUpdate },
            { label: 'Rows with errors', value: preview.rowsError, tone: preview.rowsError ? 'danger' : undefined, onClick: () => setOnlyErrors((o) => !o), selected: onlyErrors },
          ]} />
          {preview.status === 'PREVIEW' && (
            <Notice intent={preview.rowsError ? 'warning' : 'info'} title={`${preview.fileName} is ready to import`}>
              Valid rows are committed in one go; rows with errors are skipped — fix them and re-import (re-import is safe: matching rows update, nothing is deleted).
            </Notice>
          )}
          {preview.status === 'COMMITTED' && <Notice intent="success" title="Import committed">Committed {formatDateTime(preview.committedAt)}.</Notice>}
          <ErrorBox error={commit.error} />
          <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px', flexWrap: 'wrap' }}>
            {preview.status === 'PREVIEW' && (
              <>
                <Button appearance="primary" icon={<Checkmark20Regular />} disabled={commit.isPending || preview.rowsOk === 0} onClick={() => commit.mutate(preview.batchId)}>
                  Commit {preview.rowsOk} valid row(s)
                </Button>
                <Button icon={<Dismiss20Regular />} onClick={() => cancel.mutate(preview.batchId)}>Cancel</Button>
              </>
            )}
            {preview.rowsError > 0 && <Button icon={<ArrowDownload20Regular />} onClick={() => download(`/imports/${preview.batchId}/errors.csv`, 'import-errors.csv')}>Error report</Button>}
            {preview.status !== 'PREVIEW' && <Button onClick={() => setPreview(null)}>Import another file</Button>}
          </div>
          <SimpleTable label="Import rows" rows={rows} rowKey={(r) => r.rowNo}
            columns={[
              { key: 'row', header: 'Row', render: (r) => r.rowNo, width: '60px' },
              { key: 'matric', header: 'Matric', render: (r) => r.matricNo },
              { key: 'name', header: 'Student', render: (r) => `${r.firstName ?? ''} ${r.lastName ?? ''}` },
              { key: 'prog', header: 'Programme', render: (r) => r.programmeCode },
              { key: 'aos', header: 'AoS', render: (r) => r.aosEmail },
              { key: 'emp', header: 'Employer / mentor', render: (r) => [r.employerName, r.mentorName].filter(Boolean).join(' / ') || '—' },
              { key: 'year', header: 'Year', render: (r) => r.academicYear },
              { key: 'res', header: 'Result', render: (r) => (r.errors.length
                ? <span className={s.err}>{r.errors.join('; ')}</span>
                : <Badge appearance="tint" color={r.action === 'ADD' ? 'success' : 'informative'}>{r.action === 'ADD' ? 'Add' : 'Update'}</Badge>) },
            ]} />
        </>
      )}

      <Text as="h2" size={500} weight="semibold" block style={{ margin: '24px 0 10px' }}>Recent imports</Text>
      <SimpleTable label="Recent imports" rows={recent.data || []} rowKey={(r) => r.id}
        onRowClick={(r) => endpoints.importBatch(r.id).then(setPreview)} empty="No imports yet."
        columns={[
          { key: 'when', header: 'Uploaded', render: (r) => formatDateTime(r.uploadedAt) },
          { key: 'file', header: 'File', render: (r) => r.fileName },
          { key: 'by', header: 'By', render: (r) => r.uploadedBy },
          { key: 'rows', header: 'Rows (ok / errors)', render: (r) => `${r.rowsTotal} (${r.rowsOk} / ${r.rowsError})` },
          { key: 'st', header: 'Status', render: (r) => r.status.toLowerCase() },
        ]} />
    </>
  );
}
