import { Toast, ToastBody, Toaster, ToastTitle, useId, useToastController } from '@fluentui/react-components';
import { createContext, useCallback, useContext, type ReactNode } from 'react';

type Intent = 'success' | 'error' | 'info' | 'warning';
const NotifyContext = createContext<(title: string, intent?: Intent, body?: string) => void>(() => {});

export function NotifyProvider({ children }: { children: ReactNode }) {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);
  const notify = useCallback(
    (title: string, intent: Intent = 'success', body?: string) =>
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {body && <ToastBody>{body}</ToastBody>}
        </Toast>,
        { intent, timeout: intent === 'error' ? 8000 : 4000 },
      ),
    [dispatchToast],
  );
  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Toaster toasterId={toasterId} position="top-end" />
    </NotifyContext.Provider>
  );
}

export const useNotify = () => useContext(NotifyContext);
