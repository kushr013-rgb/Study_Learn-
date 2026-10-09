/* ---------------------------------------------------------------------------
 * Runtime data-source configuration.
 *
 * The whole app reads data through the service layer. Each service checks
 * `USE_API` and either hits the mock localStorage database (prototype mode)
 * or the REST backend (production mode).
 *
 * To go live:
 *   1. Create a `.env` file with VITE_USE_API=true and VITE_API_BASE_URL=...
 *   2. Implement the endpoints listed in DATABASE_INTEGRATION.md
 *   3. Nothing in `src/pages` or `src/components` needs to change.
 * ------------------------------------------------------------------------- */

interface RuntimeEnv {
  VITE_USE_API?: string;
  VITE_API_BASE_URL?: string;
}

const env = ((import.meta as unknown as { env?: RuntimeEnv }).env ?? {}) as RuntimeEnv;

/** When false the app runs entirely on seeded localStorage data. */
export const USE_API = env.VITE_USE_API === 'true';

/** Base URL of the REST backend, e.g. https://api.astraprep.com/v1 */
export const API_BASE_URL = env.VITE_API_BASE_URL ?? '/api/v1';

/** Simulated latency for the mock layer so loading states stay realistic. */
export const MOCK_LATENCY_MS = 180;

/** Key names used by the prototype's local persistence. */
export const STORAGE_KEYS = {
  database: 'astraprep.db.v1',
  session: 'astraprep.session',
} as const;
