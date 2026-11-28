import { Box, Typography } from '@mui/joy'

import { useNavBarTitleContext } from '../contexts/NavBarTitleContext'
import { usePageActionsRegion } from '../contexts/PageActionsRegionContext'
import { usePageHeaderConfig } from '../hooks/usePageHeaderConfig'
import { useResponsiveQuery } from '../hooks/useResponsiveQuery'
import NavBarResourceSwitcher from '../views/components/NavBarResourceSwitcher'

/**
 * The desktop page header. Phones get this from the nav bar, which the desktop
 * layout replaces with a sidebar — so without this, desktop pages have no
 * title, no resource switcher, and nowhere for their actions to live.
 *
 * Render it as the first child of a page's own Container so it lines up with
 * the content column instead of floating in the full-width shell. It is the
 * desktop half of the page-actions slot; PageActions finds it from anywhere in
 * the page.
 */
export default function PageHeader({ sx = {}, title: titleOverride }) {
  const isDesktop = useResponsiveQuery('desktopNav')
  const { getPageActionsTargetRef } = useNavBarTitleContext()
  const region = usePageActionsRegion()
  const { selector, title: routeTitle } = usePageHeaderConfig()
  const title = titleOverride || routeTitle

  if (!isDesktop) return null

  return (
    <Box
      component='header'
      sx={{
        alignItems: 'center',
        display: 'flex',
        gap: 1,
        mb: 1.5,
        minWidth: 0,
        ...sx,
      }}
    >
      {selector ? (
        // Keep the switcher at its content width; the actions slot owns the
        // rest of the row.
        <Box sx={{ display: 'flex', flex: '0 1 auto', ml: -0.75, minWidth: 0 }}>
          <NavBarResourceSwitcher selector={selector} title={title} />
        </Box>
      ) : (
        title && (
          <Typography
            component='h1'
            level='h4'
            sx={{
              fontWeight: 'lg',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
        )
      )}

      {/* Always mounted: PageActions portals into this node, so a conditional
          slot would make a page's actions disappear. */}
      <Box
        ref={getPageActionsTargetRef('desktop', region)}
        sx={{ alignItems: 'center', display: 'flex', gap: 0.5, ml: 'auto' }}
      />
    </Box>
  )
}
