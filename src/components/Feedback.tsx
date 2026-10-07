import { MessageBar, MessageBarBody, MessageBarTitle, Spinner } from '@fluentui/react-components';
import { errorMessage } from '@/api/client';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <Spinner size="medium" label={label} style={{ padding: 32 }} />;
}

export function ErrorBox({ error, title = 'Something went wrong' }: { error: unknown; title?: string }) {
  if (!error) return null;
  return (
    <MessageBar intent="error" role="alert" style={{ marginBottom: 12 }}>
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {errorMessage(error)}
      </MessageBarBody>
    </MessageBar>
  );
}

export function Notice({ intent = 'info', title, children }: { intent?: 'info' | 'success' | 'warning' | 'error'; title?: string; children: React.ReactNode }) {
  return (
    <MessageBar intent={intent} style={{ marginBottom: 12 }}>
      <MessageBarBody>
        {title && <MessageBarTitle>{title}</MessageBarTitle>}
        {children}
      </MessageBarBody>
    </MessageBar>
  );
}
