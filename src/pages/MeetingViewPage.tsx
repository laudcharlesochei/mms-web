import {
  Button, Card, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Text, tokens,
  Accordion, AccordionHeader, AccordionItem, AccordionPanel,
} from '@fluentui/react-components';
import { ArrowDownload20Regular, ArrowUndo20Regular, Delete20Regular, Edit20Regular, History20Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { download, errorMessage } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { Meeting } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';
import { MeetingReadOnly } from '@/components/MeetingReadOnly';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { formatDate, formatDateTime } from '@/lib/format';

/** S4 Meeting view: read-only record laid out like the form; PDF; amend within window; revision history. */
export function MeetingViewPage() {
  const { id } = useParams();
  const meetingId = Number(id);
  const navigate = useNavigate();
  const notify = useNotify();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { data: m, isLoading, error } = useQuery({ queryKey: ['meeting', meetingId], queryFn: () => endpoints.meeting(meetingId) });
  const revisions = useQuery({ queryKey: ['revisions', meetingId], queryFn: () => endpoints.revisions(meetingId), enabled: showHistory });

  const del = useMutation({
    mutationFn: (reason: string) => endpoints.deleteMeeting(meetingId, reason),
    onSuccess: () => {
      notify(m?.status === 'DRAFT' ? 'Draft discarded' : 'Record deleted');
      qc.invalidateQueries();
      navigate(m ? `/students/${m.studentId}` : '/');
    },
    onError: (e) => notify('Could not delete', 'error', errorMessage(e)),
  });
  const restore = useMutation({
    mutationFn: () => endpoints.restoreMeeting(meetingId),
    onSuccess: () => {
      notify('Record restored');
      qc.invalidateQueries();
    },
    onError: (e) => notify('Could not restore', 'error', errorMessage(e)),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!m) return null;

  const pdf = () => download(`/meetings/${m.id}/pdf`, `mentor-meeting-${m.id}.pdf`).catch((e) => notify('Download failed', 'error', errorMessage(e)));

  return (
    <>
      <PageHeader
        title={`Mentor meeting · ${formatDate(m.meetingDate)}`}
        subtitle={<><Link to={`/students/${m.studentId}`}>{m.studentName}</Link> · {m.programmeName}</>}
        actions={
          <>
            {!m.deleted && <Button icon={<ArrowDownload20Regular />} onClick={pdf}>Download PDF</Button>}
            {m.canEdit && (
              <Button appearance="primary" icon={<Edit20Regular />} onClick={() => navigate(`/meetings/${m.id}/edit`)}>
                {m.status === 'DRAFT' ? 'Continue editing' : 'Amend'}
              </Button>
            )}
            {m.status === 'SUBMITTED' && <Button icon={<History20Regular />} onClick={() => setShowHistory(true)}>Revision history</Button>}
            {m.canDelete && <Button icon={<Delete20Regular />} onClick={() => setShowDelete(true)}>{m.status === 'DRAFT' ? 'Discard draft' : 'Delete'}</Button>}
            {m.deleted && hasRole('ADMIN') && <Button icon={<ArrowUndo20Regular />} onClick={() => restore.mutate()}>Restore</Button>}
          </>
        }
      />
      {m.deleted && (
        <Notice intent="error" title="Deleted record">
          Deleted {formatDateTime(m.deletedAt)} — reason: {m.deleteReason}. Hidden from everyone except the Director and Administrators.
        </Notice>
      )}
      {m.status === 'DRAFT' && <Notice intent="warning">This is a draft. It is visible only to you and does not count on the dashboard until submitted.</Notice>}
      {m.status === 'SUBMITTED' && m.canEdit && m.editableUntil && (
        <Notice>You can amend this record until {formatDateTime(m.editableUntil)}. Every change is versioned and audited.</Notice>
      )}
      <Card style={{ padding: 20 }}>
        <MeetingReadOnly m={m} />
      </Card>

      <ConfirmDialog open={showDelete} danger busy={del.isPending}
        title={m.status === 'DRAFT' ? 'Discard this draft?' : 'Delete this record?'}
        confirmLabel={m.status === 'DRAFT' ? 'Discard' : 'Delete'}
        requireReason={m.status !== 'DRAFT'} reasonLabel="Reason for deletion (kept in the audit log)"
        onCancel={() => setShowDelete(false)} onConfirm={(reason) => { setShowDelete(false); del.mutate(reason); }}>
        {m.status === 'DRAFT' ? 'The draft will be removed from your list.' : 'The record is hidden but can be restored by an Administrator.'}
      </ConfirmDialog>

      <Dialog open={showHistory} onOpenChange={(_, d) => setShowHistory(d.open)}>
        <DialogSurface style={{ maxWidth: 860 }}>
          <DialogBody>
            <DialogTitle>Revision history</DialogTitle>
            <DialogContent>
              {revisions.isLoading && <Loading />}
              {revisions.data?.length === 0 && <Text>No amendments since submission.</Text>}
              <Accordion collapsible>
                {revisions.data?.map((r) => {
                  let snap: Meeting | null = null;
                  try { snap = JSON.parse(r.snapshotJson) as Meeting; } catch { snap = null; }
                  return (
                    <AccordionItem key={r.id} value={r.id}>
                      <AccordionHeader>Version {r.version} — replaced {formatDateTime(r.changedAt)} by {r.changedByName}</AccordionHeader>
                      <AccordionPanel>
                        {snap ? <MeetingReadOnly m={snap} compact /> : <Text style={{ color: tokens.colorNeutralForeground3 }}>Snapshot unavailable</Text>}
                      </AccordionPanel>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </DialogContent>
            <DialogActions><Button onClick={() => setShowHistory(false)}>Close</Button></DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
