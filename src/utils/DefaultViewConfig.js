// Which screen "/" lands on. Home is the curated overview; tasks is the full
// list at /chores, which is where the app used to open.
export const DEFAULT_VIEW_OPTIONS = ['home', 'tasks']

export const DEFAULT_VIEW = 'home'

export const DEFAULT_VIEW_PATHS = {
  home: '/home',
  tasks: '/chores',
}

const STORAGE_KEY = 'defaultView'

export const getDefaultView = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return DEFAULT_VIEW_OPTIONS.includes(saved) ? saved : DEFAULT_VIEW
}

export const getDefaultViewPath = () => DEFAULT_VIEW_PATHS[getDefaultView()]

export const saveDefaultView = view => {
  if (!DEFAULT_VIEW_OPTIONS.includes(view)) return
  localStorage.setItem(STORAGE_KEY, view)
  window.dispatchEvent(new Event('defaultViewChanged'))
}
