---
target: notification settings page length/density
total_score: 22
p0_count: 1
p1_count: 2
timestamp: 2026-10-27T17-08-00Z
slug: src-views-settings-notificationsetting-jsx
---
⚠️ DEGRADED: single-context (session policy forbids spawning sub-agents unless the user asks; no browser-automation tool exposed)

Target: `src/views/Settings/NotificationSetting.jsx` (751 lines, one component)
Register: product · PRODUCT.md present, DESIGN.md absent

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No save confirmation; profile drift from its defaults is never shown |
| 2 | Match System / Real World | 3 | Copy is plain and second-person; "Priority Escalation" leaks implementation |
| 3 | User Control and Freedom | 2 | Picking "Custom" silently mutes everything; no reset-to-profile, no undo |
| 4 | Consistency and Standards | 2 | Two parallel control systems for the same three reminder types |
| 5 | Error Prevention | 2 | The Custom trap; device removal is instant with no confirm |
| 6 | Recognition Rather Than Recall | 2 | The profile select never shows what the profile actually turns on |
| 7 | Flexibility and Efficiency | 3 | Profiles are a genuinely good accelerator |
| 8 | Aesthetic and Minimalist Design | 1 | ~19 rows / 15 controls on one screen, 3 of which do nothing |
| 9 | Error Recovery | 2 | One generic "couldn't save" toast for every failure path |
| 10 | Help and Documentation | 3 | Every row carries a real description line |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: Not AI slop. It follows the project's own Joy conventions, the copy is calm and second-person per the brand personality, color is restrained, status is not carried by hue alone. The one shared-ban brush is three stacked tiny-uppercase-tracked group labels (TASK REMINDERS / APPROVALS & REQUESTS / SUMMARIES) within a single section — iOS-settings convention, but at three in a row it reads as scaffolding rather than grouping.

**Deterministic scan**: `detect.mjs --json` on the target returned `[]` — zero findings. The problems here are structural, not stylistic, which is exactly the class the detector can't see.

**Visual overlays**: Not available. No browser-automation tool is exposed in this session, so no overlay or screenshot evidence was gathered; all findings below are from source reading. A dev server is live on :5173 but the page is behind auth.

## Overall Impression

Your instinct is right, and the page is longer than its own content justifies. On a native build with local notifications granted it renders **15 interactive controls across ~19 rows and 4 separate Sheets**, and the section that should answer the whole question — the profile select — is visually a peer of the 14 switches below it rather than the decision that makes them unnecessary.

But length is the symptom. The cause is that the page hosts **two overlapping systems**: a server-side per-account preference set (profile + 9 event types) and a local per-device set (granted + 3 event switches). Both contain "due", "pre-due" and "overdue". And the single biggest opportunity: three of those rows can be deleted outright, because they are wired to nothing.

## What's Working

- **The profile concept is the right answer** to notification settings. "Balanced / Planner / Just-in-time / Persistent / Quiet" is a better model than nine switches, and the backend's sparse-override design supports it properly. The problem is purely that the UI doesn't trust it.
- **Row-level description copy is genuinely good** and on-brand: "Remind me before a chore is due", "One daily summary of overdue and upcoming chores". Plain, second-person, not cute, not scolding — exactly what PRODUCT.md asks for. Most settings pages ship label-only switches and force the user to guess.
- **The device list does the hard parts right**: platform icon, "This device" chip, registration date, a 5-device limit surfaced as a disabled button with changed copy rather than a failure toast, and a real empty state.

## Priority Issues

### [P0] Three switches that do nothing

`dueNotification`, `preDueNotification` and `naggingNotification` (`NotificationSetting.jsx:519-522`) are written to the `notificationPreferences` Preferences key and **read by nothing**. The only consumer, `LocalNotificationScheduler.canScheduleNotification`, reads `granted` and nothing else; the actual reminders come from each chore's own `notificationMetadata.templates`. A user who switches off "Overdue reminders" on this device still gets overdue reminders on this device.

**Why it matters**: This is the worst failure class in the rubric — a control that appears to work, persists, survives reload, and silently has no effect. It also costs three of the rows making the page feel long, and it is the duplicate half of the "two systems" problem.

**Fix**: Delete the three switches and the `local[property]` plumbing behind them. "On this device" keeps one switch (grant/revoke) plus the test button. If per-device granularity is actually wanted, it needs a real implementation in the scheduler first — that's a feature, not a settings row.

**Suggested command**: `/impeccable distill`

### [P1] Nothing is progressively disclosed, which is the length you're feeling

Profile select + 9 event switches + digest hour are all expanded simultaneously. Cognitive-load checklist: **5 of 8 items fail** (single focus, visual hierarchy, one-thing-at-a-time, minimal choices, progressive disclosure) — that's the "high, critical fix needed" band. The decision point offers 9 simultaneous toggles where the working-memory limit is 4.

This contradicts your own design principle 4: *"Options hide until asked for."* The nine toggles are the exact "real needs and rare ones" case that principle describes.

**Fix**: Profile select stays visible with a one-line resolved summary beneath it ("Assignments, due reminders, overdue follow-ups, and a daily digest at 08:00"). The nine event switches move behind one "Fine-tune what you hear about" disclosure, collapsed by default and auto-expanded when `profile === 'custom'`. Keep the three group labels inside the disclosure, where three of them stop reading as scaffolding.

Default page: **19 rows → 7**. Everything stays reachable in one tap.

**Suggested command**: `/impeccable distill`

### [P1] The profile select lies after any override

`savePreference` posts the unchanged profile with the new overrides, and the backend deliberately keeps profile and overrides separate (`SparseOverrides`). So a user who flips four switches still reads **"Balanced"** in the select, with no indication that their setup no longer matches it. "Custom" exists in the list but is never selected automatically.

Worse, in the other direction: picking **"Custom"** resolves to `DefaultsForProfile(custom)` → an empty map → **every event type off**. One tap on an innocuous-looking select option silences all notifications, with no warning, no confirmation and no undo.

**Why it matters**: Heuristics 1, 3 and 5 at once. A user who muted everything by picking "Custom" has no way to see what happened or get back, and the most likely support ticket from this page is "I stopped getting notifications."

**Fix**: Two parts. (a) When overrides are non-empty, render the select as `Balanced · customized` with a "Reset to Balanced" text button beside it. (b) Make "Custom" start from the currently-resolved set rather than from nothing — send the current `effective` map as overrides when switching to Custom, so it means "start from here and adjust", which is what the word implies. The backend already exempts Custom from the override-clearing rule, so this works without a server change.

**Suggested command**: `/impeccable harden`

### [P2] The digest-hour row renders when both digests are off

The send-time select sits in the Summaries sheet unconditionally, so it occupies a full row with an irrelevant decision whenever daily and weekly digest are both off — which is the default for Just-in-time and Quiet. Your principle 2: *"A section with nothing to say does not render."*

**Fix**: Render the row only when either digest is on. Removes a row for two of the five profiles.

**Suggested command**: `/impeccable distill`

### [P2] The section headings are not headings

`SectionHeading` renders `<Typography level='title-md'>`, which Joy maps to `<p>` — so a screen reader gets one `h2` (the layout title) and then a flat run of paragraphs and switches for a 19-row page. The sibling `SettingsSection` component in the same directory passes `component='h3'` and wires `aria-labelledby`; this file reimplements the same thing without either.

**Fix**: Pass `component='h3'` in `SectionHeading`, and give each toggle group `role='group'` + `aria-labelledby` pointing at its uppercase label. Better still, use the existing `SettingsSection` and delete the local duplicate.

**Suggested command**: `/impeccable audit`

## Persona Red Flags

**Casey (distracted mobile user — PRODUCT.md's primary persona, one-handed, standing in the room)**: Lands on a page that needs roughly three thumb-scrolls to reach the device list. The one thing most likely to have brought them here — "turn notifications on for this phone" — is below 11 account-level controls. Flips "Overdue reminders" off on this device, gets an overdue reminder that evening anyway (P0). Toggle-per-save means each tap is a network round-trip that disables every other control on the page while it's in flight; on a slow connection, rapid-fire toggling feels locked up.

**Riley (stress tester)**: Finds the dead switches in one session by flipping them and waiting. Finds the Custom trap, then discovers there's no way back — selecting "Balanced" again restores the profile but their overrides were already discarded server-side, with no confirmation that anything was dropped. Also: flip a toggle, get a failure toast, and the switch stays in its new visual position while the server has the old value (the refetch only runs on success).

**Sam (screen reader + keyboard)**: No heading structure past `h2` (P2). The uppercase group labels are visually-only grouping — "APPROVALS & REQUESTS" is never announced in relation to the two switches it governs, so both arrive as bare switches whose descriptions mention approval without saying they're a pair. The digest-hour select is correctly wired with `aria-labelledby`, which makes the omission elsewhere look accidental rather than considered.

## Minor Observations

- "Priority Escalation — Extra push nudge, only for high/urgent priority chores" is the one copy line that leaks the implementation. It's also the only event whose behaviour depends on a *task's* field rather than the user's choice, which is worth saying plainly: "Only for tasks marked high or urgent priority."
- Device removal fires immediately on tap. Elsewhere in this codebase (`CircleSettings`) destructive actions go through a confirm modal; here, removing the wrong phone from a 5-device list is one mis-tap and requires re-registering on that physical device to undo.
- The component is 751 lines and trips `max-lines-per-function` at 611 lines for the render body. The sub-components (`ToggleRow`, `SectionHeading`, `surfaceSx`, `rowSx`) are all general-purpose and duplicate things `SettingsSection` already provides.
- `profiles` and `events` are module-level objects mapping keys to i18n suffixes, but the render then re-lists the event keys in two literal arrays — so adding an event type means editing three places (as the approvals addition just did).
- Two of the five profiles (Planner, Persistent) differ from Balanced in ways the one-line helper can't convey, and nothing on the page says what any profile contains until you read the nine switches below it.

## Questions to Consider

- If the profile is the right model — and it is — what is the page for after the profile is chosen? Would the honest version be a profile picker, a digest time, a device list, and one "fine-tune" link?
- Does "On this device" need to exist as a concept for the user at all, or is it an implementation detail of local vs push delivery that the user shouldn't have to hold? What breaks if there's one "Notify me on this phone" switch and the app decides the mechanism?
- Three of these nine event types only ever fire for admins and managers. Should a household member with no approval powers be shown two switches that can never fire for them?
