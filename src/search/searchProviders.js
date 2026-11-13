import { SETTINGS_SECTIONS } from '../constants/settingsSections'
import i18n from '../i18n/config'
import { stripHtml } from '../utils/Helpers'

const HISTORY_STATUS = {
  0: 'in progress',
  1: 'completed',
  2: 'skipped',
  3: 'pending approval',
  4: 'rejected',
  5: 'missed',
  6: 'rescheduled',
}

const providers = []

export const registerSearchProvider = provider => {
  if (!provider?.id || typeof provider.getDocuments !== 'function') {
    throw new Error('A search provider needs an id and getDocuments function')
  }
  const existing = providers.findIndex(item => item.id === provider.id)
  if (existing >= 0) providers.splice(existing, 1, provider)
  else providers.push(provider)
  return () => {
    const index = providers.indexOf(provider)
    if (index >= 0) providers.splice(index, 1)
  }
}

export const getSearchProviders = () => [...providers]

const document = (provider, item) => ({ provider, ...item })

registerSearchProvider({
  id: 'tasks',
  getDocuments: ({ chores, membersById, projectsById, t }) =>
    chores.map(chore => {
      const labels =
        chore.labelsV2?.map(label => label.name).filter(Boolean) || []
      const project = projectsById.get(String(chore.projectId))
      const assignees = (chore.assignees || [])
        .map(assignee => membersById.get(String(assignee.userId))?.displayName)
        .filter(Boolean)
      const description = stripHtml(chore.description)
      return document('tasks', {
        id: `task:${chore.id}`,
        entityId: chore.id,
        title: chore.name || t('common:ui.search.untitledTask'),
        subtitle:
          [project?.name, ...labels].filter(Boolean).join(' · ') ||
          t('common:ui.search.task'),
        body: description,
        keywords: [...labels, project?.name, ...assignees]
          .filter(Boolean)
          .join(' '),
        route: `/chores/${chore.id}`,
        updatedAt: chore.updatedAt || chore.createdAt,
      })
    }),
})

registerSearchProvider({
  id: 'history',
  getDocuments: ({ choresById, history, membersById, t }) =>
    history.flatMap(entry => {
      const note = stripHtml(entry.notes).trim()
      if (!note) return []

      const chore = choresById.get(String(entry.choreId))
      const member = membersById.get(String(entry.completedBy))
      return [
        document('history', {
          id: `history:${entry.id}`,
          entityId: entry.id,
          title:
            chore?.name || entry.choreName || t('common:ui.search.taskNote'),
          subtitle: [
            member?.displayName,
            entry.performedAt
              ? new Date(entry.performedAt).toLocaleDateString(
                  i18n.resolvedLanguage || i18n.language,
                )
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
          body: note,
          keywords: `${HISTORY_STATUS[entry.status] || 'activity'} ${member?.displayName || ''}`,
          route: entry.choreId
            ? `/chores/${entry.choreId}/history`
            : '/activities',
          updatedAt: entry.performedAt || entry.updatedAt,
        }),
      ]
    }),
})

registerSearchProvider({
  id: 'projects',
  getDocuments: ({ projects, t }) =>
    projects.map(project =>
      document('projects', {
        id: `project:${project.id}`,
        entityId: project.id,
        title: project.name || t('common:ui.search.untitledProject'),
        subtitle: t('common:ui.search.project'),
        body: stripHtml(project.description),
        keywords: 'folder project',
        route: `/chores?project=${encodeURIComponent(project.id)}`,
        updatedAt: project.updatedAt,
      }),
    ),
})

registerSearchProvider({
  id: 'labels',
  getDocuments: ({ labels, t }) =>
    labels.map(label =>
      document('labels', {
        id: `label:${label.id}`,
        entityId: label.id,
        title: label.name || t('common:ui.search.untitledLabel'),
        subtitle: t('common:ui.search.label'),
        keywords: 'tag label',
        route: `/labels/${label.id}`,
        color: label.color,
      }),
    ),
})

registerSearchProvider({
  id: 'people',
  getDocuments: ({ members, t }) =>
    members.map(member =>
      document('people', {
        id: `person:${member.userId}`,
        entityId: member.userId,
        title:
          member.displayName ||
          member.username ||
          t('common:ui.search.circleMember'),
        subtitle: t('common:ui.search.circleMember'),
        keywords: `${member.username || ''} person member assignee tasks assigned`,
        route: `/chores?filterId=assignedTo:${member.userId}`,
      }),
    ),
})

registerSearchProvider({
  id: 'settings',
  getDocuments: ({ isParent, t }) =>
    SETTINGS_SECTIONS.filter(({ parentOnly }) => !parentOnly || isParent).map(
      ({ id, to }) =>
        document('settings', {
          id: `setting:${id}`,
          entityId: id,
          title: t(`overview.sections.${id}.title`),
          subtitle: t('title'),
          body: t(`overview.sections.${id}.description`),
          keywords: `preferences configuration ${id}`,
          route: to ?? `/settings/${id}`,
        }),
    ),
})
