# Offline-First Donetick — Plan

Status: **draft, awaiting approval**
Scope of this doc: what it takes to go from today's "online-first with an offline
fallback" to a genuinely offline-first app that covers ~80% of Donetick for a
single user, with a clean upgrade path to a server-synced account.

---

## 1. Where we are today

The offline work that exists is real and well-built, but it is **online-first
with a cache**, not offline-first:

| Piece | File | What it does |
| --- | --- | --- |
| Storage | `src/utils/OfflineDB.js` (1164 lines) | Dual backend: Capacitor SQLite on native, IndexedDB on web. Two full hand-written implementations of the same API. Caches **chores + chore history only**. |
| Outbox | `src/utils/CommandQueue.js` | Append-only command log (12 command types) with compaction and temp-id remapping. |
| Sync | `src/utils/SyncEngine.js` | Replay queue → delta pull from `GET /api/v1/sync/changes?since=<cursor>`. |
| Gate | `src/utils/OfflineFeatureToggle.js` | localStorage on/off switch. |
| Call sites | `src/queries/ChoreQueries.jsx` | Every hook is `try { server } catch { cache }`, with the offline branch duplicated inline (~20 places). |

Backend side (`donetick-core`): `internal/sync/handler.go` exposes a correct,
paginated, tombstone-aware delta endpoint over `sync_version`. It covers
**chores and chore histories only** — not labels, projects, subtasks, or things.

### The five things that actually block "offline-first"

1. **Only 2 of 6 entities are local.** Labels, projects, subtasks, and things are
   network-only. You cannot create a label offline, so you cannot really create a
   task offline either.
2. **No local domain logic.** The server computes `nextDueDate` on completion
   (`internal/chore/scheduler.go`, 417 lines). Offline, completing a recurring
   chore just paints a `_pending` badge — the task does not advance. That is the
   single biggest "it feels broken offline" gap.
3. **The server is still the identity authority.** Rows are keyed by server int
   IDs; local creates get `temp_…` ids that later get rewritten
   (`commandQueue.remapEntityId`). Workable, but it makes every local entity a
   second-class citizen.
4. **Everything requires auth and a circle.** No route is reachable without a
   token; chores carry `circleId`, `assignedTo`, `points`, `createdBy`.
5. **The storage layer doesn't scale to more entities.** Adding labels +
   projects + subtasks to `OfflineDB.js` as-is means writing each one twice
   (SQLite + IndexedDB) — roughly +800 lines of duplicated, hard-to-test code.

---

## 2. Target architecture

One rule, applied everywhere:

> **The local database is the source of truth. The UI only ever reads and writes
> locally. Sync is a background process that reconciles local ↔ server. It is a
> no-op when there is no account.**

This is the design that makes local-only mode and account mode *the same code
path*, which is what makes the "jump from offline to synced" transition smooth
instead of a rewrite.

```
  views / components
        │  (unchanged public API: useChores, useCreateChore, useLabels, …)
  src/queries/*  ── React Query hooks
        │
  src/data/repositories/*  ── choreRepo, labelRepo, projectRepo, historyRepo
        │            (pure business ops: create, complete, skip, archive…)
        ├── src/domain/*  ── scheduler.js, completion.js  (ported from Go)
        │
  src/data/store.js  ── one document store, one implementation
        │
   ┌────┴─────┐
 SQLite     IndexedDB      (~120 lines each, dumb key/value/JSON)
 (native)   (web)
        ▲
  src/sync/*  ── outbox drain + delta pull (inert in local-only mode)
```

### 2.1 Storage: collapse to a single document store

Replace the two 500-line hand-written table-per-entity backends with **one
generic collection store**, implemented once per platform:

```
documents(
  collection  TEXT,      -- 'chore' | 'label' | 'project' | 'subtask' | 'history'
  id          TEXT,      -- local UUID, permanent, never rewritten
  doc         TEXT,      -- JSON blob of the entity
  server_id   TEXT,      -- NULL until this row has been pushed to a server
  updated_at  INTEGER,
  deleted_at  INTEGER,   -- tombstone; NULL when live
  dirty       INTEGER,   -- 1 = has local changes not yet pushed
  PRIMARY KEY (collection, id)
)
```

Everything else — filtering, sorting, grouping, joins between chore and labels —
happens in plain JS over the loaded collection. A personal task list is hundreds
of rows, not millions; JS filtering is the right call and it removes the entire
class of "the SQL and the IndexedDB path disagree" bugs.

**Why not a library** (Dexie / RxDB / WatermelonDB / PowerSync / ElectricSQL):
they each solve a bigger problem than we have, and none of them span
Capacitor-SQLite *and* browser IndexedDB without pulling in a WASM SQLite build
and a new sync protocol we'd have to match on the Go side. The generic store
above is ~250 lines total and we already own the two backends.

### 2.2 Identity: client-generated UUIDs, permanently

Every locally created entity gets a UUID at birth and **keeps it forever**. The
server's integer id is stored alongside as `server_id`. Nothing ever rewrites an
id, so:

- No `temp_` prefixes, no `remapEntityId`, no ordering hazards in the outbox.
- Relations (`chore.labelIds`, `chore.projectId`) are local UUIDs, stable across
  the migration to an account.
- Adoption becomes a straight "push and record the returned server id" loop.

Existing server-sourced rows get a deterministic local id (`srv:<int>`) so both
kinds coexist in one table.

### 2.3 Domain logic ported to JS (the real work)

`src/domain/scheduler.js` — a faithful port of `internal/chore/scheduler.go`:
`once`/`no_repeat`/`trigger`, `daily`, `weekly`, `monthly`, `yearly`, `interval`
(hours/days/weeks/months/years), `days_of_the_week` (incl. week-of-month
patterns), `day_of_the_month`, `adaptive`, rolling vs. fixed base date, and IANA
timezone handling.

`src/domain/completion.js` — mirrors the server's `CompleteChore` / `SkipChore`
handlers: writes a history entry, advances `nextDueDate` via the scheduler,
resets `status`, deactivates one-shot chores, resets subtask completion.

This is the highest-risk item and it gets the most test coverage: the Go tests in
`internal/chore/scheduler_test.go` and `scheduler_adaptive_test.go` get ported
1:1 to Vitest. **There is no test runner in this repo today** — Phase 0 adds
Vitest. That is non-negotiable for a scheduler port.

Payoff: this also fixes offline behaviour for *existing* logged-in users, before
any of the local-mode work lands.

### 2.4 Two modes, one code path

```js
appMode = 'local'    // no account: sync layer inert, dirty flags accumulate
        | 'account'  // signed in: sync layer drains outbox + pulls deltas
```

A single `useCapabilities()` hook exposes what the current mode supports
(`sharing`, `assignees`, `points`, `approval`, `notifications`, `things`,
`attachments`) so views gate on a capability, not on `if (mode === 'local')`
scattered everywhere.

---

## 3. Phase 1 scope — "80% of Donetick, one user, no account"

**In:**

- Onboarding gains a **"Use without an account"** path; app is fully usable
  with zero network.
- **Chores**: create / edit / delete / archive / unarchive / complete / skip /
  reschedule / priority / due dates / **all recurrence types** / description /
  subtasks / completion window / start-pause timer.
- **Labels**: full CRUD, assignment to chores, label views.
- **Projects**: full CRUD, chore↔project assignment, project view.
- **History**: local completion history, per-chore history, activity view, edit
  and delete history entries.
- **Views**: My Chores, Chore View/Edit, Archived, Label, Project, Filter,
  Global Search, Activities — all reading from local.
- Local notifications for due chores via `@capacitor/local-notifications`
  (scheduled from local data — no server push).
- Settings: theme, localization, date/time format, sidepanel — all already local.
- Export / import a JSON backup of the whole local database.

**Out (deliberately, for Phase 1):**

- Auth, circles, members, assignees, assignment strategies, approvals, nudges,
  points/leaderboard, NFC/things, real-time SSE, attachments/storage, AI
  features that call the server, notification providers (Telegram/Pushover/etc.),
  API tokens, MFA, subscriptions.

Those views get hidden by capability gating rather than deleted — Phase 4 turns
them back on for account mode.

---

## 4. Phases

### Phase 0 — Foundations (no user-visible change)

0.1 Add **Vitest** + `npm test`; wire into lint-staged/CI.
0.2 Build `src/data/store.js` (document store, both backends) + tests.
0.3 Port the scheduler to `src/domain/scheduler.js`; port the Go test suites.
0.4 Port completion/skip semantics to `src/domain/completion.js` + tests.
0.5 **Ship 0.3/0.4 into the existing offline path first** — offline completion
    of a recurring chore now advances the due date correctly for today's
    logged-in users. Small, isolated, immediately valuable, and it de-risks the
    port against real data before anything depends on it.

*Deliverable: a tested local domain layer and storage primitive, current app
behaviour improved, nothing else changed.*

### Phase 1 — Local-only mode end to end

1.1 `src/data/repositories/*` for chore, label, project, subtask, history —
    UUID identity, dirty/tombstone bookkeeping, no network.
1.2 `appMode` + `useCapabilities()`; onboarding "Use without an account" entry;
    routing no longer requires a token in local mode.
1.3 Rewrite `src/queries/*` hooks to call repositories. **Public hook signatures
    stay identical** so views need minimal changes.
1.4 Capability-gate the account-only UI (members, points, approvals, sharing,
    things, notification providers).
1.5 Seed data / empty states for a brand-new local user.
1.6 Local due-date notifications.
1.7 Manual QA pass in airplane mode on web, iOS, Android.

*Deliverable: install the app, tap "use without an account", never touch a
network, and get a complete personal task manager.*

### Phase 2 — Durability and trust

2.1 JSON export / import of the full local DB (this is the user's only backup in
    local mode — it ships in the same release as Phase 1, not later).
2.2 Store schema versioning + forward migrations.
2.3 Corruption handling, quota handling (Safari evicts IndexedDB), storage
    diagnostics in Advanced Settings.
2.4 Automated coverage of the repository layer.

### Phase 3 — Adoption: local → account

The transition you care about. Flow: **Settings → "Back up & sync" → sign up or
sign in → push everything**.

3.1 `src/sync/adopt.js`: push in dependency order — labels → projects → chores →
    subtasks → history — recording each returned server id into `server_id`.
    Resumable, idempotent, safe to retry; nothing is deleted locally until the
    server has acknowledged it.
3.2 Then flip `appMode` to `'account'` and let the normal sync loop take over.
3.3 Conflict policy: on first adoption the local DB wins (the account is new or
    empty). If the account already has data, we merge by appending — no
    destructive resolution.

**Backend asks (this is where I'll need `donetick-core` changes):**

- There is **no bulk-import endpoint** today, and **no endpoint that creates a
  history entry**. `POST /chores/:id/do` accepts a `completedDate`, so history
  can be replayed through it, but each call recomputes `nextDueDate`
  server-side — so history must be replayed in chronological order and the
  chore's due date corrected afterwards. Workable for Phase 3, ugly.
- Recommended: add `POST /api/v1/sync/import` taking the whole local payload and
  returning an id map. Turns 200 round-trips into one, and removes the replay
  ordering hazard entirely. I'll propose this as a separate PR against
  `donetick-core`.
- `GET /sync/changes` should be extended to cover labels, projects, and subtasks
  (currently chores + histories only). Needed for Phase 4, not Phase 3.

### Phase 4 — Converge account mode onto local-first

4.1 Extend `/sync/changes` (backend) to labels/projects/subtasks.
4.2 Point the account-mode sync at the same document store; delete the
    `try { server } catch { cache }` duplication from `src/queries/*`.
4.3 Retire `CommandQueue.js` / `SyncEngine.js` / `OfflineDB.js` once nothing
    imports them.
4.4 Optional: let an account user downgrade back to local-only.

---

## 5. Risks and how they're handled

| Risk | Handling |
| --- | --- |
| Scheduler port drifts from the Go implementation | Port the Go test suite verbatim; ship it into the existing offline path in Phase 0 so it's exercised against real data before local mode depends on it. Long term: consider a shared fixture file both suites read. |
| Storage rewrite regresses today's offline users | Phases 0–2 leave `OfflineDB.js` untouched and running. The new store is additive; the old one is deleted only in Phase 4. |
| Adoption loses or duplicates data | Idempotent, resumable push keyed by local UUID; local rows survive until the server acknowledges; export-before-adopt is offered in the UI. |
| Safari/iOS evicting IndexedDB | Phase 2 quota + eviction handling, plus export/import as a real backup. Native uses SQLite, which is not evicted. |
| Scope creep into circles/points/AI | Capability gating, not deletion. Anything account-shaped is off by default in local mode. |
| Hook rewrite breaks views | Keep the exported hook names and return shapes identical; the change is behind the hook boundary. |

---

## 6. Rough sizing

| Phase | Size |
| --- | --- |
| 0 — foundations + scheduler port | Large (the scheduler is the bulk of it) |
| 1 — local mode end to end | Large |
| 2 — durability | Medium |
| 3 — adoption + backend import endpoint | Medium |
| 4 — convergence | Large |

Phases 0 and 1 are the ones that deliver the thing you asked for. 2 ships with
them. 3 and 4 are follow-ups.

---

## 7. Assumptions I made (flag any that are wrong)

1. Local mode targets **web + iOS + Android** together, not native-only.
2. Local mode is entered from onboarding ("Use without an account") and is
   discoverable, not a hidden dev flag.
3. Existing logged-in users' behaviour must not regress at any point — hence the
   additive, parallel-path approach rather than an in-place rewrite.
4. `donetick-core` changes ship as separate PRs I'll prepare in the core repo,
   and you review/deploy them.
5. Things/NFC is genuinely out of the 80% and can wait.
