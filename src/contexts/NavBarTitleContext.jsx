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

export const useNavBarTitle = (title, selector = null) => {
  const { setNavBarConfig } = useNavBarTitleContext()
  const selectorRef = useRef(selector)
  selectorRef.current = selector

  // Router setters can change identity between renders. Keep the callback
  // behind a ref so a fresh function cannot trigger a provider → page loop.
  const handleSelect = useCallback(
    item => selectorRef.current?.onSelect(item),
    [],
  )
  const hasSelector = Boolean(selector)
  const selectedId = selector?.selectedId ?? null
  const selectorType = selector?.type ?? null
  const selectorSignature = (selector?.items || [])
    .map(
      item =>
        `${item.id}:${item.name}:${item.color || ''}:${item.icon || ''}:${item.description || ''}:${item.count ?? ''}:${item.conditions?.length ?? ''}`,
    )
    .join('|')
  const stableSelector = useMemo(() => {
    if (!hasSelector) return null
    return {
      items: selectorRef.current.items,
      onSelect: handleSelect,
      selectedId,
      type: selectorRef.current.type,
    }
  }, [handleSelect, hasSelector, selectedId, selectorSignature, selectorType])

  useLayoutEffect(() => {
    setNavBarConfig(current => {
      if (current?.title === title && current?.selector === stableSelector) {
        return current
      }
      return { selector: stableSelector, title }
    })
  }, [setNavBarConfig, stableSelector, title])

  useLayoutEffect(
    () => () => {
      setNavBarConfig(null)
    },
    [setNavBarConfig],
  )
}
