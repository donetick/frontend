import { Box } from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import PropTypes from 'prop-types'

import { useScrollDirection } from '../../hooks/useScrollDirection'

// Wraps a page's floating action button(s) so they hide on scroll-down and
// reappear on scroll-up on mobile, matching MobileBottomNav's behavior.
const ScrollHideFab = ({ children, sx }) => {
  const isMobile = useMediaQuery('(max-width:768px)')
  const hidden = useScrollDirection({ enabled: isMobile })

  return (
    <Box
      sx={{
        position: 'fixed',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 2,
        zIndex: 100,
        // translateY alone isn't reliable here: some FABs have relatively
        // positioned children (secondary buttons, shortcut hints) that
        // visually overflow the wrapper's own layout box, so a percentage
        // shift can leave a sliver on screen. Opacity + pointer-events
        // guarantee it's actually gone, with a generous translate on top
        // so it also slides out of the way.
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transform: hidden ? 'translateY(150px)' : 'translateY(0)',
        transition: 'transform 220ms ease, opacity 220ms ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

ScrollHideFab.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
}

export default ScrollHideFab
