import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const NavBarTitleContext = createContext(null)

export const NavBarTitleProvider = ({ children }) => {
  const [navBarConfig, setNavBarConfig] = useState(null)
  const value = useMemo(
    () => ({ navBarConfig, setNavBarConfig }),
    [navBarConfig],
  )

  return (
    <NavBarTitleContext.Provider value={value}>
      {children}
    </NavBarTitleContext.Provider>
  )
}

export const useNavBarTitleContext = () => {
  const context = useContext(NavBarTitleContext)
  if (!context) {
    throw new Error(
      'useNavBarTitleContext must be used within a NavBarTitleProvider',
    )
  }
  return context
}

export const useNavBarTitle = (title, projectSwitcher = null) => {
  const { setNavBarConfig } = useNavBarTitleContext()
  const projectSwitcherRef = useRef(projectSwitcher)
  projectSwitcherRef.current = projectSwitcher

  // Router setters can change identity between renders. Exposing those
  // callbacks directly through context would make this layout effect update
  // the provider on every render, creating a provider → page → provider loop.
  const handleProjectSelect = useCallback(
    project => projectSwitcherRef.current?.onSelect(project),
    [],
  )
  const hasProjectSwitcher = Boolean(projectSwitcher)
  const selectedProjectId = projectSwitcher?.selectedProjectId ?? null
  const projectsSignature = (projectSwitcher?.projects || [])
    .map(
      project =>
        `${project.id}:${project.name}:${project.color || ''}:${project.icon || ''}`,
    )
    .join('|')
  const stableProjectSwitcher = useMemo(() => {
    if (!hasProjectSwitcher) return null
    return {
      onSelect: handleProjectSelect,
      projects: projectSwitcherRef.current.projects,
      selectedProjectId,
    }
  }, [
    handleProjectSelect,
    hasProjectSwitcher,
    projectsSignature,
    selectedProjectId,
  ])

  useLayoutEffect(() => {
    setNavBarConfig(current => {
      if (
        current?.title === title &&
        current?.projectSwitcher === stableProjectSwitcher
      ) {
        return current
      }
      return { projectSwitcher: stableProjectSwitcher, title }
    })
  }, [setNavBarConfig, stableProjectSwitcher, title])

  useLayoutEffect(
    () => () => {
      setNavBarConfig(null)
    },
    [setNavBarConfig],
  )
}
