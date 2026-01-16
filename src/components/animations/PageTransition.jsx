import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation } from 'react-router-dom'
import './PageTransition.css'

// Route hierarchy for determining navigation direction
const routeHierarchy = {
  '/': 0,
  '/my/chores': 0,
  '/chores': 1,
  '/chores/create': 2,
  '/settings': 1,
  '/things': 1,
  '/activities': 1,
  '/points': 1,
  '/labels': 1,
  '/projects': 1,
  '/login': 0,
  '/signup': 1,
  '/landing': 0,
  '/archived': 1,
}

const getRouteLevel = pathname => {
  // Check for exact matches first
  if (routeHierarchy[pathname] !== undefined) {
    return routeHierarchy[pathname]
  }

  // Check for dynamic routes (e.g., /chores/123/edit)
  if (pathname.includes('/chores/') && pathname.includes('/edit')) {
    return 3
  }
  if (pathname.includes('/chores/') && pathname.includes('/history')) {
    return 3
  }
  if (pathname.includes('/chores/') && pathname.includes('/timer')) {
    return 3
  }
  if (
    pathname.includes('/chores/') &&
    !pathname.includes('/edit') &&
    !pathname.includes('/history') &&
    !pathname.includes('/timer')
  ) {
    return 2
  }
  if (pathname.includes('/things/')) {
    return 2
  }
  if (pathname.includes('/settings/')) {
    return 2
  }

  // Default level
  return 1
}

const PageTransition = ({ children }) => {
  const location = useLocation()
  const prevLevel = useRef(0)
  const [displayLocation, setDisplayLocation] = useState(location)
  const isFirstRender = useRef(true)

  useLayoutEffect(() => {
    // Skip transition on first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      setDisplayLocation(location)
      prevLevel.current = getRouteLevel(location.pathname)
      return
    }

    // Don't transition if location hasn't actually changed
    if (location.pathname === displayLocation.pathname) {
      return
    }

    const currentLevel = getRouteLevel(location.pathname)
    const previousLevel = prevLevel.current

    // Determine navigation direction
    const isBack = currentLevel < previousLevel
    const isFade =
      location.pathname.includes('/login') ||
      location.pathname.includes('/signup') ||
      location.pathname.includes('/landing') ||
      location.pathname.includes('/auth/')

    // Apply transition type as data attribute for CSS
    document.documentElement.dataset.transition = isFade
      ? 'fade'
      : isBack
        ? 'back'
        : 'forward'

    // Trigger View Transition if supported
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        // flushSync forces React to update the DOM synchronously
        // This ensures the View Transition captures the actual DOM change
        flushSync(() => {
          setDisplayLocation(location)
        })
        // Scroll to top after DOM update
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      })
    } else {
      // Fallback for browsers without View Transitions API
      setDisplayLocation(location)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }

    // Update refs
    prevLevel.current = currentLevel
  }, [location, displayLocation.pathname])

  return (
    <div
      className='page-wrapper'
      style={{
        paddingBottom: `var(--safe-area-inset-bottom, 0px)`,
      }}
    >
      {displayLocation.pathname === location.pathname ? children : null}
    </div>
  )
}

export default PageTransition
