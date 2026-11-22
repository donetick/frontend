export const TASK_PANE_WIDTH_KEY = 'taskPaneWidth'

export function parseTaskPaneWidth(value) {
  if (value === null || value === '') return null
  const width = Number(value)
  return Number.isFinite(width) && width >= 400 && width <= 900 ? width : null
}

export function getTaskPaneSize(availableWidth, preferredWidth) {
  const max = Math.max(0, Math.min(900, availableWidth - 360))
  const min = Math.min(400, max)
  const defaultWidth = Math.max(400, Math.min(640, availableWidth * 0.42))
  return {
    min,
    max,
    width: Math.max(min, Math.min(max, preferredWidth ?? defaultWidth)),
  }
}
