import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

/* ---------------------------------------------------------------------------
 * Minimal hash-based router.
 * Hash routing is used on purpose: the production build is a single HTML file,
 * so deep links must survive without a server rewrite rule.
 * ------------------------------------------------------------------------- */

type Params = Record<string, string>;

interface RouterValue {
  path: string;
  params: Params;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterCtx = createContext<RouterValue>({ path: '/', params: {}, navigate: () => {} });

function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function match(pattern: string, path: string): Params | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i].toLowerCase() !== s[i].toLowerCase()) return null;
  }
  return params;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const next = `#${to.startsWith('/') ? to : `/${to}`}`;
    if (opts?.replace) {
      window.history.replaceState(null, '', next);
      setPath(currentPath());
    } else {
      window.location.hash = next;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const value = useMemo(() => ({ path, params: {}, navigate }), [path, navigate]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}

export function useRouter(): RouterValue {
  return useContext(RouterCtx);
}

/** Returns params when `pattern` matches the active path, otherwise null. */
export function useMatch(pattern: string): Params | null {
  const { path } = useRouter();
  return match(pattern, path);
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate, path } = useRouter();
  const active = path === to || (to !== '/' && path.startsWith(`${to}/`));
  return (
    <a
      href={`#${to}`}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
