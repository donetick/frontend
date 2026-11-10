import catalog from './taskTemplates.json' with { type: 'json' }

// Content is data-only and portable; search and import behavior stays here.
export const taskTemplates = catalog

// The filter vocabulary, in display order. Lives here rather than in the picker
// because the `/templates` route validates its `category` query parameter
// against it before handing anything to the UI.
export const templateCategories = [
  'all',
  'cleaning',
  'kitchen',
  'homeAppliances',
  'homeSystems',
  'vehicles',
  'technology',
  'outdoors',
  'personal',
]

export const isTemplateCategory = value => templateCategories.includes(value)

// The surfaces that can open the library. Passed through as the `entry_point`
// analytics property, so adding one means extending
// TEMPLATE_ENTRY_POINT_SCHEMA in src/analytics/eventSchemas.js or the events
// will be dropped.
export const TEMPLATE_ENTRY_POINT = {
  EMPTY_STATE: 'empty_state',
  PROJECT_EMPTY_STATE: 'project_empty_state',
  SETTINGS: 'settings',
  DIRECT_LINK: 'direct_link',
  DEVELOPER: 'developer',
}

export function filterTaskTemplates(query, category = 'all') {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return taskTemplates.filter(template => {
    if (category !== 'all' && template.category !== category) return false
    const text = [
      template.name,
      template.description,
      ...template.document.tasks.map(task => task.title),
    ]
      .join(' ')
      .toLowerCase()
    return terms.every(term => text.includes(term))
  })
}

// A capability is a named group of optional tasks ("this vacuum has a mop").
// The tag is authoring metadata only: it is stripped before the document
// reaches the importer, so what ships stays an ordinary version 2 document with
// no conditional grammar for other consumers to implement.
export function templateCapabilities(template) {
  return template.capabilities ?? []
}

// Indexes of the tasks a template offers once `enabled` capabilities are on.
// Untagged tasks are always included; tagged tasks only when their group is on.
export function visibleTaskIndexes(template, enabled = []) {
  return template.document.tasks
    .map((task, index) =>
      !task.capability || enabled.includes(task.capability) ? index : -1,
    )
    .filter(index => index !== -1)
}

export function capabilityTaskIndexes(template, capability) {
  return template.document.tasks
    .map((task, index) => (task.capability === capability ? index : -1))
    .filter(index => index !== -1)
}

export function templateImportText(template, selectedTasks, extraTasks = []) {
  return JSON.stringify(
    {
      ...template.document,
      tasks: [
        ...template.document.tasks
          .filter((_, index) => selectedTasks.includes(index))
          .map(({ capability, ...task }) => task),
        ...extraTasks,
      ],
    },
    null,
    2,
  )
}
