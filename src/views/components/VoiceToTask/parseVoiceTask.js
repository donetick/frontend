import * as chrono from 'chrono-node'
import moment from 'moment'

import { isPlusAccount } from '../../../utils/Helpers'
import { generateUUID } from '../../../utils/UUID'
import {
  parseAssignees,
  parseDueDate,
  parseLabels,
  parsePoints,
  parsePriority,
  parseRepeatV2,
} from '../CustomParsers'

// Pure equivalent of AddTaskModal.processText — parses one sentence into a
// structured task (no state setters), preserving the same parser order and
// sequential-cleanup behavior so voice and typed input stay consistent.

const mapMembersForParsing = members =>
  members.map(member => ({
    userId: member.userId,
    username:
      member.username || member.displayName?.toLowerCase().replace(/\s+/g, ''),
    displayName: member.displayName,
    name: member.displayName,
    id: member.userId,
  }))

// Merge overlapping highlight ranges, higher parser priority wins — same
// resolution rules as AddTaskModal.renderHighlightedSentence.
const resolveHighlights = ({
  assignees,
  dueDate,
  labels,
  points,
  priority,
  repeat,
}) => {
  const all = []
  repeat?.forEach(h => all.push({ ...h, type: 'repeat', rank: 60 }))
  priority?.forEach(h => all.push({ ...h, type: 'priority', rank: 50 }))
  points?.forEach(h => all.push({ ...h, type: 'points', rank: 45 }))
  assignees?.forEach(h => all.push({ ...h, type: 'assignee', rank: 40 }))
  labels?.forEach(h => all.push({ ...h, type: 'label', rank: 30 }))
  if (dueDate) all.push({ ...dueDate, type: 'dueDate', rank: 20 })

  all.sort((a, b) => a.start - b.start)
  const resolved = []
  for (const current of all) {
    const previous = resolved[resolved.length - 1]
    if (previous && current.start < previous.end) {
      if (current.rank > previous.rank) {
        resolved.pop()
        resolved.push(current)
      }
    } else {
      resolved.push(current)
    }
  }
  return resolved
}

export const parseVoiceTask = (
  sentence,
  { currentUserId = null, members = [], userLabels = [] } = {},
) => {
  const assigneesForParsing = mapMembersForParsing(members)

  const priority = parsePriority(sentence)
  const points = parsePoints(sentence)
  const labels = parseLabels(sentence, userLabels)
  const assigneesResult = parseAssignees(sentence, assigneesForParsing)
  const repeat = parseRepeatV2(sentence)
  const dueDateParsed = parseDueDate(sentence, chrono)

  // Sequential cleanup — identical chain to AddTaskModal.processText
  let cleaned = sentence
  if (priority.result) cleaned = priority.cleanedSentence
  if (points.result) {
    const reparse = parsePoints(cleaned)
    if (reparse.result) cleaned = reparse.cleanedSentence
  }
  if (labels.result) {
    const reparse = parseLabels(cleaned, userLabels)
    if (reparse.result) cleaned = reparse.cleanedSentence
  }
  if (assigneesResult.result) {
    const reparse = parseAssignees(cleaned, assigneesForParsing)
    if (reparse.result) cleaned = reparse.cleanedSentence
  }
  if (repeat.result) {
    const reparse = parseRepeatV2(cleaned)
    if (reparse.result) cleaned = reparse.cleanedSentence
  }
  if (dueDateParsed.result) {
    const reparse = parseDueDate(cleaned, chrono)
    if (reparse.result) cleaned = reparse.cleanedSentence
  }

  let dueDate = null
  if (dueDateParsed.result) {
    dueDate = moment(dueDateParsed.result).format('YYYY-MM-DDTHH:mm:ss')
  } else if (repeat.dueDate) {
    dueDate = moment(repeat.dueDate).format('YYYY-MM-DDTHH:mm:ss')
  }

  let assignees = []
  const isAnyone = !!assigneesResult.isAnyone
  if (!isAnyone) {
    if (assigneesResult.result?.length > 0) {
      assignees = assigneesResult.result.map(a => ({ userId: a.userId }))
    } else if (currentUserId) {
      assignees = [{ userId: currentUserId }]
    }
  }

  const labelIds = (labels.result || [])
    .filter(label => label.id)
    .map(label => label.id)

  return {
    raw: sentence,
    title: cleaned.replace(/\s+/g, ' ').trim(),
    priority: priority.result ? parseInt(priority.result, 10) : 0,
    points: points.result ?? null,
    labelIds,
    labelNames: (labels.result || []).map(label => label.name),
    assignees,
    isAnyone,
    frequency: repeat.result,
    frequencyName: repeat.name,
    dueDate,
    highlights: resolveHighlights({
      repeat: repeat.highlight,
      priority: priority.highlight,
      points: points.highlight,
      assignees: assigneesResult.highlight,
      labels: labels.highlight,
      dueDate: dueDateParsed.result ? dueDateParsed.highlight[0] : null,
    }),
  }
}

// Builds the same chore payload shape AddTaskModal.createChore submits.
export const buildChorePayload = (
  parsed,
  { notificationTemplates, projectId, userProfile },
) => {
  let finalAssignees = parsed.assignees
  let finalAssignedTo = null
  let finalAssignStrategy = 'keep_last_assigned'

  if (parsed.isAnyone) {
    finalAssignees = []
    finalAssignStrategy = 'no_assignee'
  } else if (finalAssignees.length === 0) {
    finalAssignees = [{ userId: userProfile?.id }]
    finalAssignedTo = userProfile?.id
  } else {
    finalAssignedTo = finalAssignees[0].userId
  }

  const chore = {
    name: parsed.title,
    description: null,
    assignees: finalAssignees,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate).toISOString() : null,
    assignedTo: finalAssignedTo,
    assignStrategy: finalAssignStrategy,
    isRolling: false,
    labelsV2: parsed.labelIds,
    priority: parsed.priority || 0,
    points: parsed.points ?? null,
    deadlineOffset: null,
    completionWindow: null,
    requireApproval: false,
    isPrivate: false,
    status: 0,
    frequencyType: 'once',
    frequencyMetadata: {},
    notificationMetadata: {},
    subTasks: null,
    projectId: projectId === 'default' ? null : projectId,
    draftId: generateUUID(),
  }

  if (parsed.frequency) {
    chore.frequencyType = parsed.frequency.frequencyType
    chore.frequencyMetadata = parsed.frequency.frequencyMetadata
    chore.frequency = parsed.frequency.frequency
    if (isPlusAccount(userProfile)) {
      chore.notification = true
      chore.notificationMetadata = { templates: notificationTemplates }
    }
  }
  if (!parsed.frequency && parsed.dueDate) {
    chore.nextDueDate = new Date(parsed.dueDate).toISOString()
    chore.notificationMetadata = { templates: notificationTemplates }
  }

  return chore
}
