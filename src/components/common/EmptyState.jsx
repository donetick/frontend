import { Box, Button, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

/**
 * The single empty/error surface for the app.
 *
 * variant drives the tone, the icon tile color and the a11y role:
 *   - 'empty'      nothing exists yet. Teach the feature, offer the way in.
 *   - 'no-results' something exists, the current search/filter hides it.
 *   - 'error'      we failed to load. Say what happened, offer a retry.
 *
 * Actions are objects instead of nodes so every call site gets the same
 * button vocabulary (solid primary lead, plain neutral follow).
 */

const TONES = {
  empty: {
    tileBg: 'primary.softHoverBg',
    halo: 'primary.softBg',
    iconColor: 'primary.softColor',
    role: 'status',
  },
  'no-results': {
    tileBg: 'neutral.softHoverBg',
    halo: 'neutral.softBg',
    iconColor: 'neutral.softColor',
    role: 'status',
  },
  error: {
    tileBg: 'danger.softHoverBg',
    halo: 'danger.softBg',
    iconColor: 'danger.softColor',
    role: 'alert',
  },
}

const SIZES = {
  sm: {
    tile: 48,
    icon: '1.375rem',
    halo: 6,
    py: 5,
    title: 'title-sm',
    titleSize: '1rem',
  },
  md: {
    tile: 68,
    icon: '1.875rem',
    halo: 10,
    py: 8,
    title: 'title-md',
    titleSize: '1.25rem',
  },
}

const ActionButton = ({ action, ...buttonProps }) => {
  const { label, onClick, to, ...rest } = action
  return (
    <Button
      {...buttonProps}
      {...rest}
      onClick={onClick}
      {...(to ? { component: Link, to } : {})}
    >
      {label}
    </Button>
  )
}

ActionButton.propTypes = {
  action: PropTypes.object.isRequired,
}

const EmptyState = ({
  description,
  fullHeight = false,
  icon,
  primaryAction,
  secondaryAction,
  size = 'md',
  sx,
  title,
  variant = 'empty',
  ...rest
}) => {
  const tone = TONES[variant] || TONES.empty
  const dimensions = SIZES[size] || SIZES.md
  const buttonSize = size === 'sm' ? 'sm' : 'md'

  return (
    <Box
      role={tone.role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 0.75,
        px: 3,
        py: dimensions.py,
        ...(fullHeight && { minHeight: '55vh' }),
        animation: 'dt-empty-state-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes dt-empty-state-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        ...sx,
      }}
      {...rest}
    >
      {icon && (
        <Box
          aria-hidden='true'
          sx={{
            // Two concentric tints: a wide, pale halo with a deeper medallion
            // inside it, so the icon reads as an object rather than a chip.
            width: dimensions.tile + dimensions.halo * 2,
            height: dimensions.tile + dimensions.halo * 2,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: tone.halo,
          }}
        >
          <Box
            sx={{
              width: dimensions.tile,
              height: dimensions.tile,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              bgcolor: tone.tileBg,
              color: tone.iconColor,
              '& > svg': { fontSize: dimensions.icon },
            }}
          >
            {icon}
          </Box>
        </Box>
      )}

      <Typography
        level={dimensions.title}
        sx={{
          color: 'text.primary',
          fontSize: dimensions.titleSize,
          fontWeight: 'lg',
          letterSpacing: '-0.01em',
          textWrap: 'balance',
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          level='body-sm'
          sx={{
            color: 'text.secondary',
            maxWidth: '38ch',
            lineHeight: 1.55,
            textWrap: 'pretty',
          }}
        >
          {description}
        </Typography>
      )}

      {(primaryAction || secondaryAction) && (
        <Box
          sx={{
            mt: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          {primaryAction && (
            <ActionButton
              action={primaryAction}
              variant='solid'
              color='primary'
              size={buttonSize}
              sx={{ minWidth: size === 'sm' ? 0 : 148 }}
            />
          )}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              variant='plain'
              color='neutral'
              size={buttonSize}
            />
          )}
        </Box>
      )}
    </Box>
  )
}

EmptyState.propTypes = {
  variant: PropTypes.oneOf(['empty', 'no-results', 'error']),
  icon: PropTypes.node,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  primaryAction: PropTypes.shape({
    label: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    to: PropTypes.string,
    startDecorator: PropTypes.node,
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    to: PropTypes.string,
    startDecorator: PropTypes.node,
  }),
  size: PropTypes.oneOf(['sm', 'md']),
  fullHeight: PropTypes.bool,
  sx: PropTypes.object,
}

export default EmptyState
