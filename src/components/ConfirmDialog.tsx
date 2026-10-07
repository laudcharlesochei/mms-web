import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Textarea } from '@fluentui/react-components';
import { useState, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, requireReason, reasonLabel = 'Reason', busy, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const invalid = requireReason && reason.trim().length < 3;
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onCancel()}>
      <DialogSurface aria-describedby={undefined}>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {children}
            {requireReason && (
              <Field label={reasonLabel} required style={{ marginTop: 12 }} validationMessage={invalid && reason ? 'At least 3 characters' : undefined}>
                <Textarea value={reason} onChange={(_, d) => setReason(d.value)} maxLength={500} />
              </Field>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button
              appearance="primary"
              style={danger ? { background: 'var(--colorPaletteRedBackground3)' } : undefined}
              disabled={invalid || busy}
              onClick={() => onConfirm(reason.trim())}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
