// Match the detail endpoint's latest-activity semantics (including skips and
// approval decisions), but count only actual completions for the statistics.
export const summarizeChoreHistory = entries => {
  const activities = entries.filter(
    entry => [1, 2, 3, 4].includes(Number(entry.status)) && entry.performedAt,
  )
  const latest = activities.reduce(
    (last, entry) =>
      !last || new Date(entry.performedAt) > new Date(last.performedAt)
        ? entry
        : last,
    null,
  )
  return {
    lastCompletedDate: latest?.performedAt || null,
    lastCompletedBy: latest?.completedBy ?? null,
    notes: latest?.notes || '',
    totalCompletedCount: entries.filter(entry => Number(entry.status) === 1)
      .length,
  }
}

export const choreTimerFields = session => ({
  duration: session?.endTime ? 0 : session?.duration || 0,
  startTime: session?.endTime ? null : session?.startTime || null,
  timerUpdatedAt: session?.endTime ? null : session?.updatedAt || null,
})
