// Every curated template suffixes task titles with " — {{ item }}" so the
// instance name reads inline. This lets a guided import turn that suffix into
// a label instead, once instances have already been substituted into the
// title. Only templates that declare a single "item" input and use the
// suffix are eligible; anything else (manual YAML/JSON, "lines" imports)
// leaves titles untouched.
const ITEM_FIELD = 'item'

export function canUseItemAsLabel(template) {
  return (
    template?.inputs?.[0]?.name === ITEM_FIELD &&
    Boolean(
      template.rows?.some(
        row =>
          typeof row.title === 'string' && row.title.includes('{{ item }}'),
      ),
    )
  )
}

export function applyItemAsLabel(tasks, instances) {
  return tasks.map(task => {
    const itemValue = String(
      instances[task.instance]?.[ITEM_FIELD] ?? '',
    ).trim()
    const suffix = itemValue ? ` — ${itemValue}` : ''
    if (!suffix || !task.title.endsWith(suffix)) return task
    return {
      ...task,
      title: task.title.slice(0, -suffix.length),
      labels: [...new Set([...task.labels, itemValue])],
    }
  })
}
