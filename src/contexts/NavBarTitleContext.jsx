import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

const NavBarTitleContext = createContext(null)

export const NavBarTitleProvider = ({ children }) => {
  const [navBarTitle, setNavBarTitle] = useState(null)
  const value = useMemo(() => ({ navBarTitle, setNavBarTitle }), [navBarTitle])

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

export const useNavBarTitle = title => {
  const { setNavBarTitle } = useNavBarTitleContext()

  useLayoutEffect(() => {
    setNavBarTitle(title)
  }, [setNavBarTitle, title])

  useLayoutEffect(
    () => () => {
      setNavBarTitle(null)
    },
    [setNavBarTitle],
  )
}
