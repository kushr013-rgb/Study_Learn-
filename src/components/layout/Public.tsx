import { useEffect, useState } from 'react';
import { Link } from '../../lib/router';
import { cn } from '../../utils/cn';
import { Icon } from '../ui/Icons';
import { Button } from '../ui';
import { Logo } from './AppShell';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#tests', label: 'Mock Tests' },
  { href: '#analytics', label: 'Analytics' },
  { href: '#how', label: 'How it works' },
];

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('sticky top-0 z-50 transition-all', scrolled ? 'border-b border-ink-200 bg-white/90 backdrop-blur' : 'bg-transparent')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Landing page sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="md">Log in</Button>
          </Link>
          <Link to="/register">
            <Button size="md" trailing="arrowRight">Get Started</Button>
          </Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} className="rounded-lg p-2 text-ink-600 lg:hidden">
            <Icon name={open ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-ink-200 bg-white px-4 py-3 lg:hidden" aria-label="Mobile sections">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Log in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-500">
            A focused practice and assessment workspace for JEE, NEET, Class 10 and Class 12 aspirants.
            Practice by topic, test under real exam conditions and fix every mistake.
          </p>
          <p className="mt-4 text-xs text-ink-400">© {new Date().getFullYear()} Astra Prep. Prototype build — no live data.</p>
        </div>
        {[
          { title: 'Exams', items: ['JEE Main & Advanced', 'NEET UG', 'Class 10 Boards', 'Class 12 Boards'] },
          { title: 'Platform', items: ['Practice', 'Mock Tests', 'Performance Analytics', 'Mistake Book'] },
          { title: 'Company', items: ['About', 'Careers', 'Privacy Policy', 'Terms of Use'] },
        ].map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.items.map((i) => (
                <li key={i}>
                  <span className="text-sm text-ink-500 transition hover:text-brand-600">{i}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
