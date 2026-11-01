import PropTypes from 'prop-types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useGlobalShortcutScope } from '../contexts/KeyboardShortcutScopeContext'
import { QuickAddModalContext } from '../contexts/QuickAddModalContext'
import TaskInput from '../views/components/AddTaskModal'

const BLOCKED_ROUTES = [
  '/login',
  '/signup',
  '/welcome',
  '/onboarding',
  '/get-started',
  '/ready',
]
const onChoreUpdate = () => {} // useCreateChore invalidates the shared task cache.

const GlobalQuickAdd = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const openModals = useRef(0)
  const isActive = useGlobalShortcutScope()
  const location = useLocation()
  const navigate = useNavigate()
  const register = useCallback(() => {
    openModals.current += 1
    return () => {
      openModals.current -= 1
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = event => {
      if (
        !isActive ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.key.toLowerCase() !== 'j' ||
        BLOCKED_ROUTES.some(route => location.pathname.startsWith(route))
      ) {
        return
      }

      // Keep Cmd/Ctrl+J's subtask action inside an existing quick-add modal.
      if (openModals.current > 0) return

      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || event.isComposing) return

      if (event.shiftKey) {
        navigate('/chores/create')
      } else {
        setIsOpen(true)
      }
    }

    // Capture also reaches shortcuts typed in inputs or dialogs that stop bubbling.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isActive, location.pathname, navigate])

  return (
    <QuickAddModalContext.Provider value={register}>
      {children}
      {isOpen && (
        <TaskInput
          isModalOpen
          onChoreUpdate={onChoreUpdate}
          onClose={() => setIsOpen(false)}
        />
      )}
    </QuickAddModalContext.Provider>
  )
}

GlobalQuickAdd.propTypes = {
  children: PropTypes.node,
}

export default GlobalQuickAdd
