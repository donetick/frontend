import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { CssBaseline } from '@mui/joy'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import PropType from 'prop-types'
import { useMemo } from 'react'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'

import { COLORS, THEME_BACKGROUND } from '@/constants/theme'

import { useLocalization } from './LocalizationContext'

const primaryColor = 'cyan'
const shades = [
  '50',
  ...Array.from({ length: 9 }, (_, i) => String((i + 1) * 100)),
]

const getPalette = (key = primaryColor) =>
  shades.reduce((palette, shade) => {
    palette[shade] = COLORS[key][shade]
    return palette
  }, {})

const primaryPalette = getPalette(primaryColor)

// Fallbacks only. A parent that owns the radius (ButtonGroup, Input/Select
// decorator slots, CardActions) sets --Button-radius / --IconButton-radius and
// takes precedence, which is what keeps connected groups looking connected.
const CONTROL_RADIUS = '12px'
const ICON_BUTTON_RADIUS = '10px'

const themeConfig = {
  radius: {
    xs: '6px',
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px',
  },
  colorSchemes: {
    light: {
      palette: {
        background: {
          body: THEME_BACKGROUND.light,
        },
        primary: primaryPalette,
        success: {
          50: '#f3faf7',
          100: '#def5eb',
          200: '#b7e7d5',
          300: '#8ed9be',
          400: '#6ecdb0',
          500: '#4ec1a2',
          600: '#46b89a',
          700: '#3cae91',
          800: '#32a487',
          900: '#229d76',
        },
        danger: {
          50: '#fef2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f9c1c1',
          400: '#f6a8a8',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffdf7',
          100: '#fef8e1',
          200: '#fdecb2',
          300: '#fcd982',
          400: '#fbcf52',
          500: '#f9c222',
          600: '#f6b81e',
          700: '#f3ae1a',
          800: '#f0a416',
          900: '#e99b0e',
        },
      },
    },
    dark: {
      palette: {
        background: {
          body: THEME_BACKGROUND.dark,
        },
        primary: primaryPalette,
      },
    },
  },
  components: {
    JoyButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          minHeight:
            ownerState.size === 'lg'
              ? '44px'
              : ownerState.size === 'sm'
                ? '36px'
                : '40px',
          // Read through the CSS variable so parents that own the radius
          // (ButtonGroup, Input/Select decorators, Card actions) still win.
          borderRadius: `var(--Button-radius, ${CONTROL_RADIUS})`,
          fontWeight: 600,
          transition:
            'background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 100ms ease',
          '&:active:not(:disabled)': {
            transform: 'scale(0.98)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:active:not(:disabled)': { transform: 'none' },
          },
        }),
      },
    },
    JoyIconButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: `var(--IconButton-radius, ${ICON_BUTTON_RADIUS})`,
          transition:
            'background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 100ms ease',
          '&:active:not(:disabled)': {
            transform: 'scale(0.96)',
          },
          // Touch target only for the default size. `sm`/`lg` are explicit
          // choices by the call site and keep Joy's own sizing.
          ...(ownerState.size === 'md' && {
            minWidth: '40px',
            minHeight: '40px',
            '@media (max-width: 768px)': {
              minWidth: '44px',
              minHeight: '44px',
            },
          }),
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:active:not(:disabled)': { transform: 'none' },
          },
        }),
      },
    },
    JoyButtonGroup: {
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
          '--ButtonGroup-radius': CONTROL_RADIUS,
          ...(theme.direction === 'rtl' && buttonGroupRtlGeometry(ownerState)),
        }),
      },
    },
  },
}

// Joy packs a ButtonGroup's direction-sensitive geometry into CSS custom
// properties: --Button-radius as a four-corner shorthand, --Button-margin as the
// negative overlap that collapses the seam between siblings. stylis-plugin-rtl
// mirrors real properties only — it cannot know what a custom property will end
// up feeding — so those two survive into RTL still in LTR order, while the
// separator borders declared alongside them *do* flip. The result is rounded
// corners on the wrong ends and the overlap pulling the wrong way. Re-mirror
// them here. Vertical groups have no horizontal geometry, so they are left be.
const GROUP_RADIUS = 'var(--ButtonGroup-radius)'
const CHILD_RADIUS = 'var(--unstable_childRadius)'
const OVERLAP = 'calc(var(--ButtonGroup-separatorSize) * -1)'

// Corners read clockwise from top-left. [data-first-child] is the DOM-first
// button, which in RTL renders at the *right* end of the group, so it is the one
// that needs its right corners rounded — and vice versa for [data-last-child].
const ROUNDED_RIGHT = `${CHILD_RADIUS} ${GROUP_RADIUS} ${GROUP_RADIUS} ${CHILD_RADIUS}`
const ROUNDED_LEFT = `${GROUP_RADIUS} ${CHILD_RADIUS} ${CHILD_RADIUS} ${GROUP_RADIUS}`

const buttonGroupRtlGeometry = ownerState => {
  if (ownerState.orientation === 'vertical') return {}
  return {
    '& > [data-first-child]': {
      '--Button-radius': ROUNDED_RIGHT,
      '--IconButton-radius': ROUNDED_RIGHT,
    },
    '& > [data-last-child]': {
      '--Button-radius': ROUNDED_LEFT,
      '--IconButton-radius': ROUNDED_LEFT,
    },
    // Each non-first button overlaps the sibling to its right in RTL.
    '& > :not([data-first-child]):not(:only-child)': {
      '--Button-margin': `0 ${OVERLAP} 0 0`,
      '--IconButton-margin': `0 ${OVERLAP} 0 0`,
    },
  }
}

// One theme and one emotion cache per direction, built once and reused. The RTL
// cache runs every rule through stylis-plugin-rtl, which mirrors the physical
// properties (margin-left, left, text-align, translateX, …) that `sx` emits, so
// components written for LTR lay out correctly without per-component overrides.
const byDirection = {
  ltr: {
    theme: extendTheme({ ...themeConfig, direction: 'ltr' }),
    cache: createCache({ key: 'dt', stylisPlugins: [prefixer] }),
  },
  rtl: {
    theme: extendTheme({ ...themeConfig, direction: 'rtl' }),
    cache: createCache({ key: 'dt-rtl', stylisPlugins: [prefixer, rtlPlugin] }),
  },
}

const ThemeContext = ({ children }) => {
  const { isRTL } = useLocalization()
  const { cache, theme } = useMemo(
    () => byDirection[isRTL ? 'rtl' : 'ltr'],
    [isRTL],
  )

  return (
    <CacheProvider value={cache}>
      <CssVarsProvider theme={theme}>
        <CssBaseline />
        {children}
      </CssVarsProvider>
    </CacheProvider>
  )
}

ThemeContext.propTypes = {
  children: PropType.node,
}

export default ThemeContext
