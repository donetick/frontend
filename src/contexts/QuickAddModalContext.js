import { createContext, useContext, useEffect } from 'react'

export const QuickAddModalContext = createContext(null)

// Track every quick-add instance, including ones opened by page buttons.
export const useQuickAddModalRegistration = isOpen => {
  const register = useContext(QuickAddModalContext)
  useEffect(() => {
    if (isOpen && register) return register()
  }, [isOpen, register])
}
