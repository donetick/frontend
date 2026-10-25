import { createContext, useContext } from 'react'

export const ThemeSkinContext = createContext(null)

export const useThemeSkin = () => useContext(ThemeSkinContext)
