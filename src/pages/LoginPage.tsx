import { Button, Card, Divider, Field, Input, makeStyles, Text, tokens } from '@fluentui/react-components';
import { LockClosed20Regular } from '@fluentui/react-icons';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorBox, Notice } from '@/components/Feedback';
import { homeFor } from '@/components/nav';

const useStyles = makeStyles({
  page: {
    minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '16px',
    background: `linear-gradient(160deg, ${tokens.colorBrandBackground} 0%, ${tokens.colorBrandBackgroundPressed} 100%)`,
  },
  card: { width: '100%', maxWidth: '420px', padding: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' },
  muted: { color: tokens.colorNeutralForeground3 },
});

/** S1 Sign in: university account (Entra ID) or email + password + MFA code (FR-01). */
export function LoginPage() {
  const s = useStyles();
  const { status, me, publicConfig, notice, loginLocal, verifyMfa, loginEntra } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'signedIn' && me) return <Navigate to={homeFor(me.roles)} replace />;
  const entra = publicConfig?.authMode === 'entra';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (challenge) {
        await verifyMfa(challenge, code);
      } else {
        const r = await loginLocal(email.trim(), password);
        if (r.mfaRequired && r.challengeToken) setChallenge(r.challengeToken);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <Card className={s.card}>
        <Text as="h1" size={600} weight="semibold">Mentor Management System</Text>
        <Text className={s.muted}>Graduate Apprenticeships · University of Dundee</Text>
        {notice && <div style={{ marginTop: 12 }}><Notice intent="warning">{notice}</Notice></div>}
        {status === 'error' && <Notice intent="error">The MMS server is not reachable.</Notice>}
        {entra ? (
          <div className={s.form}>
            <Button appearance="primary" size="large" icon={<LockClosed20Regular />} onClick={() => loginEntra().catch((e) => setError(e))}>
              Sign in with university account
            </Button>
            <Text size={200} className={s.muted}>You will be redirected to Microsoft to sign in with your UoD account.</Text>
            <ErrorBox error={error} title="Sign-in failed" />
          </div>
        ) : (
          <form className={s.form} onSubmit={submit} noValidate>
            {error ? <ErrorBox error={error} title="Sign-in failed" /> : null}
            {!challenge ? (
              <>
                <Field label="University email" required>
                  <Input type="email" autoComplete="username" value={email} onChange={(_, d) => setEmail(d.value)} autoFocus />
                </Field>
                <Field label="Password" required>
                  <Input type="password" autoComplete="current-password" value={password} onChange={(_, d) => setPassword(d.value)} />
                </Field>
              </>
            ) : (
              <Field label="Authentication code" hint="Enter the 6-digit code from your authenticator app." required>
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                  onChange={(_, d) => setCode(d.value.replace(/\D/g, ''))} autoFocus />
              </Field>
            )}
            <Button appearance="primary" size="large" type="submit" disabled={busy || (!challenge && (!email || !password)) || (!!challenge && code.length !== 6)}>
              {busy ? 'Signing in…' : challenge ? 'Verify' : 'Sign in'}
            </Button>
            {challenge && <Button appearance="subtle" onClick={() => { setChallenge(null); setCode(''); }}>Back</Button>}
            <Divider />
            <Text size={200} className={s.muted}>
              Accounts are created by the GA Administrator. Forgotten your password? Ask them to send you a new invitation.
            </Text>
          </form>
        )}
      </Card>
    </div>
  );
}
