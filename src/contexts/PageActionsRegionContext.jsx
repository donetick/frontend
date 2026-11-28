import { createContext, useContext } from 'react'

const PageActionsRegionContext = createContext('main')

/**
 * Names the region a page header and its actions belong to.
 *
 * The desktop split view mounts two pages at once — the list on the left, a
 * task in the side pane — and each brings its own PageHeader. Without a region
 * they would compete for one page-actions slot and both pages' actions would
 * pile into whichever header registered last.
 *
 * Wrap a pane in this; everything inside it resolves to that pane's header.
 */
export function PageActionsRegion({ children, name }) {
  return (
    <PageActionsRegionContext.Provider value={name}>
      {children}
    </PageActionsRegionContext.Provider>
  )
}

export const usePageActionsRegion = () => useContext(PageActionsRegionContext)
