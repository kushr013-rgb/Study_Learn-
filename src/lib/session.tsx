import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { demoAuth, type PublicUser } from '../services/authService';
import { useDB } from '../services/db';
import { useRouter } from './router';

/* Session context — reads the active session from sessionStorage and keeps the
 * user record reactive against the mock database. */

interface SessionValue {
  user: PublicUser | null;
  logout: () => void;
  homePath: string;
}

const SessionCtx = createContext<SessionValue>({ user: null, logout: () => {}, homePath: '/' });

export const ROLE_HOME: Record<string, string> = {
  student: '/student/dashboard',
  faculty: '/faculty/dashboard',
  admin: '/admin/dashboard',
};

export function SessionProvider({ children }: { children: ReactNode }) {
  useDB(); // re-render when the mock database changes
  const { navigate } = useRouter();
  const user = demoAuth.currentUser();

  const value = useMemo<SessionValue>(
    () => ({
      user,
      logout: () => {
        demoAuth.logout();
        navigate('/login');
      },
      homePath: user ? ROLE_HOME[user.role] : '/',
    }),
    [user, navigate],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionCtx);
}

/**
 * Guard for role-protected routes.
 * Redirects inside an effect (never during render) to keep React's rules happy.
 */
export function useGuard(role: 'student' | 'faculty' | 'admin'): PublicUser | null {
  const { user } = useSession();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== role) navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
  }, [user, role, navigate]);

  return user && user.role === role ? user : null;
}
