import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icons';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastCtx = createContext<ToastApi>({ push: () => {}, success: () => {}, error: () => {}, info: () => {} });

const TONE: Record<ToastTone, { icon: IconName; cls: string; ring: string }> = {
  success: { icon: 'checkCircle', cls: 'text-emerald-600', ring: 'border-emerald-200 bg-emerald-50' },
  error: { icon: 'xCircle', cls: 'text-rose-600', ring: 'border-rose-200 bg-rose-50' },
  info: { icon: 'sparkles', cls: 'text-brand-600', ring: 'border-brand-200 bg-brand-50' },
  warning: { icon: 'alert', cls: 'text-amber-600', ring: 'border-amber-200 bg-amber-50' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3600);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, description) => push({ tone: 'success', title, description }),
      error: (title, description) => push({ tone: 'error', title, description }),
      info: (title, description) => push({ tone: 'info', title, description }),
    }),
    [push],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
        role="region"
        aria-label="Notifications"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lift animate-rise ${TONE[t.tone].ring}`}
          >
            <Icon name={TONE[t.tone].icon} size={18} className={`mt-0.5 shrink-0 ${TONE[t.tone].cls}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-ink-600">{t.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="ml-auto rounded p-1 text-ink-400 transition hover:bg-white/70 hover:text-ink-700"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
