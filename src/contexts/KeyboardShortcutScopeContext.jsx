import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react'

// Three priority tiers for keyboard shortcuts, highest first. A shortcut
// picks a tier by calling the matching hook; every hook returns the same
// thing — whether *this* listener's shortcuts should run right now — so call
// sites all look the same regardless of tier:
//
//   const isActive = useXShortcutScope(...)
//   useEffect(() => {
//     const handleKeyDown = event => {
//       if (!isActive) return
//       if (event.repeat) return
//       ...
//     }
//     ...
//   }, [isActive, ...])
//
// - Modal  (useModalShortcutScope):  modals, drawers, the command palette.
//   Exclusive — only the topmost open one is active. Use for anything that
//   visually covers the page and should own the keyboard while open.
// - Page   (usePageShortcutScope):   the current route's own shortcuts (list
//   navigation, bulk actions, "open the add-task modal", ...). Active
//   whenever no Modal-tier scope is open. Pages don't need to coordinate
//   with each other — routing already ensures only one page is mounted.
// - Global (useGlobalShortcutScope): always active, everywhere, regardless
//   of what page or modal is open (e.g. Cmd+K search). Reach for this only
//   when the shortcut is genuinely meant to work no matter what — it's the
//   one tier that bypasses scoping, so prefer Page or Modal by default.
//
// Only Modal needs real state (the stack below); Page and Global are thin,
// self-documenting wrappers so a shortcut's tier is visible at its call site
// instead of being an implicit "well, it just didn't check anything."
const KeyboardShortcutScopeContext = createContext(null)

export const KeyboardShortcutScopeProvider = ({ children }) => {
  const [stack, setStack] = useState([])

  const push = useCallback(id => {
    setStack(prev => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const pop = useCallback(id => {
    setStack(prev => prev.filter(entry => entry !== id))
  }, [])

  return (
    <KeyboardShortcutScopeContext.Provider value={{ push, pop, stack }}>
      {children}
    </KeyboardShortcutScopeContext.Provider>
  )
}

const useScopeStack = () => {
  const ctx = useContext(KeyboardShortcutScopeContext)
  if (!ctx) {
    throw new Error(
      'useModalShortcutScope/usePageShortcutScope must be used within a KeyboardShortcutScopeProvider',
    )
  }
  return ctx
}

// Modal tier. Claims exclusive ownership of keyboard shortcuts while `active`
// is true (e.g. a modal's isOpen prop). Returns whether this claim is
// currently the topmost one on the stack — the only claimant whose shortcuts
// should run. Nested scopes (a modal opened from within another modal, or a
// command palette opened from inside a drawer) stack correctly: the newest
// one wins, and the previous owner resumes once it unmounts/closes.
export const useModalShortcutScope = active => {
  const id = useId()
  const { pop, push, stack } = useScopeStack()

  useEffect(() => {
    if (!active) return undefined
    push(id)
    return () => pop(id)
  }, [active, id, push, pop])

  return active && stack[stack.length - 1] === id
}

// Page tier. True whenever no Modal-tier scope currently owns the keyboard.
// Page-level shortcuts (list navigation, bulk actions, opening a modal in
// the first place, ...) should gate on this instead of each hardcoding a
// check like `if (someModalOpen) return` for every modal that happens to
// exist today.
export const usePageShortcutScope = () => {
  const { stack } = useScopeStack()
  return stack.length === 0
}

// Global tier. Always active — bypasses scoping entirely. Exists so a
// deliberately-global shortcut says so explicitly at its call site, the same
// shape as the other two tiers, rather than silently omitting any check.
export const useGlobalShortcutScope = () => true
