# Backend handoff: custom assignment rotation

## API

Accept optional `assignmentRotation` in `POST /chores/` and `PUT /chores/`, and return the saved config in `GET /chores/:id` (`res.assignmentRotation`). Do not expose counters or other runtime state in this field. Example for Round robin:

```json
{
  "assignStrategy": "round_robin",
  "assignedTo": 42,
  "assignees": [{ "userId": 42 }, { "userId": 67 }, { "userId": 91 }],
  "assignmentRotation": {
    "mode": "completions",
    "count": 3,
    "order": [42, 91, 67]
  }
}
```

- Valid for `round_robin` and `random` on scheduled repeating tasks with at least two explicit eligible assignees. Not supported for `once`, `no_repeat`, `always`, or `trigger` in this release.
- `mode` is `default`, `scheduled_occurrences`, `completions`, `week`, or `month`. `count` is required only for the two counted modes (integer 1–1000). `order` is optional and Round robin only; when supplied, it must contain every eligible user ID exactly once. `default` lets Round robin customize the order without changing the existing switch timing.
- `week` uses `weekday` (lowercase English key, `monday` through `sunday`); `month` uses `dayOfMonth` (integer 1–31). Send and return only the field matching the mode. To read any early preview configs without a day, default to Monday or day 1, respectively.
- `null` clears the config. Omitted on create means legacy behavior; omitted on update preserves the config for older clients. If an older client makes the strategy or schedule incompatible, clear the config; if it changes membership, remove ineligible IDs and append new ones. Tasks without a config keep existing behavior.

## Rotation rules

Evaluate rotation when assigning a **new occurrence**, never on a timer that rewrites the current one. If an occurrence is still open on the selected handoff day, it stays with its assignee.

- **`week` / `month`:** Switch on the first new occurrence scheduled on or after the selected day. Compare the most recent selected-day boundary at or before each occurrence's scheduled date, in the task's schedule timezone (with a stable server-side fallback). For `week`, use the chosen weekday directly, independent of any week-start preference. For `month`, clamp the selected day to the last day of each shorter month (e.g. day 31 → February 28 or 29). If several boundaries pass without a new occurrence, advance only once.

- **`scheduled_occurrences`:** The current assignee gets N scheduled slots. The next slot switches. Count missed/skipped slots when the recurrence engine advances past them; moving an existing occurrence's due date is not a new slot.
- **`completions`:** Switch on the first new occurrence after N finalized completions (including approved completions). Skips, pending approvals and rejects do not count. Count task completions, not who performed them.
- **Round robin:** Step forward from `assignedTo`, wrap at the end, and use the existing ordering when `order` is absent. With the example above, 91 is next. If the current user is no longer eligible at handoff, start at the first eligible user. Order-only edits affect the next switch, not the open assignment or count.
- **Random:** For a configured switch, draw once from eligible users other than the current assignee. Persist the result rather than re-drawing on retry.

Persist the policy and per-turn progress separately. Initialize progress on create or a timing-rule change, keep progress on unrelated edits (including a repeated write of the same policy), and update it atomically with occurrence advancement. Handle undo/replay consistently with the recurrence engine so completion retries or approval retries never double-count. Clones copy the policy, not progress.

Before rollout, test API round-trips/clears, counted-mode thresholds with misses and approvals, overnight and multi-period calendar handoffs, order wrap and membership changes, and Random retry behavior. Enable the frontend build flag `VITE_CUSTOM_ASSIGNMENT_ROTATION=true` only once the deployed API persists and enforces this contract.
