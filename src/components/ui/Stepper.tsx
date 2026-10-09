import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Icon } from './Icons';

/**
 * Compact accordion stepper.
 * Only the active step is expanded; completed steps collapse to a one-line
 * summary that can be tapped to reopen. Keeps long wizards readable on mobile.
 */
export function Step({
  n, label, summary, active, done, onOpen, children,
}: {
  n: number;
  label: string;
  summary?: string;
  active: boolean;
  done: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border transition', active ? 'border-brand-300 bg-white shadow-card' : 'border-ink-200 bg-white')}>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={active}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-50"
      >
        <span className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition',
          done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600',
        )}>
          {done && !active ? <Icon name="check" size={14} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-ink-500">{label}</span>
          {summary && <span className="mt-0.5 block truncate text-sm font-semibold text-ink-900">{summary}</span>}
        </span>
        <Icon name={active ? 'chevronDown' : 'chevronRight'} size={16} className="shrink-0 text-ink-400" />
      </button>
      {active && <div className="border-t border-ink-100 px-4 py-4">{children}</div>}
    </div>
  );
}

/** Pill-style single choice — replaces long dropdowns for short option lists. */
export function PillGroup<T extends string | number>({
  options, value, onChange, label, columns,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  columns?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('gap-2', columns ? 'grid grid-cols-2 sm:grid-cols-4' : 'flex flex-wrap')}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition',
            value === o.value
              ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-300'
              : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200 hover:bg-ink-50',
          )}
        >
          {o.label}
          {o.hint && <span className="mt-0.5 block text-[10px] font-medium text-ink-400">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** Searchable single-select list with counts — for long lists like chapters. */
export function SearchableList({
  items, value, onChange, placeholder, emptyLabel,
}: {
  items: { value: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200">
      <div className="relative border-b border-ink-200">
        <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full border-0 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-ink-400"
          onChange={(e) => {
            const q = e.target.value.toLowerCase();
            const list = document.querySelectorAll<HTMLElement>('[data-searchable-item]');
            list.forEach((el) => {
              el.style.display = (el.dataset.searchValue ?? '').toLowerCase().includes(q) ? '' : 'none';
            });
          }}
        />
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {items.length === 0 && <li className="px-4 py-6 text-center text-xs text-ink-400">{emptyLabel}</li>}
        {items.map((it) => (
          <li key={it.value} data-searchable-item data-search-value={it.value}>
            <button
              type="button"
              onClick={() => onChange(it.value)}
              aria-pressed={value === it.value}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition',
                value === it.value ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{it.value}</span>
              {typeof it.count === 'number' && (
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                  it.count > 0 ? 'bg-ink-100 text-ink-600' : 'bg-amber-50 text-amber-600')}>
                  {it.count}q
                </span>
              )}
              {value === it.value && <Icon name="check" size={14} className="shrink-0 text-brand-600" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
