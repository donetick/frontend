// Viewport size describes layout, not whether a device is native or touch-capable.
// Keep the app's navigation thresholds separate from MUI's theme breakpoints.
export const MOBILE_MAX_WIDTH = 768
export const DESKTOP_NAV_MIN_WIDTH = 1024

export const maxWidthQuery = width => `(max-width:${width}px)`
export const minWidthQuery = width => `(min-width:${width}px)`

export const viewportQueries = {
  mobile: maxWidthQuery(MOBILE_MAX_WIDTH),
  aboveMobile: minWidthQuery(MOBILE_MAX_WIDTH + 1),
  desktopNav: minWidthQuery(DESKTOP_NAV_MIN_WIDTH),
  small: theme => theme.breakpoints.down('sm'),
  mediumUp: theme => theme.breakpoints.up('md'),
  largeUp: theme => theme.breakpoints.up('lg'),
  // Legacy component boundaries, intentionally not aliases for app mobile.
  compact: maxWidthQuery(600),
  narrow: maxWidthQuery(359),
  wizardMobile: maxWidthQuery(599),
  smallUp: minWidthQuery(600),
  aboveCompact: '(width > 600px)',
}

// Use the same queries in sx/styled rules as in React layout decisions.
export const viewportMedia = {
  mobile: `@media ${viewportQueries.mobile}`,
  desktopNav: `@media ${viewportQueries.desktopNav}`,
  compact: `@media ${viewportQueries.compact}`,
  narrow: `@media ${viewportQueries.narrow}`,
}
