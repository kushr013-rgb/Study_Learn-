import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouter } from '../../lib/router';
import { MOBILE_NAV, NAV, ROLE_LABEL } from '../../lib/nav';
import { useSession } from '../../lib/session';
import { cn } from '../../utils/cn';
import { Icon } from '../ui/Icons';
import { Avatar, Badge, Button } from '../ui';
import { useScrollLock } from '../../lib/hooks';
import { HelpButton, WelcomeTour } from '../WelcomeTour';

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="Astra Prep home">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 17 10 11l4 4 6-7" />
          <path d="M15 5h5v5" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-extrabold tracking-tight text-ink-900">Astra<span className="text-brand-600">Prep</span></span>
          <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-ink-400">Practice · Assess · Improve</span>
        </span>
      )}
    </Link>
  );
}

function SidebarNav({ role, onNavigate }: { role: 'student' | 'faculty' | 'admin'; onNavigate?: () => void }) {
  const { path } = useRouter();
  return (
    <nav className="space-y-6 px-3 py-4" aria-label="Main navigation">
      {NAV[role].map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      active
                        ? 'bg-brand-50 text-brand-700 shadow-[inset_2px_0_0_0_var(--color-brand-600)]'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                    )}
                  >
                    <Icon name={item.icon} size={17} className={active ? 'text-brand-600' : 'text-ink-400'} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  role, children, title, subtitle, actions, wide,
}: {
  role: 'student' | 'faculty' | 'admin';
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  wide?: boolean;
}) {
  const { user, logout } = useSession();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const { path } = useRouter();
  useScrollLock(drawer);

  useEffect(() => { setDrawer(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(false); setMenu(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const mobileItems = MOBILE_NAV[role] ?? [];

  return (
    <div className="min-h-screen bg-ink-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lift">
        Skip to content
      </a>
      <WelcomeTour role={role} />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-ink-200 px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav role={role} />
        </div>
        <div className="border-t border-ink-200 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-2.5">
            <Avatar name={user?.name ?? 'User'} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink-900">{user?.name}</p>
              <p className="text-[10px] text-ink-500">{ROLE_LABEL[role]}</p>
            </div>
            <button type="button" onClick={logout} aria-label="Log out" title="Log out" className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white hover:text-rose-600">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile / tablet drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-ink-900/45 animate-fade" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside className="relative h-full w-[280px] max-w-[85vw] animate-rise bg-white shadow-lift" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="flex h-16 items-center justify-between border-b border-ink-200 px-4">
              <Logo />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-8rem)] overflow-y-auto">
              <SidebarNav role={role} onNavigate={() => setDrawer(false)} />
            </div>
            <div className="border-t border-ink-200 p-3">
              <Button variant="outline" fullWidth icon="logout" onClick={logout}>Log out</Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-[260px]">
        <header className="no-print sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawer}
              className="rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 lg:hidden"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-ink-900 sm:text-base">{title}</h1>
              {subtitle && <p className="hidden truncate text-xs text-ink-500 sm:block">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden lg:block">
                <Badge tone="brand" dot>{ROLE_LABEL[role]}</Badge>
              </span>
              {actions}
              <HelpButton role={role} />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenu((m) => !m)}
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  aria-label="Account menu"
                  className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-ink-100"
                >
                  <Avatar name={user?.name ?? 'User'} size={32} />
                  <Icon name="chevronDown" size={14} className="hidden text-ink-400 sm:block" />
                </button>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
                    <div role="menu" className="absolute right-0 top-11 z-20 w-56 animate-pop overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lift">
                      <div className="border-b border-ink-200 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
                        <p className="truncate text-xs text-ink-500">{user?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={role === 'student' ? '/student/profile' : `/${role}/dashboard`}
                          role="menuitem"
                          onClick={() => setMenu(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100"
                        >
                          <Icon name="user" size={15} /> My profile
                        </Link>
                        <Link to="/" role="menuitem" onClick={() => setMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100">
                          <Icon name="grid" size={15} /> Landing page
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { setMenu(false); logout(); }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                        >
                          <Icon name="logout" size={15} /> Log out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main id="main" className={cn('px-4 pb-24 pt-5 sm:px-6 sm:pb-10', wide ? 'max-w-[1600px]' : 'mx-auto max-w-[1180px]')}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="flex">
          {mobileItems.map((item) => {
            const active = item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition', active ? 'text-brand-600' : 'text-ink-500')}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
