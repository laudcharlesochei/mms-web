import { Button, Card, Field, Input, makeStyles, Text, tokens } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { LoginResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Loading, Notice } from '@/components/Feedback';

const useStyles = makeStyles({
  page: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '16px', backgroundColor: tokens.colorNeutralBackground2 },
  card: { width: '100%', maxWidth: '440px', padding: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' },
});

/** Accept an invitation and choose a password (carried over from MentorSync invites). */
export function InvitePage() {
  const s = useStyles();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const info = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api.post<{ email: string; displayName: string; valid: boolean }>('/auth/invites/validate', { token }),
    enabled: !!token,
  });
  const weak = pw.length > 0 && (pw.length < 10 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<LoginResponse>('/auth/invites/accept', { token, password: pw });
      await completeLogin(r);
      navigate('/account?welcome=1', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <Card className={s.card}>
        <Text as="h1" size={600} weight="semibold">Set your password</Text>
        {!token && <Notice intent="error">This link is missing its invitation token.</Notice>}
        {info.isLoading && <Loading />}
        {info.data && !info.data.valid && <Notice intent="error">This invitation is invalid or has expired. Ask the Administrator for a new one.</Notice>}
        {info.data?.valid && (
          <form className={s.form} onSubmit={submit}>
            <Text>Welcome, {info.data.displayName}. You are setting the password for <strong>{info.data.email}</strong>.</Text>
            <ErrorBox error={error} />
            <Field label="New password" required validationMessage={weak ? 'At least 10 characters with letters and numbers' : undefined}>
              <Input type="password" autoComplete="new-password" value={pw} onChange={(_, d) => setPw(d.value)} />
            </Field>
            <Field label="Repeat password" required validationMessage={pw2 && pw2 !== pw ? 'Passwords do not match' : undefined}>
              <Input type="password" autoComplete="new-password" value={pw2} onChange={(_, d) => setPw2(d.value)} />
            </Field>
            <Button appearance="primary" type="submit" disabled={busy || weak || !pw || pw !== pw2}>Save and sign in</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
