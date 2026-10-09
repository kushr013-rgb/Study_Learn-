# Database Integration Guide — Astra Prep

This prototype ships with **no database**. All data lives in `localStorage` behind a
service layer. This document lists exactly what you need to connect a real database,
and why the UI will not need to be rewritten.

---

## 1. Current architecture

```
React pages/components
        ↓   (never touch data directly)
Service layer            src/services/*.ts
        ↓
Mock database            src/services/db.ts  →  localStorage
        ↓
Seed data                src/data/*.ts
```

## 2. Target architecture

```
React pages/components   ← UNCHANGED
        ↓
Service layer            ← same function names, bodies swapped
        ↓
apiClient.ts             ← already written (src/services/apiClient.ts)
        ↓
REST API (Node/Express)
        ↓
MongoDB / PostgreSQL
```

**The contract between the UI and the services is the thing that keeps the UI stable.**
Every service function already returns plain domain objects defined in `src/lib/types.ts`.
As long as your API returns the same shapes, the screens keep working.

---

## 3. What you need to provide

### 3.1 Infrastructure

| Item | Purpose | Example |
|---|---|---|
| Database server | Persistent storage | MongoDB Atlas / PostgreSQL 16 |
| Connection string | Auth + host | `mongodb+srv://user:pass@cluster/astraprep` |
| Backend runtime | REST API host | Node.js 20 + Express |
| Session store | Server-side sessions | Redis or DB-backed `connect-mongo` |
| Password hashing | Credential security | `bcrypt` (cost ≥ 12) or `argon2id` |
| CORS origin | Browser access | `https://app.astraprep.com` |
| TLS certificate | HTTPS only | Let's Encrypt / managed |

### 3.2 Environment variables

**Frontend** — create `.env` in the project root:

```bash
VITE_USE_API=true
VITE_API_BASE_URL=https://api.astraprep.com/v1
```

`src/services/config.ts` already reads these. When `VITE_USE_API` is `false` or absent,
the app silently falls back to the mock layer — so the demo keeps working.

**Backend** — never commit these:

```bash
DATABASE_URL=mongodb+srv://user:pass@cluster/astraprep
SESSION_SECRET=<64-byte random hex>
JWT_REFRESH_SECRET=<64-byte random hex>
CORS_ORIGIN=https://app.astraprep.com
NODE_ENV=production
BCRYPT_ROUNDS=12
```

---

## 4. Database schema

Mirrors `src/lib/types.ts` exactly. MongoDB collections shown; the same fields map
cleanly to SQL tables.

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | primary key |
| `name` | string | required |
| `email` | string | **unique index**, lowercase |
| `mobile` | string | unique index |
| `passwordHash` | string | bcrypt — **never store plaintext** |
| `role` | enum | `student` \| `faculty` \| `admin` |
| `exam` | enum | `JEE` \| `NEET` \| `Class 10` \| `Class 12` |
| `classLevel` | string | |
| `subjects` | string[] | |
| `status` | enum | `verified` \| `pending` \| `rejected` \| `inactive` |
| `streak` | number | |
| `createdAt` / `updatedAt` | Date | |

> **Important:** the prototype's `User.password` field must become `passwordHash`
> and must never be returned by the API. `authService.strip()` already removes it
> on the client — do the same server-side with a projection.

### `questions`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `exam`, `subject`, `chapter`, `topic` | string | **compound index** on these four |
| `difficulty` | enum | `Easy` \| `Medium` \| `Hard` |
| `type` | enum | `MCQ` \| `Numerical` |
| `text` | string | |
| `options` | string[] | length 4 for MCQ |
| `answer` | number \| string | **exclude from student-facing responses** |
| `marks`, `negative` | number | |
| `explanation` | string | only send after submission |
| `status` | enum | `Draft` \| `Published` \| `Archived` |
| `createdBy` | ObjectId → users | |
| `usage` | number | increment on attempt |

Indexes:
```js
db.questions.createIndex({ exam: 1, subject: 1, chapter: 1, topic: 1, status: 1 })
db.questions.createIndex({ status: 1, difficulty: 1 })
db.questions.createIndex({ text: 'text' })   // search
```

### `tests`
`name, exam, subject, type, duration, totalMarks, difficulty, questionIds[], status, createdBy, attempts, createdAt`

### `attempts`
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → users | **index** |
| `testId` | ObjectId → tests \| `"practice"` | |
| `mode` | enum | `test` \| `practice` \| `mistake` \| `daily` |
| `questionIds` | ObjectId[] | |
| `answers` | Map\<questionId, {selected, correct, timeSpent, status}\> | |
| `score`, `maxScore`, `correct`, `wrong`, `skipped`, `accuracy`, `timeTaken` | number | computed **server-side** |
| `submittedAt` | Date | index (descending) |

### `mistakes`
`userId, questionId, wrongAnswer, attemptCount, resolved, resolvedAt, sourceTest, createdAt`
```js
db.mistakes.createIndex({ userId: 1, questionId: 1 }, { unique: true })
```

### `settings`
Single document: `platformName, weakAreaThreshold, targetTimePerQuestion, maintenance`

---

## 5. REST endpoints required

Response envelope: `{ "data": ..., "meta": { ... } }`. Errors: `{ "message", "code", "details" }`.

### Auth — replaces `authService.demoAuth`
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| POST | `/auth/login` | `{email, password}` | `User` + sets httpOnly cookie |
| POST | `/auth/register` | `{name,email,mobile,password,exam,classLevel,subject}` | `User` + cookie |
| POST | `/auth/logout` | — | `204` |
| POST | `/auth/refresh` | — | rotates session cookie |
| GET | `/auth/me` | — | `User` (current session) |
| POST | `/auth/forgot-password` | `{email}` | `202` (always, to avoid user enumeration) |
| PATCH | `/users/:id` | partial `User` | updated `User` |

### Questions — replaces `questionService`
| Method | Path | Notes |
|---|---|---|
| GET | `/questions` | `?exam&subject&chapter&topic&difficulty&status&search&page&pageSize` |
| GET | `/questions/:id` | |
| GET | `/questions/stats` | counts by status / difficulty / exam |
| GET | `/questions/practice-set` | `?exam&subject&chapter&topic&difficulty&count` → **strip `answer` and `explanation`** |
| POST | `/questions` | faculty/admin only |
| PATCH | `/questions/:id` | |
| PATCH | `/questions/:id/status` | `{status}` |
| DELETE | `/questions/:id` | also pull from `tests.questionIds` |

### Tests — replaces `testService`
`GET /tests`, `GET /tests/:id`, `GET /tests/:id/questions`, `POST /tests`,
`PATCH /tests/:id`, `PATCH /tests/:id/status`, `DELETE /tests/:id`,
`POST /tests/generate` (random selection by easy/medium/hard counts).

### Attempts — replaces `attemptService`
| Method | Path | Notes |
|---|---|---|
| POST | `/attempts` | **server computes score** — see §6 |
| GET | `/attempts` | `?userId&page` |
| GET | `/attempts/:id` | |
| GET | `/mistakes` | `?userId&resolved` |
| POST | `/mistakes/:questionId/reattempt` | `{selected}` → `{resolved: boolean}` |
| DELETE | `/mistakes/:questionId` | |

### Analytics — replaces `analyticsService`
Compute with aggregation pipelines, **do not** ship raw attempts to the browser.

`GET /analytics/overview`, `/analytics/trends`, `/analytics/subjects`,
`/analytics/chapters`, `/analytics/difficulty`, `/analytics/time`,
`/analytics/weak-areas?threshold=`, `/analytics/weekly`,
`/analytics/platform`, `/analytics/batches`, `/analytics/question-usage`.

### Admin
`GET /admin/students`, `PATCH /admin/students/:id/status`,
`GET /admin/faculty`, `POST /admin/faculty`, `PATCH /admin/faculty/:id`,
`GET /admin/verification`, `PATCH /admin/verification/:id`,
`GET /settings`, `PATCH /settings`.

---

## 6. Rules that MUST move to the server

These are currently in the browser. Leaving them client-side in production is a
correctness and cheating risk.

1. **Scoring** (`attemptService.submit`) — the client must send only
   `{testId, answers: {questionId: selectedIndex}, timeTaken}`. The server looks up
   correct answers, applies `+marks` / `−negative`, and returns the result.
2. **Correct answers & explanations** — strip them from any response delivered
   *before* submission. Add them to the result payload only.
3. **Timer enforcement** — store `startedAt` server-side when the test is opened and
   reject submissions past `startedAt + duration + grace`. The client timer is UX only.
4. **Password verification** — bcrypt compare on the server.
5. **Role authorisation** — middleware per route. Never trust a role sent from the client.
6. **Recommendation engine** (`recommendationService`) — can stay client-side, or move to
   `/recommendations` when you upgrade the rules to ML. The interface is already isolated.

---

## 7. Migration steps

## 8. MongoDB API included in this project

This repository now includes a small Express/Mongoose API in `server/index.ts`.
It provides the first live data surface for profile-rich students and category-wise
questions while the existing localStorage mode remains available for the frontend.

### Local setup

1. Copy `.env.example` to `.env`.
2. Replace `DATABASE_URL` with your MongoDB Atlas connection string. Create a database
        user, allow your development IP in Atlas Network Access, and keep `.env` untracked.
3. Seed the database from the existing demo data:

```bash
npm run server:seed
```

4. Start the API:

```bash
npm run server
```

5. Start the frontend in another terminal:

```bash
npm run dev
```

The API listens on `http://localhost:4000/api/v1` and the frontend on the Vite URL.

### Live endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | MongoDB connection health |
| POST | `/auth/login` | bcrypt-backed login |
| GET | `/students` | Filtered, paginated student profiles |
| GET | `/students/:id` | Student profile, recent attempts, open mistakes |
| GET | `/questions` | Filtered, paginated questions |
| GET | `/questions/categories` | Published question counts by exam, subject, chapter, and topic |
| GET | `/questions/stats` | MongoDB aggregation statistics |
| POST/PATCH/DELETE | `/questions` | Faculty/admin question management |
| GET/POST/PATCH/DELETE | `/tests` | Test management and question assignment |
| GET | `/attempts` | Attempt history from MongoDB |
| GET | `/mistakes` | Student mistake records |
| GET/PATCH | `/settings` | Platform settings |
| GET/POST/DELETE | `/curriculum` | Custom curriculum entries |
| GET/PATCH | `/admin/students` | Student administration and verification |
| GET/POST/PATCH | `/admin/faculty` | Faculty profiles and management |

The API stores seed passwords as bcrypt hashes and never returns either password field.
The current UI continues to use its synchronous localStorage services by default. The
next migration step is to change each service method to an async API-backed method,
starting with `authService`, `questionService`, and the student directory screens.

**Step 1 — seed the database.** Export the current demo data:
Admin → Settings → *Export JSON Snapshot*. Import each array into its collection.

```bash
mongoimport --uri "$DATABASE_URL" --collection questions --jsonArray --file questions.json
```

**Step 2 — hash the passwords.** The snapshot contains plaintext `123456` demo
passwords. Run a one-off script converting `password` → `passwordHash` with bcrypt,
then delete the plaintext field.

**Step 3 — rewrite one service at a time.** Each service keeps its exported function
names. Example for `questionService.list`:

```ts
// BEFORE (mock)
list(filters) {
  return getDB().questions.filter((q) => matches(q, filters));
}

// AFTER (real)
async list(filters) {
  if (!USE_API) return getDB().questions.filter((q) => matches(q, filters));
  return api.get<Question[]>('/questions', filters);
}
```

Keeping the `USE_API` branch means the offline demo never breaks.

**Step 4 — make callers async.** Services become promise-returning. The pages already
use the `useAsync` hook (`src/lib/hooks.ts`) which handles loading / error / retry, so
in most cases you only add `await`. Components calling services directly inside
`useMemo` need to move into `useAsync`.

**Step 5 — swap auth.** In `src/pages/auth/Auth.tsx` change `demoAuth.login` to
`realAuthAPI.login`. The stub already exists in `authService.ts` — implement it with
`api.post('/auth/login', ...)`. Delete `demoAuth` when you are done.

**Step 6 — delete the mock layer.** Remove `src/services/db.ts`, `src/data/seed.ts`,
`src/data/users.ts`, `src/data/questions.ts`. Keep `src/data/taxonomy.ts` (it is static
reference data) or move it to a `/taxonomy` endpoint.

---

## 8. Security checklist before launch

- [ ] Passwords hashed with bcrypt (cost ≥ 12) or argon2id
- [ ] Session token in an **httpOnly, Secure, SameSite=Lax** cookie — not localStorage
- [ ] CSRF token on every mutating request (`apiClient` already sends `X-CSRF-Token`)
- [ ] Rate limiting on `/auth/login` and `/auth/forgot-password`
- [ ] Role-based authorisation middleware on every faculty/admin route
- [ ] Input validation with a schema library (Zod / Joi) on every endpoint
- [ ] MongoDB query sanitisation (`express-mongo-sanitize`) to block operator injection
- [ ] Correct answers never sent before submission
- [ ] Server-side timer validation
- [ ] HTTPS enforced, HSTS enabled
- [ ] Forgot-password returns `202` regardless of whether the email exists
- [ ] Audit log for verification, publish/unpublish and delete actions

---

## 9. Files you will touch

| File | Action |
|---|---|
| `src/services/config.ts` | set `VITE_USE_API=true` via `.env` |
| `src/services/apiClient.ts` | ready to use as-is |
| `src/services/authService.ts` | implement `realAuthAPI`, delete `demoAuth` |
| `src/services/questionService.ts` | swap bodies to `api.*` calls |
| `src/services/testService.ts` | swap bodies |
| `src/services/attemptService.ts` | swap bodies; **move scoring to server** |
| `src/services/analyticsService.ts` | swap bodies to aggregation endpoints |
| `src/services/recommendationService.ts` | optional — keep or move to `/recommendations` |
| `src/services/db.ts` | delete after migration |
| `src/data/seed.ts`, `users.ts`, `questions.ts` | delete after migration |
| `src/pages/**`, `src/components/**` | **no changes required** |

---

## 10. Summary

You need: a **database server + connection string**, a **Node/Express REST API**
implementing the ~40 endpoints in §5, **bcrypt password hashing**, **httpOnly cookie
sessions**, and two environment variables on the frontend.

Because every screen already reads through the service layer and never touches storage
directly, the migration is confined to `src/services/` — roughly 6 files.
