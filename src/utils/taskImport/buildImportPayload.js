import { generateUUID } from '../UUID.js'
import { resolveImportAssignment } from './importAssignment.js'

// Descriptions in the portable format are plain text, not executable HTML.
const escapeHtml = text =>
  text
    .replace(
      /[&<>"']/g,
      character =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character],
    )
    .replace(/\n/g, '<br>')

export function buildImportPayload(
  task,
  {
    assignment,
    labelIds,
    projectId,
    sectionId,
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    userId,
  },
) {
  if (!userId)
    throw new Error('Your profile must finish loading before importing.')
  return {
    name: task.title,
    description:
      task.description === null ? null : escapeHtml(task.description),
    dueDate: task.dueDate,
    nextDueDate: task.dueDate,
    frequencyType: task.repeat?.frequencyType ?? 'once',
    frequency: task.repeat?.frequency ?? 1,
    frequencyMetadata: task.repeat
      ? {
          ...task.repeat.frequencyMetadata,
          timezone,
          ...(task.dueDate ? { time: task.dueDate } : {}),
        }
      : {},
    ...resolveImportAssignment(assignment, userId),
    labelsV2: labelIds.map(id => ({ id: Number(id) })),
    projectId: projectId === 'default' ? null : projectId,
    sectionId: projectId === 'default' ? null : (sectionId ?? null),
    priority: task.priority ?? 0,
    points: null,
    isRolling: false,
    isPrivate: false,
    requireApproval: false,
    notification: false,
    notificationMetadata: {},
    deadlineOffset: null,
    completionWindow: null,
    subTasks: task.subtasks?.length
      ? task.subtasks.map((name, index) => ({
          id: -(index + 1),
          name,
          parentId: null,
          orderId: index,
          completedAt: null,
        }))
      : null,
    status: 0,
    draftId: generateUUID(),
    source: 'bulk_import',
  }
}
