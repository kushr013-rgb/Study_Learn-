import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { ROLE_TOUR } from '../lib/nav';
import { Button, Modal } from './ui';
import { Icon } from './ui/Icons';

const KEY = (role: string) => `astraprep.tour.${role}`;

/**
 * One-time welcome card explaining the three things this role can do.
 * Dismissal is remembered per role so it never nags.
 */
export function WelcomeTour({ role }: { role: 'student' | 'faculty' | 'admin' }) {
  const [open, setOpen] = useState(false);
  const tour = ROLE_TOUR[role];

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY(role))) setOpen(true);
    } catch { /* storage blocked — skip the tour */ }
  }, [role]);

  const dismiss = () => {
    try { localStorage.setItem(KEY(role), '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!tour) return null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={tour.title}
      description="Three things to try first. You can reopen this any time from the help button."
      size="lg"
      icon="sparkles"
      footer={<Button onClick={dismiss} data-autofocus>Got it, let&apos;s go</Button>}
    >
      <ol className="space-y-3">
        {tour.steps.map((s, i) => (
          <li key={s.title}>
            <Link
              to={s.to}
              onClick={dismiss}
              className="flex items-start gap-3 rounded-xl border border-ink-200 p-3.5 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={s.icon} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{i + 1}. {s.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{s.body}</span>
              </span>
              <Icon name="chevronRight" size={16} className="mt-2 shrink-0 text-ink-300" />
            </Link>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

/** Header help button that replays the tour. */
export function HelpButton({ role }: { role: 'student' | 'faculty' | 'admin' }) {
  const [open, setOpen] = useState(false);
  const tour = ROLE_TOUR[role];
  if (!tour) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help and quick tour"
        title="Help"
        className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-brand-600"
      >
        <Icon name="quiz" size={18} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tour.title}
        description="Quick reminder of what you can do here."
        size="lg"
        icon="sparkles"
        footer={<Button onClick={() => setOpen(false)} data-autofocus>Close</Button>}
      >
        <ol className="space-y-3">
          {tour.steps.map((s, i) => (
            <li key={s.title}>
              <Link
                to={s.to}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-xl border border-ink-200 p-3.5 transition hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={s.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">{i + 1}. {s.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{s.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3">
          <p className="text-[11px] text-ink-600">
            <b>Demo logins</b> — student@demo.com · faculty@demo.com · admin@demo.com (password <code className="rounded bg-white px-1">123456</code>)
          </p>
        </div>
      </Modal>
    </>
  );
}
