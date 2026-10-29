# Product

## Register

product

## Users

Households and small groups sharing recurring work — a family splitting chores, flatmates
on a cleaning rotation, a couple tracking bills. They are not project managers and are not
"doing productivity": they open the app mid-task, often one-handed, often standing in the
room where the work is. Sessions are seconds long. The job to be done is almost always one
of three things: _what needs me right now_, _mark this done_, _who has this one_.

A secondary audience runs self-hosted instances and cares that the app is privacy-focused
and works offline — the offline command queue and pending-sync badges are first-class
product surface, not plumbing.

The app ships as a web app and as a Capacitor native app on iOS and Android, so every
screen is a mobile screen first, with safe-area insets, 44px touch targets, and RTL
support as hard requirements rather than polish.

## Product Purpose

Donetick makes shared recurring work visible and settleable without becoming a second job
to maintain. Success is that a task gets marked done in one tap from wherever the user
happens to be, and that nobody has to ask "did you do it?" out loud.

The failure mode to design against is the app becoming a dashboard — a screen of metrics
about chores instead of a way to finish them.

## Brand Personality

Calm, quiet, unfussy. It is a household tool, not a productivity product: it does not
congratulate, gamify, or editorialize. Copy is plain and second-person ("Mark as done",
"Available to complete starting Monday"), never cute and never scolding — a late task is
stated, not accused.

Color is restrained by default. Saturation is reserved for genuine state: overdue, pending
approval, a running timer. When everything is fine, the screen is ink on surface.

## Anti-references

- **Dashboards.** Grids of stat tiles, big-number hero metrics, completion percentages,
  streaks. Donetick shows counts only where the count is a button into the filtered list.
- **Gamified chore apps** (Tody, Sweepy): points theatre, mascots, progress-bar guilt.
- **Enterprise task managers** (Jira, Asana): field-dense forms, breadcrumbs, custom
  taxonomies. A chore has a name, a time, and a person.
- **Nested card grids.** Equal-weight cards in a 2×2 that are really just labelled rows.
  If it is label plus value, it is a row, not a card.

## Design Principles

1. **One screen answers one question.** Home answers "what needs me". Task detail answers
   "what is this and can I settle it". Neither becomes a copy of the task list.
2. **A section with nothing to say does not render.** No zero states dressed as data, no
   "N/A" placeholders occupying a row. Absence is the smallest possible footprint.
3. **The primary action is always reachable.** Marking a task done must never require
   scrolling, and must never be visually equal in weight to the six things around it.
4. **Options hide until asked for.** Completing with a note or at a past time are real
   needs and rare ones; they belong behind the primary action, not beside it.
5. **Status earns the only colour on screen.** If a hue is not reporting overdue, pending
   approval, or a running timer, it is ink, neutral, or nothing.
6. **Offline is a state, not an error.** Queued actions read as "will sync", shown inline
   where the action was taken.

## Accessibility & Inclusion

- WCAG 2.1 AA: body text ≥4.5:1, large text ≥3:1. Status is never carried by hue alone —
  every coloured chip also carries an icon or a word.
- Touch targets ≥44px on phones (enforced in the Joy theme's `JoyIconButton` override).
- Every animation needs a `prefers-reduced-motion: reduce` alternative. The codebase
  convention is to null the transition and the transform, not just shorten them.
- Full RTL support: the emotion cache runs `stylis-plugin-rtl`, so use logical properties
  (`insetInlineStart`, `ms`/`me`) and let the plugin mirror the rest.
- All user-facing strings go through `react-i18next` with per-namespace JSON in
  `public/locales/<lang>/`. English is the source of truth; `npm run lint:i18n` gates it.
