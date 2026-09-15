import { getRecurrentChipText } from '../../utils/ChoreCardHelpers.jsx'

export const getCompactChoreMetadataParts = (
  chore,
  performers = [],
  t = () => '',
) => {
  const parts = []

  if (!chore) return ''

  if (!['once', 'no_repeat'].includes(chore.frequencyType)) {
    const recurringText = getRecurrentChipText(chore)
    if (recurringText) parts.push(recurringText)
  }

  if (chore.assignedTo) {
    const assignee = Array.isArray(performers)
      ? performers.find(p => p.userId === chore.assignedTo)?.displayName
      : undefined

    if (assignee) parts.push(assignee)
  }

  if (chore.assignedTo === null) {
    parts.push(t('assignee.anyone'))
  }

  if (Number(chore.points ?? 0) > 0) {
    parts.push(`${chore.points}pts`)
  }

  return parts.join(' • ')
}
