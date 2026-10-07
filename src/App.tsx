import { FluentProvider } from '@fluentui/react-components';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { AppShell } from '@/components/AppShell';
import { Loading, Notice } from '@/components/Feedback';
import { homeFor } from '@/components/nav';
import { NotifyProvider } from '@/components/Notify';
import { YearProvider } from '@/components/YearContext';
import { darkTheme, lightTheme } from '@/lib/theme';
import { AccountPage } from '@/pages/AccountPage';
import { AdviseesPage } from '@/pages/AdviseesPage';
import { AuditPage } from '@/pages/admin/AuditPage';
import { DataPage } from '@/pages/admin/DataPage';
import { DeletedPage } from '@/pages/admin/DeletedPage';
import { HealthPage } from '@/pages/admin/HealthPage';
import { ImportPage } from '@/pages/admin/ImportPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InvitePage } from '@/pages/InvitePage';
import { LoginPage } from '@/pages/LoginPage';
import { MeetingFormPage } from '@/pages/MeetingFormPage';
import { MeetingViewPage } from '@/pages/MeetingViewPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { MyMeetingsPage } from '@/pages/MyMeetingsPage';
import { StudentPage } from '@/pages/StudentPage';
import { StudentsPage } from '@/pages/StudentsPage';

const THEME_KEY = 'mms.theme';

function useThemePreference(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved === 'dark';
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles)) {
    return <Notice intent="error" title="Not available">You do not have permission to open this page.</Notice>;
  }
  return <>{children}</>;
}

function Protected({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { status, me } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading label="Starting MMS…" />;
  if (status !== 'signedIn' || !me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <YearProvider>
      <AppShell dark={dark} onToggleTheme={onToggleTheme}>
        <Routes>
          <Route path="/" element={<Navigate to={homeFor(me.roles)} replace />} />
          <Route path="/advisees" element={<RequireRole roles={['AOS', 'DIRECTOR', 'PROG_LEAD']}><AdviseesPage /></RequireRole>} />
          <Route path="/dashboard" element={<RequireRole roles={['DIRECTOR', 'PROG_LEAD', 'ADMIN', 'AOS']}><DashboardPage /></RequireRole>} />
          <Route path="/students" element={<RequireRole roles={['ADMIN', 'DIRECTOR', 'PROG_LEAD', 'AOS']}><StudentsPage /></RequireRole>} />
          <Route path="/students/:id" element={<StudentPage />} />
          <Route path="/meetings/new" element={<RequireRole roles={['AOS', 'DIRECTOR', 'PROG_LEAD']}><MeetingFormPage /></RequireRole>} />
          <Route path="/meetings/:id/edit" element={<RequireRole roles={['AOS', 'DIRECTOR', 'PROG_LEAD']}><MeetingFormPage /></RequireRole>} />
          <Route path="/meetings/:id" element={<MeetingViewPage />} />
          <Route path="/my-meetings" element={<MyMeetingsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin/data" element={<RequireRole roles={['ADMIN', 'DIRECTOR', 'PROG_LEAD']}><DataPage /></RequireRole>} />
          <Route path="/admin/import" element={<RequireRole roles={['ADMIN', 'DIRECTOR']}><ImportPage /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole roles={['ADMIN']}><UsersPage /></RequireRole>} />
          <Route path="/admin/audit" element={<RequireRole roles={['ADMIN', 'DIRECTOR']}><AuditPage /></RequireRole>} />
          <Route path="/admin/deleted" element={<RequireRole roles={['ADMIN', 'DIRECTOR']}><DeletedPage /></RequireRole>} />
          <Route path="/admin/health" element={<RequireRole roles={['ADMIN']}><HealthPage /></RequireRole>} />
          <Route path="*" element={<Notice intent="warning" title="Page not found">Use the menu to find what you need.</Notice>} />
        </Routes>
      </AppShell>
    </YearProvider>
  );
}

export default function App() {
  const [dark, toggle] = useThemePreference();
  return (
    <FluentProvider theme={dark ? darkTheme : lightTheme} style={{ minHeight: '100vh' }}>
      <NotifyProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/*" element={<Protected dark={dark} onToggleTheme={toggle} />} />
        </Routes>
      </NotifyProvider>
    </FluentProvider>
  );
}
