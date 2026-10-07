import { Button, Card, Field, Input, makeStyles, Text, tokens } from '@fluentui/react-components';
import { useMutation } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Notice } from '@/components/Feedback';
import { useNotify } from '@/components/Notify';
import { PageHeader } from '@/components/PageHeader';
import { roleLabels } from '@/lib/format';

const useStyles = makeStyles({
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' },
  card: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  muted: { color: tokens.colorNeutralForeground3 },
});

/** My account: profile, two-step verification (TOTP) and password for local accounts (FR-01). */
export function AccountPage() {
  const s = useStyles();
  const notify = useNotify();
  const [params] = useSearchParams();
  const { me, publicConfig, refreshMe } = useAuth();
  const local = publicConfig?.authMode === 'local';
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });

  useEffect(() => {
    if (setup) QRCode.toDataURL(setup.otpauthUri, { width: 200, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [setup]);

  const start = useMutation({ mutationFn: () => api.post<{ secret: string; otpauthUri: string }>('/auth/mfa/setup'), onSuccess: setSetup });
  const enable = useMutation({
    mutationFn: () => api.post('/auth/mfa/enable', { code }),
    onSuccess: () => { notify('Two-step verification is on'); setSetup(null); setCode(''); void refreshMe(); },
  });
  const disable = useMutation({
    mutationFn: () => api.post('/auth/mfa/disable', { code }),
    onSuccess: () => { notify('Two-step verification is off'); setCode(''); void refreshMe(); },
  });
  const change = useMutation({
    mutationFn: () => api.post('/auth/password', { currentPassword: pw.current, newPassword: pw.next }),
    onSuccess: () => { notify('Password changed'); setPw({ current: '', next: '', repeat: '' }); },
  });
  if (!me) return null;

  return (
    <>
      <PageHeader title="My account" />
      {params.get('welcome') && <Notice intent="success" title="Welcome to MMS">Your password is set. Please turn on two-step verification below.</Notice>}
      <div className={s.grid}>
        <Card className={s.card}>
          <Text weight="semibold" size={400}>Profile</Text>
          <Text>{me.displayName}</Text>
          <Text className={s.muted}>{me.email}</Text>
          <Text>{me.roles.map((r) => roleLabels[r]).join(' · ')}</Text>
          <Text size={200} className={s.muted}>Sign-in: {publicConfig?.authMode === 'entra' ? 'University account (Microsoft Entra ID)' : 'Local account'}</Text>
        </Card>

        {local && (
          <Card className={s.card}>
            <Text weight="semibold" size={400}>Two-step verification</Text>
            {me.mfaEnabled ? (
              <>
                <Notice intent="success">On. You will be asked for a code from your authenticator app at sign-in.</Notice>
                <Field label="Current code (to turn it off)"><Input inputMode="numeric" maxLength={6} value={code} onChange={(_, d) => setCode(d.value.replace(/\D/g, ''))} /></Field>
                <ErrorBox error={disable.error} />
                <Button onClick={() => disable.mutate()} disabled={code.length !== 6}>Turn off</Button>
              </>
            ) : setup ? (
              <>
                <Text>Scan this QR code with Microsoft Authenticator (or any TOTP app), then enter the 6-digit code.</Text>
                {qr && <img src={qr} alt="QR code for your authenticator app" width={200} height={200} />}
                <Text size={200} className={s.muted}>Or enter this key manually: <code>{setup.secret}</code></Text>
                <Field label="Code from the app"><Input inputMode="numeric" maxLength={6} value={code} onChange={(_, d) => setCode(d.value.replace(/\D/g, ''))} /></Field>
                <ErrorBox error={enable.error} />
                <Button appearance="primary" onClick={() => enable.mutate()} disabled={code.length !== 6}>Turn on</Button>
              </>
            ) : (
              <>
                <Text className={s.muted}>Protect your account with a code from your phone.</Text>
                <ErrorBox error={start.error} />
                <Button appearance="primary" onClick={() => start.mutate()}>Set up</Button>
              </>
            )}
          </Card>
        )}

        {local && (
          <Card className={s.card}>
            <Text weight="semibold" size={400}>Change password</Text>
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(_, d) => setPw((p) => ({ ...p, current: d.value }))} /></Field>
            <Field label="New password" hint="At least 10 characters with letters and numbers"><Input type="password" autoComplete="new-password" value={pw.next} onChange={(_, d) => setPw((p) => ({ ...p, next: d.value }))} /></Field>
            <Field label="Repeat new password" validationMessage={pw.repeat && pw.repeat !== pw.next ? 'Passwords do not match' : undefined}>
              <Input type="password" autoComplete="new-password" value={pw.repeat} onChange={(_, d) => setPw((p) => ({ ...p, repeat: d.value }))} />
            </Field>
            <ErrorBox error={change.error} />
            <Button onClick={() => change.mutate()} disabled={!pw.current || pw.next.length < 10 || pw.next !== pw.repeat}>Change password</Button>
          </Card>
        )}
      </div>
    </>
  );
}
