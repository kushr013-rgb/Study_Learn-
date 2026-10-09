import { useCallback, useEffect, useRef, useState } from 'react';
import { delay } from '../services/db';

/** Async data hook that models loading / error / success states for the UI. */
export function useAsync<T>(fn: () => T, deps: unknown[], ms = 180) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    delay(ms)
      .then(() => {
        if (!alive) return;
        try {
          const result = fnRef.current();
          setData(result ?? null);
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
          if (alive) setLoading(false);
        }
      })
      .catch(() => { if (alive) { setError('Unable to load data'); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, ms]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, retry, setData };
}

/** Countdown timer helper used by the test engine (returns seconds left). */
export function useCountdown(totalSeconds: number, onComplete: () => void, running = true) {
  const [left, setLeft] = useState(totalSeconds);
  const cb = useRef(onComplete);
  cb.current = onComplete;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          cb.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return left;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/** Locks body scroll while a modal / drawer is open. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
