# Offline-First — Implementation Log

Running notes on the work described in `offline-first-plan.md`. Decisions,
deviations from the plan, and things a future reader would otherwise have to
re-derive from the diff.

---

## Phase 0 — Foundations ✅

### 0.1 Test runner

- **Vitest 2.x**, config in `vitest.config.mjs` (kept separate from
  `vite.config.mjs`: the app config pulls in the PWA plugin, PostHog sourcemap
  upload and SWC, none of which the unit tests need).
- `npm test` / `npm run test:watch`. Added to CI (`.github/workflows/build.yml`)
  and to lint-staged as `vitest related --run --passWithNoTests`.
- `src/test/setup.js` installs `fake-indexeddb/auto`; `src/data/**` runs under
  jsdom, everything else under node.

### 0.2 Document store

- `src/data/backends.js` — two dumb row stores (Capacitor SQLite for native,
  IndexedDB for web). They know nothing about chores, dirty flags or tombstones.
- `src/data/store.js` — all the real logic, implemented once.

Row shape:

```
{ collection, id, doc (JSON string), serverId, updatedAt, deletedAt, dirty }
```

Notable choices:

- **New database name** (`donetick_local`). The existing `donetick_offline`
  database and `OfflineDB.js` are untouched and still running, per the plan's
  additive strategy. Nothing is deleted until Phase 4.
- **In-memory cache per collection**, invalidated on write, with a
  `subscribe(listener)` hook. Reads are JS filters over the cached array; a
  personal task list is hundreds of rows.
- **Corrupt rows are skipped, not fatal** — `decode` returns null and logs, so
  one bad row can't take down a collection. `src/data/health.js` surfaces the
  count so the user finds out it happened.

### 0.3 Scheduler port

`src/domain/scheduler.js` is a faithful port of
`donetick-core/internal/chore/scheduler.go`, backed by `src/domain/time.js`
(Go `time` semantics: `AddDate`, `time.Date` normalisation, RFC3339 parsing,
IANA-zone calendar arithmetic).

- All 42 cases from `scheduler_test.go` + `scheduler_adaptive_test.go` are ported
  to `src/domain/scheduler.test.js` and pass, including the commented-out ones
  the Go suite had disabled where they were still meaningful.
- Go's `AddDate` and JS's `Date.UTC` normalise out-of-range values identically
  (Jan 31 + 1 month → Mar 3), so calendar arithmetic lined up without special
  cases.
- The one place Go and JS genuinely differ is timezone-aware day arithmetic
  (`baseDate.In(loc).AddDate(0,0,i)`). `time.js` reimplements it via
  `Intl.DateTimeFormat` — `addDaysInZone` holds the wall clock steady across DST
  transitions the way Go does.
- Error messages are reproduced verbatim so both test suites assert the same
  strings.

**Known divergence:** the Go `scheduleNextDueDate` panics on an adaptive chore
with a nil `NextDueDate`; the JS port returns `null` instead. Nothing depends on
the panic.

### 0.4 Completion semantics

`src/domain/completion.js` mirrors `Handler.completeChore` / `Handler.SkipChore`
plus the three repository methods they call. Pure functions: given a chore and
its history, return the updated chore and the history row to persist.

Behaviours that are easy to get wrong and are pinned by tests:

- Skip schedules from **the chore's due date**, not from the moment of the skip.
- A running timer's "started" history entry is **reused**, not duplicated, so
  elapsed time survives completion.
- The history row records the due date the chore **had**, not the new one.
- `requireApproval` parks the chore in pending-approval and leaves the due date
  alone.
- Subtask completion resets for anything that recurs (`frequencyType !== 'once'`).

### 0.5 Shipped into the existing offline path

`src/queries/offlineCompletion.js` wires the domain layer into the _current_
offline cache. Completing or skipping a recurring chore offline now advances
`nextDueDate` correctly for logged-in users instead of only painting a
`_pending` badge — the plan's "single biggest it-feels-broken-offline gap".

The queued command still replays against the server, which stays authoritative:
the delta pull overwrites whatever we computed. If the chore isn't cached or the
frequency can't be scheduled, it falls back to the old `_pending` behaviour.

Also fixed while in there: the offline branches used
`queryClient.setQueryData(['chores'], …)`, which never matched the real key
`['chores', includeArchive]`. Switched to `setQueriesData({ queryKey: ['chores'] })`.

---

## Phase 1 — Local-only mode ✅

### 1.1 Repositories

`src/data/repositories/{chore,label,project,history}Repo.js`. No network calls.
Documents are shaped like the API's JSON (`labelsV2`, `nextDueDate`,
`frequencyMetadata`, …) so views and filters work unchanged — the only
difference is that `id` is a permanent local UUID.

- **No `subtaskRepo`.** Subtasks are embedded in the chore document because
  that's how the API returns them (`chore.subTasks`); `choreRepo` owns
  `resetSubtasks` / `setSubtaskCompletion`. Splitting them into their own
  collection would have meant a join the views don't want.
- **Labels are denormalised into chores** (`labelsV2`), matching the API.
  `labelRepo.update`/`remove` propagate into every chore that embeds the label.
- **Projects are referenced by id.** Deleting a project orphans its chores
  (`projectId: null`) rather than deleting them.

### 1.2 App mode and capabilities

- `src/data/appMode.js` — `'local' | 'account' | null`, in localStorage because
  routing reads it synchronously. **A token always wins**, so signing in from
  local mode moves to account mode without a second write needing to agree.
- `src/hooks/useCapabilities.js` — `useSyncExternalStore` over the mode, exposing
  `can('points')`, `isLocal`, `isAccount`.
- Account mode's capability map is derived from the local one with everything set
  to `true`, so adding a capability can't accidentally disable it for existing
  users.

### 1.3 Query wiring

Hooks branch on `isLocalMode()` at the top and call repositories; the account
path is byte-for-byte unchanged. Public hook signatures and return shapes are
identical, so views needed no changes.

Two interception points beyond the hooks:

- **`src/utils/Fetcher.jsx`** — the label and project functions return a
  `localResponse(...)` in local mode. Several views call these directly rather
  than through hooks, so intercepting here avoided rewriting them.
- **`src/utils/ApiClient.js`** — `request()` short-circuits in local mode with
  `localUnsupported()`. This is the important one: without it a peripheral query
  would 401 and the 401 handler would force a logout and bounce the user to
  `/login`, away from their own local data. `handleLogout()` also no-ops in
  local mode. `SyncEngine.sync()` returns false immediately.

### 1.4 Capability gating

- `NavBar` links carry an optional `capability` and are filtered.
- `SETTINGS_SECTIONS` gained a `capability` field; `SettingsOverview` filters on
  it. Account-only sections (profile, circle, account, subaccounts, notification
  providers, MFA, API tokens) are hidden in local mode.
- Nothing is deleted — Phase 4 turns these back on for account mode by flipping
  the capability map.

### 1.5 Entry points and seed data

- "Use without an account" on `GetStartedView` (native onboarding) and on
  `LoginView` (web, which has no onboarding flow).
- `src/data/localOnboarding.js#startLocalMode` opens the store, runs migrations,
  requests persistent storage, and seeds a deliberately tiny starter set (two
  labels, two example chores — one recurring, one that explains itself).
- Seeding is keyed off a `seededAt` meta flag **and** emptiness, so a user who
  deletes the examples never gets them back.

### 1.6 Local notifications

`src/service/LocalDueNotifications.js` schedules due-date reminders from local
data via `@capacitor/local-notifications`. The whole schedule is rebuilt on
store changes (debounced 1s) rather than diffed — reconciling notification ids
against a mutable chore list is exactly the bookkeeping that rots. Capped at 32
pending notifications, well under iOS's 64.

### 1.7 Manual QA — **not done**

Airplane-mode passes on web, iOS and Android still need to be run on real
devices. Everything else in Phase 1 is complete.

---

## Phase 2 — Durability ✅

### 2.1 Export / import

`src/data/backup.js`. Format is plain and self-describing: `format`,
`schemaVersion`, `exportedAt`, and one array per collection of raw stored
documents **including bookkeeping fields**, so ids, tombstones and dirty flags
restore exactly and relations survive the round trip.

- `importBackup(input, { mode })` — `'replace'` (default, wipes first) or
  `'merge'`.
- Refuses a backup from a newer schema rather than silently dropping fields.
- UI at **Settings → Backup & Restore** (`BackupSettings.jsx`, route
  `/settings/backup`). Import is behind a confirmation naming what it destroys.

### 2.2 Schema versioning

`src/data/migrations.js`. `SCHEMA_VERSION` is 1; `MIGRATIONS` is keyed by the
version each migration _produces_. `runMigrations()` runs at launch via
`ensureLocalStoreReady()`.

- **Forward only.** A database written by a newer build raises
  `SchemaTooNewError` and the app refuses rather than downgrading — silently
  dropping fields the user can't see is worse than an honest error.
- A missing or corrupt version marker is repaired on the next run.

### 2.3 Corruption and quota

`src/data/health.js`:

- `ensureLocalStoreReady()` — memoised open + migrate, awaited by App and by
  `startLocalMode`.
- `storageDiagnostics()` — per-collection counts, footprint, browser quota,
  and whether storage is `persisted()`.
- `requestPersistentStorage()` — asked for on entering local mode. Safari evicts
  IndexedDB from sites not visited recently, and only persistent storage is
  exempt. Native uses SQLite and isn't affected.
- `findCorruptDocuments()` / `purgeCorruptDocuments()` — rows that fail to decode
  are already skipped by the store; these make them visible and removable.

### 2.4 Repository coverage

`src/data/repositories/repositories.test.js` — 16 cases covering identity
stability, completion/skip scheduling, archive/unarchive, cascade delete, label
propagation, project orphaning, subtask reset and timer reuse.

**95 tests passing across 6 files.** Build and lint clean.

---

## Post-Phase-2 fix: chore actions were unreachable in local mode

Complete/skip/start/pause/subtask/priority/due-date on the chore card went
through `src/views/Chores/hooks/useChoreActions.js`, which calls
`MarkChoreComplete` / `SkipChore` / `StartChore` / `PauseChore` /
`CompleteSubTask` / `UpdateChorePriority` / `UpdateDueDate` in `Fetcher.jsx`
directly — **not** through the local-aware `useMarkChoreComplete` /
`useSkipChore` hooks in `ChoreQueries.jsx`. Those Fetcher functions had no
`isLocalMode()` branch (unlike the label/project/filter functions in the same
file), so every call fell through to `ApiClient.request()`, which
short-circuits to `localUnsupported()` (`{ ok: false, status: 501 }`) in local
mode. No error was thrown — the action just silently did nothing, which is why
it looked like Phase 1/2 hadn't shipped even though `choreRepo.complete` /
`choreRepo.skip` were correct and tested.

Fixed by adding `isLocalMode()` branches to those seven functions in
`Fetcher.jsx`, following the existing label/project/filter pattern
(`localResponse(await choreRepo.…)`). `ApproveChore`, `RejectChore`, and
`NudgeChore` were left unpatched — approvals/nudges/assignees are explicitly
out of Phase 1 scope.

---

## Follow-up: local undo + the Archived page stuck on "Loading"

### `undoChore` — local completion/skip undo

Added `src/domain/completion.js#undoChore`, the counterpart to `completeChore`
/ `skipChore`: takes the most recent undoable history entry (`COMPLETED` /
`SKIPPED` / `PENDING_APPROVAL`, newest-first) and restores `nextDueDate` from
`historyEntry.dueDate` — the due date the chore *had* before the action, which
`buildHistoryEntry` was already recording — resets `status`, and reactivates a
chore that completion had archived (one-shot/trigger). The history row is
removed. Returns `null` when there's nothing undoable, so the caller can no-op
rather than throw.

**Known gap, accepted deliberately:** if the undone entry was a reused
"started" timer row, the elapsed timer session is not restored — the row is
deleted outright instead of being reverted to `STARTED`. Fine for a
single-user local undo; would need real design work (not a one-line fix) if
timer-undo turns out to matter.

`choreRepo.undo(id)` wraps it (`src/data/repositories/choreRepo.js`), and
`Fetcher.jsx#UndoChoreAction` now has the `isLocalMode()` branch that was
deliberately left out of the previous fix. Tests: `completion.test.js` (4
cases) and `repositories.test.js` (2 cases).

### Archived page stuck on "Loading" in local mode

Two independent bugs in `ArchivedTasks.jsx`, both instances of the same root
cause as the chore-actions bug above — code written against account-mode
assumptions with no local-mode branch:

1. **`GetArchivedChores` had no `isLocalMode()` branch** (same gap as the
   seven functions above) — patched the same way, plus `DeleteChore` and
   `ArchiveChore`/`UnArchiveChore` in `Fetcher.jsx` (the latter two weren't
   reachable from the archived list, but `ChoreView.jsx` calls them directly
   for the same operation on the chore-detail page, so they had the identical
   bug).
2. **The page never got that far.** `loadArchivedChores()` was gated on
   `!membersLoading && userProfile` — both come from `useCircleMembers()` /
   `useUserProfile()`, which are `enabled: !!token` and so never fetch in
   local mode (no token). `userProfile` stays `undefined` forever, so the
   effect's body never ran and `isLoading` never left `true`. Separately, the
   render-time spinner guard was `isUserProfileLoading || performers.length
   === 0 || isLoading` — `performers.length === 0` is a reasonable "still
   loading" stand-in in account mode (a circle always has at least its owner)
   but is *permanently* true in local mode, since there is no circle. Fixed
   both to special-case `isLocalMode()` rather than depend on account-only
   queries resolving to truthy data that will never arrive.

### `UserActivities.jsx` (Activity page) stuck on "Loading" in local mode

Same root pattern again, two bugs stacked:

1. `if (!userProfile) return <LoadingComponent />` — `useUserProfile()` never
   fetches without a token, so `userProfile` is `undefined` forever in local
   mode. Fixed to `!userProfile && !isLocalMode()`. `useChores` and
   `useChoresHistory` were already local-aware (`ChoreQueries.jsx`), and
   `useLabels`/`GetLabels` already had an `isLocalMode()` branch, so once this
   gate was fixed the rest of the page's data was already there.
2. Unrelated to local mode, found while reading the loading gate: the history
   loading spinner check (`isChoresHistoryLoading || isChoresLoading`)
   destructured a field, `isChoresHistoryLoading`, that `useChoresHistory`
   never returns (it returns `isLoading`) — so it was always `undefined` and
   silently did nothing in *both* modes. Fixed the destructure to
   `isLoading: isChoresHistoryLoading`.

`useCircleMembers()` still returns no data in local mode (no circle), which is
correct — the assignee filter and the assignee-breakdown chart just show
nothing/"Unassigned", which is right for a single-user local setup.

### `ChoreActionMenu` "move to project" not working

`useChoreActions.js`'s `case 'moveToProject'` calls `SaveChore()` from
`Fetcher.jsx` directly instead of the local-aware `useUpdateChore` hook that
`ChoreEdit.jsx` uses — same bug class as everything above. `SaveChore` had no
`isLocalMode()` branch, so it silently 501'd. Fixed by adding the branch
directly to `SaveChore` (`choreRepo.save(chore)` via `localResponse`), which
is lower-leverage-per-line than usual: it also fixes bulk "move to project"
and bulk label edits in `useChoreActions.js`, the project picker in
`ChoreView.jsx`, and `SubtaskQueries.jsx` — all of which call `SaveChore`
directly and had the identical bug.

### Full audit of `Fetcher.jsx` for the same pattern

Given how many instances of "raw Fetcher call bypasses the local-aware hook"
turned up organically, did a full pass over every export in `Fetcher.jsx`
cross-referenced against every direct call site (not just hook-wrapped ones).
Two more were real and reachable in local mode, both fixed:

- **`GetChoreByID`** — no local branch; not currently called directly by any
  reachable view (only through the already-local-aware `useChore` hook), but
  patched anyway since it's identical in shape to the next one.
- **`GetChoreDetailById`** — called directly (not through `useChoreDetails`)
  by `ChoreView.jsx`'s complete/skip/undo handlers, to refresh the on-screen
  chore right after the action. In local mode this silently 501'd, so the
  chore detail page didn't visually update after completing/skipping/undoing
  from the detail page itself (the chore list elsewhere still updated via
  `invalidateQueries`, and the detail page would eventually self-correct on
  refocus since `useChoreDetails` has `refetchOnWindowFocus: true`, but the
  immediate feedback was missing). Both now branch to
  `choreRepo.get(id)` via `localResponse`.

Everything else in `Fetcher.jsx` without an `isLocalMode()` branch is either
already unreachable in local mode (called only from within a hook that
branches before reaching it — `GetChoresNew`, `CreateChore`, `GetChoreHistory`,
`UpdateChoreHistory`, `DeleteChoreHistory`, `GetChoresHistory`) or is a
genuinely account-only feature that's explicitly out of Phase 1 scope per the
plan (`ApproveChore`, `RejectChore`, `NudgeChore`, `UpdateChoreAssignee`,
attachments, circles/members, MFA, subscriptions, API tokens).

**One real gap found and deliberately not patched:** the individual
timer-session functions — `GetChoreTimer`, `UpdateTimeSession`,
`DeleteTimeSession`, `ResetChoreTimer`, `ClearChoreTimer` (all used from
`TimeQueries.jsx`, reachable from `ChoreView.jsx`'s timer UI). Start/pause
already work locally (`choreRepo.start`/`pause`, backed by a single reused
`STARTED` history entry), but there is no local domain concept of multiple
named timer *sessions* to view, edit, or delete — that's a real feature gap,
not a one-line `isLocalMode()` branch, since the underlying data model isn't
there yet. Degrades gracefully today (the timer-session query just returns no
data, no crash/hang), but the "reset timer" affordance on the chore detail
page is a no-op in local mode. Worth a proper look if timer editing turns out
to matter for local users.

---

## Open items

- **Phase 1.7** — manual airplane-mode QA on web/iOS/Android.
- **Locale strings.** `overview.sections.backup` was added to `en` only; the
  other 10 locales fall back to the key until translated. Strings inside
  `BackupSettings.jsx` and the two "Use without an account" entry points are
  hardcoded English and need extracting into the i18n files.
- **`GetChoresHistory` limit semantics.** `useChoresHistory` passes `limit` to
  `historyRepo.recent(limit)`, which reads it as _days_. That matches the
  offline `getHistoryByDays(limit)` fallback the old code used, but the online
  API may treat it as a row count. Worth confirming against the server before
  Phase 4 merges the paths.
- **Phase 3 (adoption)** and **Phase 4 (convergence)** not started. The backend
  asks in the plan (`POST /api/v1/sync/import`, extending `/sync/changes` to
  labels/projects/subtasks) are unchanged and still needed.
- **Approve/Reject/Nudge/Assignee buttons are not capability-gated** on the
  chore card action menu the way `NavBar`/`SettingsOverview` are (1.4 only
  covered those two surfaces). In local mode these buttons can still be
  visible and will 501 when tapped. Worth gating them alongside the
  `useCapabilities()` work rather than leaving them reachable.
