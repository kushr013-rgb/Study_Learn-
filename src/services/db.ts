import { useSyncExternalStore } from 'react';
import type { Database } from '../lib/types';
import { createSeedDatabase } from '../data/seed';

/* ---------------------------------------------------------------------------
 * Mock persistence layer.
 * Acts as the "database" for this prototype. Every service reads/writes through
 * this module only, so replacing it with REST calls later requires no UI change.
 * ------------------------------------------------------------------------- */

const DB_KEY = 'astraprep.db.v2';
const DB_VERSION = 2;

interface Envelope {
  version: number;
  data: Database;
}

function load(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return createSeedDatabase();
    const parsed = JSON.parse(raw) as Envelope;
    if (parsed.version !== DB_VERSION || !parsed.data?.questions) return createSeedDatabase();
    // Forward-compatible defaults for collections added after the first release.
    return { ...createSeedDatabase(), ...parsed.data, curriculum: parsed.data.curriculum ?? [] };
  } catch {
    return createSeedDatabase();
  }
}

let state: Database = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({ version: DB_VERSION, data: state }));
  } catch {
    /* storage full / blocked — prototype keeps working in memory */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getDB(): Database {
  return state;
}

/** Apply a mutation to the mock database and notify subscribers. */
export function mutate(fn: (draft: Database) => void): Database {
  const draft: Database = JSON.parse(JSON.stringify(state));
  fn(draft);
  state = draft;
  persist();
  emit();
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetDB(): void {
  state = createSeedDatabase();
  persist();
  emit();
}

export function useDB(): Database {
  return useSyncExternalStore(subscribe, getDB, getDB);
}

/** Simulated network latency so pages can exercise real loading states. */
export const delay = (ms = 180) => new Promise<void>((r) => setTimeout(r, ms));

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}
