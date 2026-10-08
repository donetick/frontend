import moment from 'moment'
import { useMemo } from 'react'

import { useChoresHistory } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import {
  ChoreSorter,
  ChoreStatus,
  notInCompletionWindow,
  priorityOrder,
} from '../../utils/Chores'
import { getFilterCount, getFilterOverdueCount } from '../../utils/FilterEngine'
import { useFilters } from '../Filters/FilterQueries'
import { useProjects } from '../Projects/ProjectQueries'

// Home shows three tasks and no more. A fourth turns the screen back into a
// list, and the full list is already one tap away at /chores.
export const NEXT_UP_LIMIT = 3

// If nothing is due today or tomorrow, show only one "what's next" task.
export const NEXT_UP_FALLBACK_LIMIT = 1

// Keep overdue visible but short: enough to unblock now, not enough to turn
// Home into a second full task list.
export const OVERDUE_PREVIEW_LIMIT = 3

// How far forward Home is willing to look on a day with nothing due. Matches
// the rolling window of the `isDueThisWeek` filter operator in FilterEngine, so
// the section's "Due this week" link lands on the same set of tasks.
const HORIZON_DAYS = 7

// The number of people and projects worth putting in a strip before it stops
// being glanceable and becomes a directory.
const STRIP_LIMIT = 6

// The id the rest of the app uses for the project that holds every task nobody
// filed anywhere. It is synthesized, not stored — see useProjectFilter.
export const DEFAULT_PROJECT_ID = 'default'

/**
 * Home is mine-first: a task is "mine" when it is assigned to me or to nobody.
 * Work that belongs to someone else is context, and lives in the circle strip
 * rather than in the triage counts. For a solo account this is every task.
 */
const isMine = (chore, userId) =>
  !chore.assignedTo || chore.assignedTo === userId

/**
 * Due date first, priority as the tiebreak. ChoreSorter (priority first) is
 * right for a triage list, but Home's queue is a small, date-ordered lookahead.
 */
const dueDateFirstSorter = (a, b) => {
  if (!a.nextDueDate && !b.nextDueDate) return 0
  if (!a.nextDueDate) return 1
  if (!b.nextDueDate) return -1

  const dueDiff = new Date(a.nextDueDate) - new Date(b.nextDueDate)
  if (dueDiff !== 0) return dueDiff

  return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
}

/**
 * The one sentence at the top of the screen. Deliberately a short fixed set of
 * cases rather than a template — every branch is a real translatable sentence,
 * and the last one always resolves, so the screen is never headless.
 */
const buildVerdict = ({ dueToday, hasAnyTask, needsReview, overdue }) => {
  if (overdue.length > 0) {
    return { count: overdue.length, id: 'late' }
  }
  if (needsReview.length > 0) {
    return { count: needsReview.length, id: 'review' }
  }
  if (dueToday.length > 0) {
    return { count: dueToday.length, id: 'today' }
  }
  if (!hasAnyTask) {
    return { count: 0, id: 'firstRun' }
  }
  return { count: 0, id: 'clear' }
}

/**
 * Everything the Home screen renders, derived from the chores list the view
 * already holds. Taking `chores` as an argument rather than reading the query
 * directly is what lets Home share one optimistic list with useChoreActions,
 * the same arrangement MyChores uses.
 */
const useHomeSummary = chores => {
  const { data: userProfile, isLoading: profileLoading } = useUserProfile()
  const { data: membersData, isLoading: membersLoading } = useCircleMembers()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const { data: filters = [], isLoading: filtersLoading } = useFilters()
  // The open list can't say what anyone finished, and the circle ring is a
  // week: it needs the completion log. Same window and shape the activity
  // screens already ask for, so this usually lands on a warm cache.
  const { data: historyData } = useChoresHistory(HORIZON_DAYS, true)

  const userId = userProfile?.id
  const members = useMemo(() => membersData?.res ?? [], [membersData?.res])

  const summary = useMemo(() => {
    const now = moment()
    const endOfToday = moment().endOf('day')
    const endOfTomorrow = moment().add(1, 'day').endOf('day')

    const mine = chores.filter(chore => isMine(chore, userId))

    const overdue = mine.filter(
      chore =>
        chore.status !== ChoreStatus.PENDING_APPROVAL &&
        chore.nextDueDate &&
        moment(chore.nextDueDate).isBefore(now),
    )

    const dueToday = mine.filter(
      chore =>
        chore.status !== ChoreStatus.PENDING_APPROVAL &&
        chore.nextDueDate &&
        moment(chore.nextDueDate).isSameOrAfter(now) &&
        moment(chore.nextDueDate).isSameOrBefore(endOfToday),
    )

    const dueTomorrow = mine.filter(
      chore =>
        chore.status !== ChoreStatus.PENDING_APPROVAL &&
        chore.nextDueDate &&
        moment(chore.nextDueDate).isAfter(endOfToday) &&
        moment(chore.nextDueDate).isSameOrBefore(endOfTomorrow),
    )

    const horizon = mine.filter(
      chore =>
        chore.status !== ChoreStatus.PENDING_APPROVAL &&
        chore.nextDueDate &&
        moment(chore.nextDueDate).isAfter(endOfTomorrow) &&
        moment(chore.nextDueDate).isBefore(
          moment().startOf('day').add(HORIZON_DAYS, 'days'),
        ),
    )

    // Matches the "Pending Approval" insight already in SmartInsightsCard:
    // anything a circle member finished that still needs signing off.
    const needsReview = chores.filter(
      chore => chore.status === ChoreStatus.PENDING_APPROVAL,
    )

    // Unlike MyChores, Home orders by due date first: it's a short queue of
    // what's coming, not a triage list, so the soonest task should lead even
    // if a later one carries higher priority.
    const nextUp = [...dueToday, ...dueTomorrow]
      .filter(chore => !notInCompletionWindow(chore))
      .sort(dueDateFirstSorter)
      .slice(0, NEXT_UP_LIMIT)

    const nextUpFallback = horizon
      .filter(chore => !notInCompletionWindow(chore))
      .sort(dueDateFirstSorter)
      .slice(0, NEXT_UP_FALLBACK_LIMIT)

    const overduePreview = overdue
      .filter(chore => !notInCompletionWindow(chore))
      .sort(ChoreSorter)
      .slice(0, OVERDUE_PREVIEW_LIMIT)

    // The triage row's "Coming up" tile: due tomorrow, the same single-day
    // window Next up's primary list falls back to once today is covered.
    const upcoming = dueTomorrow

    // Scoped the same as overdue/dueToday/upcoming: a task with no due date
    // that belongs to someone else isn't mine to plan.
    const unplanned = mine.filter(chore => chore.nextDueDate === null)

    return {
      dueToday,
      hasAnyTask: chores.length > 0,
      needsReview,
      nextUp,
      nextUpFallback,
      overdue,
      overduePreview,
      totalOpen: chores.length,
      unplanned,
      upcoming,
      verdict: buildVerdict({
        dueToday,
        hasAnyTask: chores.length > 0,
        needsReview,
        overdue,
      }),
    }
  }, [chores, userId])

  /**
   * A week per person: what they finished, what is still open, and how much of
   * the open pile has gone late. The ring reads as their own week closing, not
   * as a ranking — the strip is deliberately sorted by name rather than by any
   * of the three numbers, so nobody comes first for being behind.
   */
  const circle = useMemo(() => {
    if (members.length < 2) return []

    const history = historyData ?? []
    const weekStart = moment().startOf('day').subtract(HORIZON_DAYS, 'days')
    const now = moment()

    const byMember = new Map()
    const entryFor = memberId => {
      const entry = byMember.get(memberId) ?? { done: 0, late: 0, open: 0 }
      byMember.set(memberId, entry)
      return entry
    }

    chores.forEach(chore => {
      if (!chore.assignedTo) return
      const entry = entryFor(chore.assignedTo)
      entry.open += 1
      if (chore.nextDueDate && moment(chore.nextDueDate).isBefore(now)) {
        entry.late += 1
      }
    })

    history.forEach(record => {
      // A task can be completed without being signed off, and the log keeps
      // rows with no performer at all — neither belongs to anyone's week.
      if (!record.completedBy || !record.performedAt) return
      if (moment(record.performedAt).isBefore(weekStart)) return
      entryFor(record.completedBy).done += 1
    })

    return members
      .filter(member => member.userId !== userId)
      .map(member => {
        const { done, late, open } = byMember.get(member.userId) ?? {
          done: 0,
          late: 0,
          open: 0,
        }
        return {
          displayName: member.displayName || member.name || '',
          done,
          image: member.image,
          late,
          open,
          userId: member.userId,
        }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, STRIP_LIMIT)
  }, [chores, historyData, members, userId])

  const projectPulse = useMemo(() => {
    if (!projects.length) return []

    const now = moment()
    const counts = new Map()
    chores.forEach(chore => {
      // A task with no project belongs to the default project, which the rest
      // of the app synthesizes under the id 'default' rather than storing.
      const projectId = chore.projectId || DEFAULT_PROJECT_ID
      const entry = counts.get(projectId) ?? {
        late: 0,
        open: 0,
        unplanned: 0,
      }
      entry.open += 1
      // No due date at all — the project is carrying work nobody has decided
      // when to do, which is a different problem from being late.
      if (!chore.nextDueDate) {
        entry.unplanned += 1
      } else if (moment(chore.nextDueDate).isBefore(now)) {
        entry.late += 1
      }
      counts.set(projectId, entry)
    })

    // Some accounts already carry a real project under that id or name; only
    // synthesize one when they don't, so it never appears twice.
    const listed = projects.some(
      project =>
        project.id === DEFAULT_PROJECT_ID || project.name === 'Default Project',
    )
    const withDefault = listed
      ? projects
      : [...projects, { icon: 'FolderOpen', id: DEFAULT_PROJECT_ID }]

    return withDefault
      .map(project => ({
        icon: project.icon,
        id: project.id,
        late: counts.get(project.id)?.late ?? 0,
        name: project.name,
        open: counts.get(project.id)?.open ?? 0,
        unplanned: counts.get(project.id)?.unplanned ?? 0,
      }))
      .sort((a, b) => b.open - a.open)
      .slice(0, STRIP_LIMIT)
  }, [chores, projects])

  /**
   * The same shortcut list the Filters screen leads with: pinned filters
   * first, since pinning is the user's own signal of what matters, then
   * whatever else is turning up the most matches right now.
   */
  const filterPulse = useMemo(() => {
    if (!filters.length) return []

    const context = { userId }

    return [...filters]
      .map(filter => ({
        color: filter.color,
        count: getFilterCount(chores, filter, context),
        id: filter.id,
        isPinned: filter.isPinned,
        name: filter.name,
        overdueCount: getFilterOverdueCount(chores, filter, context),
      }))
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return b.count - a.count
      })
      .slice(0, STRIP_LIMIT)
  }, [chores, filters, userId])

  return {
    ...summary,
    circle,
    filterPulse,
    isLoading:
      profileLoading || membersLoading || projectsLoading || filtersLoading,
    membersData,
    projectPulse,
    userProfile,
  }
}

export default useHomeSummary
