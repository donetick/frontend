import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

const ImpersonateUserContext = createContext()

export const useImpersonateUser = () => useContext(ImpersonateUserContext)

export const ImpersonateUserProvider = ({ children }) => {
  const [impersonationState, setImpersonationState] = useState({
    isImpersonating: false,
    impersonatedUser: null,
    originalUser: null,
  })

  // Start impersonation
  const startImpersonation = useCallback((userToImpersonate, currentUser) => {
    console.log('Starting impersonation:', { userToImpersonate, currentUser })
    const newState = {
      isImpersonating: true,
      impersonatedUser: userToImpersonate,
      originalUser: currentUser,
    }

    setImpersonationState(newState)

    // Store in localStorage for persistence across page refreshes
    localStorage.setItem('impersonation', JSON.stringify(newState))
    localStorage.setItem('impersonatedUserId', userToImpersonate.userId)
  }, [])

  // Stop impersonation
  const stopImpersonation = useCallback(() => {
    console.log('Stopping impersonation')
    setImpersonationState({
      isImpersonating: false,
      impersonatedUser: null,
      originalUser: null,
    })

    // Remove from localStorage
    localStorage.removeItem('impersonation')
    localStorage.removeItem('impersonatedUserId')
  }, [])

  // Get effective user (impersonated user if impersonating, otherwise current user)
  const getEffectiveUser = useCallback(
    currentUser => {
      if (
        impersonationState.isImpersonating &&
        impersonationState.impersonatedUser
      ) {
        return impersonationState.impersonatedUser
      }
      return currentUser
    },
    [impersonationState],
  )

  // Get impersonation headers for API calls
  const getImpersonationHeaders = useCallback(() => {
    if (
      impersonationState.isImpersonating &&
      impersonationState.impersonatedUser
    ) {
      return {
        'X-Impersonate-User-ID':
          impersonationState.impersonatedUser.id.toString(),
      }
    }
    return {}
  }, [impersonationState])

  // Check if user can impersonate (admin or manager)
  // Note: This is a basic check. The component using this should also check circle membership
  const canImpersonate = useCallback((user, circleMembers = []) => {
    if (!user?.id) return false

    // If circleMembers is provided, check role from there
    if (circleMembers.length > 0) {
      const member = circleMembers.find(m => m.userId === user.id)
      return member?.role === 'admin' || member?.role === 'manager'
    }

    // Fallback to user.role property (if available)
    return user?.role === 'admin' || user?.role === 'manager'
  }, [])

  // Restore impersonation state from localStorage on mount
  useEffect(() => {
    const storedImpersonation = localStorage.getItem('impersonation')
    if (storedImpersonation) {
      try {
        const parsed = JSON.parse(storedImpersonation)
        if (
          parsed.isImpersonating &&
          parsed.impersonatedUser &&
          parsed.originalUser
        ) {
          setImpersonationState(parsed)
        }
      } catch (error) {
        console.error('Failed to restore impersonation state:', error)
        localStorage.removeItem('impersonation')
      }
    }
  }, [])

  const value = {
    // State
    ...impersonationState,

    // Actions
    startImpersonation,
    stopImpersonation,

    getEffectiveUser,
    getImpersonationHeaders,
    canImpersonate,

    // Computed properties
    isImpersonating: impersonationState.isImpersonating,
    impersonatedUser: impersonationState.impersonatedUser,
    originalUser: impersonationState.originalUser,

    // Legacy support
    setImpersonatedUser: user => {
      if (user) {
        // If setting a user, assume we're starting impersonation
        // Note: This won't have originalUser, so it's for backward compatibility only
        setImpersonationState(prev => ({
          isImpersonating: true,
          impersonatedUser: user,
          originalUser: prev.originalUser,
        }))
      } else {
        stopImpersonation()
      }
    },
  }

  return (
    <ImpersonateUserContext.Provider value={value}>
      {children}
    </ImpersonateUserContext.Provider>
  )
}
