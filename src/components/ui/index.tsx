import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Icon, type IconName } from './Icons';
import { useScrollLock } from '../../lib/hooks';

/* ============================ Button ============================ */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-brand',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800',
  outline: 'border border-ink-300 bg-white text-ink-800 hover:border-brand-300 hover:text-brand-700',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[0.95rem] gap-2 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  trailing?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', icon, trailing, loading, fullWidth, children, className, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
      {trailing && !loading && <Icon name={trailing} size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}

/* ============================ Card ============================ */

export function Card({ children, className, hover, as: As = 'div', ...rest }: { children: ReactNode; className?: string; hover?: boolean; as?: 'div' | 'section' | 'article' | 'li' } & Record<string, unknown>) {
  return (
    <As className={cn('card', hover && 'card-hover', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name={icon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[0.95rem] font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
}

/* ============================ Badge ============================ */

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

export const DOT: Record<Tone, string> = {
  neutral: 'bg-ink-400', brand: 'bg-brand-500', success: 'bg-emerald-500',
  warning: 'bg-amber-500', danger: 'bg-rose-500', info: 'bg-sky-500',
};

export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', TONES[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export const statusTone = (s: string): Tone => {
  const map: Record<string, Tone> = {
    Published: 'success', Draft: 'warning', Archived: 'neutral',
    verified: 'success', pending: 'warning', rejected: 'danger', inactive: 'neutral',
    Easy: 'success', Medium: 'warning', Hard: 'danger',
  };
  return map[s] ?? 'neutral';
};

/* ============================ Form fields ============================ */

export function Field({ label, hint, error, required, children, className }: { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink-700">
        {label}
        {required && <span className="text-rose-500" aria-hidden="true">*</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[11px] font-medium text-rose-600">{error}</span>
        : hint ? <span className="mt-1 block text-[11px] text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('field', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('field min-h-24 resize-y', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn('field appearance-none pr-9', className)} {...rest}>{children}</select>
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field pl-9"
      />
    </div>
  );
}

/* ============================ Progress ============================ */

export function ProgressBar({ value, tone = 'brand', size = 'md', label }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; size?: 'sm' | 'md'; label?: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-500', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500',
  };
  const auto = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-brand-500' : value >= 35 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-[11px] font-medium text-ink-500">
          <span>{label}</span><span>{value}%</span>
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-ink-100', size === 'sm' ? 'h-1.5' : 'h-2.5')}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', tone === 'brand' ? auto : colors[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ============================ Modal ============================ */

export function Modal({
  open, onClose, title, description, children, footer, size = 'md', icon,
}: {
  open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl'; icon?: IconName;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 40);
    return () => { document.removeEventListener('keydown', onKey); window.clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-900/45 backdrop-blur-[2px] animate-fade" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full animate-pop overflow-hidden rounded-t-2xl bg-white shadow-lift sm:rounded-2xl',
          'max-h-[92vh] overflow-y-auto',
          widths[size],
        )}
      >
        <div className="flex items-start gap-3 border-b border-ink-200 px-5 py-4">
          {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon name={icon} size={18} /></span>}
          <div className="min-w-0 flex-1">
            <h3 id="modal-title" className="text-base font-semibold text-ink-900">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', loading,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string;
  confirmLabel?: string; tone?: 'danger' | 'primary'; loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon="alert"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={tone} loading={loading} onClick={onConfirm} data-autofocus>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{message}</p>
    </Modal>
  );
}

/* ============================ Tabs ============================ */

export function Tabs<T extends string>({ tabs, active, onChange, className }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-xl border border-ink-200 bg-white p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            active === t.id ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active === t.id ? 'bg-white/20' : 'bg-ink-100 text-ink-600')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ============================ StatCard ============================ */

export function StatCard({ label, value, hint, icon, tone = 'brand', trend }: {
  label: string; value: ReactNode; hint?: string; icon: IconName;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'; trend?: number;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600', success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600', danger: 'bg-rose-50 text-rose-600',
    info: 'bg-sky-50 text-sky-600', neutral: 'bg-ink-100 text-ink-600',
  };
  return (
    <Card className="p-4" hover>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
        </div>
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      {typeof trend === 'number' && (
        <p className={cn('mt-2 inline-flex items-center gap-1 text-[11px] font-semibold', trend >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
          <Icon name={trend >= 0 ? 'chevronDown' : 'chevronDown'} size={12} className={trend >= 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}% vs last week
        </p>
      )}
    </Card>
  );
}

/* ============================ DataTable ============================ */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({ columns, rows, keyFn, empty, loading }: {
  columns: Column<T>[]; rows: T[]; keyFn: (row: T) => string; empty?: ReactNode; loading?: boolean;
}) {
  if (loading) return <TableSkeleton rows={5} cols={columns.length} />;
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50 text-left">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500', c.headerClassName ?? c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFn(row)} className="border-b border-ink-100 transition-colors last:border-0 hover:bg-brand-50/40">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 align-middle text-ink-700', c.className)}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================ States ============================ */

export function EmptyState({ icon = 'grid', title, message, action, className }: { icon?: IconName; title: string; message?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-xs text-ink-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 px-6 py-12 text-sm text-ink-500', className)} role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorState({ message = 'Unable to load this data.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><Icon name="alert" size={24} /></span>
      <h3 className="mt-4 text-sm font-semibold text-ink-900">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-xs text-ink-500">{message}</p>
      {onRetry && <Button className="mt-4" size="sm" variant="outline" icon="refresh" onClick={onRetry}>Try Again</Button>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-8 flex-1" style={{ animationDelay: `${(r * cols + c) * 40}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-28" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

/* ============================ Pagination ============================ */

export function Pagination({ page, totalPages, onPage, totalItems, pageSize }: { page: number; totalPages: number; onPage: (p: number) => void; totalItems: number; pageSize: number }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-4 py-3">
      <p className="text-xs text-ink-500">Showing <span className="font-semibold text-ink-700">{from}–{to}</span> of {totalItems}</p>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" icon="chevronLeft" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        {Array.from({ length: totalPages }).map((_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center gap-1">
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
              <button
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn('h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition', p === page ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100')}
              >
                {p}
              </button>
            </span>
          ))}
        <Button size="sm" variant="outline" icon="chevronRight" disabled={page === totalPages} onClick={() => onPage(page + 1)} aria-label="Next page" />
      </div>
    </div>
  );
}

/* ============================ Misc ============================ */

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${h} 62% 52%), hsl(${(h + 40) % 360} 62% 42%))` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">{eyebrow}</p>}
        <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const [id] = useState(() => `tg-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-ink-300')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      <span id={`${id}-label`} className="text-sm text-ink-700">{label}</span>
    </div>
  );
}
