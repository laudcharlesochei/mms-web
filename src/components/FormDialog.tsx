import {
  Button, Checkbox, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input, Select,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import { ErrorBox } from './Feedback';

export type FieldValue = string | boolean;

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}

/** Small generic create/edit dialog for reference data (S7). */
export function FormDialog({ open, title, fields, initial, onSave, onClose }: {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial: Record<string, FieldValue>;
  onSave: (values: Record<string, FieldValue>) => Promise<unknown>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, FieldValue>>(initial);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
  }, [open, initial]);
  const fe = error instanceof ApiError ? error.errors : {};
  const missing = fields.some((f) => f.required && f.type !== 'checkbox' && !String(values[f.name] ?? '').trim());

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent style={{ display: 'grid', gap: 12 }}>
            <ErrorBox error={error} title="Could not save" />
            {fields.map((f) => {
              const v = values[f.name];
              if (f.type === 'checkbox') {
                return <Checkbox key={f.name} label={f.label} checked={!!v} onChange={(_, d) => setValues((p) => ({ ...p, [f.name]: !!d.checked }))} />;
              }
              return (
                <Field key={f.name} label={f.label} required={f.required} hint={f.hint} validationMessage={fe[f.name]}>
                  {f.type === 'select' ? (
                    <Select value={String(v ?? '')} onChange={(_, d) => setValues((p) => ({ ...p, [f.name]: d.value }))}>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : (
                    <Input type={f.type || 'text'} value={String(v ?? '')} onChange={(_, d) => setValues((p) => ({ ...p, [f.name]: d.value }))} />
                  )}
                </Field>
              );
            })}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={busy}>Cancel</Button>
            <Button appearance="primary" onClick={() => void save()} disabled={busy || missing}>Save</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
