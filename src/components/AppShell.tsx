import {
  Avatar, Badge, Button, makeStyles, Menu, MenuDivider, MenuItem, MenuList, MenuPopover, MenuTrigger, Select,
  shorthands, Text, tokens, Tooltip,
} from '@fluentui/react-components';
import {
  Board20Regular, Chat20Regular, DataUsage20Regular, Database20Regular, DismissRegular, History20Regular,
  Navigation20Regular, People20Regular, PeopleTeam20Regular, Person20Regular, ArrowUpload20Regular,
  Delete20Regular, HeartPulse20Regular, WeatherMoon20Regular, WeatherSunny20Regular, SignOut20Regular,
  DocumentBulletList20Regular,
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactElement, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { endpoints } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { roleLabels } from '@/lib/format';
import { NAV } from './nav';
import { useYear } from './YearContext';

const ICONS: Record<string, ReactElement> = {
  '/advisees': <PeopleTeam20Regular />,
  '/dashboard': <Board20Regular />,
  '/students': <People20Regular />,
  '/my-meetings': <DocumentBulletList20Regular />,
  '/messages': <Chat20Regular />,
  '/admin/data': <Database20Regular />,
  '/admin/import': <ArrowUpload20Regular />,
  '/admin/users': <Person20Regular />,
  '/admin/audit': <History20Regular />,
  '/admin/deleted': <Delete20Regular />,
  '/admin/health': <HeartPulse20Regular />,
};

const useStyles = makeStyles({
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: tokens.colorNeutralBackground2 },
  skip: {
    position: 'absolute', left: '-999px', top: '8px', zIndex: 100, padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground1, ':focus': { left: '8px' },
  },
  top: {
    height: '56px', display: 'flex', alignItems: 'center', gap: '12px', ...shorthands.padding('0', '16px'),
    backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, position: 'sticky', top: 0, zIndex: 10,
  },
  brand: { display: 'flex', flexDirection: 'column', lineHeight: '1.1', color: tokens.colorNeutralForegroundOnBrand, textDecoration: 'none' },
  spacer: { flexGrow: 1 },
  yearSelect: { minWidth: '120px' },
  body: { display: 'flex', flexGrow: 1, minHeight: 0 },
  nav: {
    width: '232px', flexShrink: 0, backgroundColor: tokens.colorNeutralBackground1, ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('12px', '8px'), display: 'flex', flexDirection: 'column', gap: '2px',
    '@media (max-width: 900px)': { position: 'fixed', top: '56px', bottom: 0, left: 0, zIndex: 20, transform: 'translateX(-100%)', transitionProperty: 'transform', transitionDuration: '150ms' },
  },
  navOpen: { '@media (max-width: 900px)': { transform: 'translateX(0)', boxShadow: tokens.shadow28 } },
  menuBtn: { display: 'none', '@media (max-width: 900px)': { display: 'inline-flex' } },
  section: { ...shorthands.padding('12px', '12px', '4px'), color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, textTransform: 'uppercase', letterSpacing: '0.04em' },
  link: {
    display: 'flex', alignItems: 'center', gap: '10px', ...shorthands.padding('8px', '12px'), ...shorthands.borderRadius(tokens.borderRadiusMedium),
    color: tokens.colorNeutralForeground1, textDecoration: 'none', minHeight: '40px',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  active: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold },
  main: { flexGrow: 1, minWidth: 0, ...shorthands.padding('24px'), '@media (max-width: 600px)': { ...shorthands.padding('16px') } },
  onBrand: { color: tokens.colorNeutralForegroundOnBrand },
});

export function AppShell({ children, dark, onToggleTheme }: { children: ReactNode; dark: boolean; onToggleTheme: () => void }) {
  const s = useStyles();
  const { me, publicConfig, logout, hasRole } = useAuth();
  const { years, yearId, setYearId } = useYear();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const messaging = !!publicConfig?.messagingEnabled;
  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: () => endpoints.me().then((m) => m.unreadMessages),
    refetchInterval: 60_000,
    enabled: messaging,
  });

  if (!me) return null;
  const items = NAV.filter((n) => (n.roles === 'all' || hasRole(...n.roles))
    && (!n.feature || (n.feature === 'messaging' && messaging))
    && (!n.variant || n.variant === publicConfig?.variant));
  const main = items.filter((n) => n.section !== 'admin');
  const admin = items.filter((n) => n.section === 'admin');
  const showYear = hasRole('DIRECTOR', 'PROG_LEAD', 'ADMIN') && years.length > 0;

  const link = (n: (typeof NAV)[number]) => (
    <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
      className={({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)}>
      {ICONS[n.to] || <DataUsage20Regular />}
      <span>{n.label}</span>
      {n.to === '/messages' && !!unread && <Badge size="small" color="danger" aria-label={`${unread} unread`}>{unread}</Badge>}
    </NavLink>
  );

  return (
    <div className={s.root}>
      <a href="#main" className={s.skip}>Skip to content</a>
      <header className={s.top}>
        <Button className={s.menuBtn} appearance="transparent" aria-label={open ? 'Close menu' : 'Open menu'}
          icon={open ? <DismissRegular className={s.onBrand} /> : <Navigation20Regular className={s.onBrand} />}
          onClick={() => setOpen((o) => !o)} />
        <NavLink to="/" className={s.brand} aria-label="Mentor Management System home">
          <Text weight="semibold" size={400} className={s.onBrand}>MMS</Text>
          <Text size={200} className={s.onBrand}>Graduate Apprenticeships</Text>
        </NavLink>
        <div className={s.spacer} />
        {showYear && (
          <Select aria-label="Academic year" className={s.yearSelect} value={yearId ? String(yearId) : ''}
            onChange={(_, d) => setYearId(Number(d.value))} size="small">
            {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.current ? ' (current)' : ''}</option>)}
          </Select>
        )}
        {messaging && (
          <Tooltip content="Messages" relationship="label">
            <Button appearance="transparent" icon={<Chat20Regular className={s.onBrand} />} onClick={() => navigate('/messages')} />
          </Tooltip>
        )}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="transparent" aria-label="User menu" icon={<Avatar name={me.displayName} size={28} color="colorful" />} />
          </MenuTrigger>
          <MenuPopover>
            <div style={{ padding: '8px 12px' }}>
              <Text weight="semibold" block>{me.displayName}</Text>
              <Text size={200} block>{me.email}</Text>
              <Text size={200} block style={{ color: tokens.colorNeutralForeground3 }}>{me.roles.map((r) => roleLabels[r]).join(' · ')}</Text>
            </div>
            <MenuDivider />
            <MenuList>
              <MenuItem icon={<Person20Regular />} onClick={() => navigate('/account')}>My account</MenuItem>
              <MenuItem icon={dark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />} onClick={onToggleTheme}>
                {dark ? 'Light theme' : 'Dark theme'}
              </MenuItem>
              <MenuItem icon={<SignOut20Regular />} onClick={() => void logout()}>Sign out</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </header>
      <div className={s.body}>
        <nav className={open ? `${s.nav} ${s.navOpen}` : s.nav} aria-label="Main">
          {main.map(link)}
          {admin.length > 0 && <div className={s.section}>Administration</div>}
          {admin.map(link)}
        </nav>
        <main id="main" className={s.main} key={location.pathname} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
