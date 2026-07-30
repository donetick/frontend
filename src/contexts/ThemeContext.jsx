import { COLORS } from '@/constants/theme'
import { CssBaseline } from '@mui/joy'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import PropType from 'prop-types'

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

const theme = extendTheme({
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
        root: {
          '--ButtonGroup-radius': CONTROL_RADIUS,
        },
      },
    },
  },
})

const ThemeContext = ({ children }) => (
  <CssVarsProvider theme={theme}>
    <CssBaseline />
    {children}
  </CssVarsProvider>
)

ThemeContext.propTypes = {
  children: PropType.node,
}

export default ThemeContext
