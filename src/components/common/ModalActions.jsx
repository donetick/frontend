import { Box, Button } from '@mui/joy'

const ActionButton = ({ action, defaults, sx }) => {
  if (!action) return null

  const { label, sx: actionSx, ...props } = action
  return (
    <Button {...defaults} {...props} sx={{ ...sx, ...actionSx }}>
      {label}
    </Button>
  )
}

/**
 * Consistent modal action row. Secondary actions are rendered first and the
 * primary action is always the final, highest-emphasis control.
 */
const ModalActions = ({
  primary,
  secondary,
  tertiary,
  children,
  stackOnMobile = false,
  sx,
}) => {
  const responsiveButtonStyles = stackOnMobile
    ? { '& > button': { width: { xs: '100%', sm: 'auto' } } }
    : undefined

  const layoutSx = {
    display: 'flex',
    flexDirection: stackOnMobile ? { xs: 'column-reverse', sm: 'row' } : 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 1,
    ...responsiveButtonStyles,
    ...sx,
  }

  if (children) return <Box sx={layoutSx}>{children}</Box>

  return (
    <Box sx={layoutSx}>
      <ActionButton
        action={tertiary}
        defaults={{ color: 'neutral', variant: 'plain' }}
        sx={{ mr: { sm: 'auto' } }}
      />
      <ActionButton
        action={secondary}
        defaults={{ color: 'neutral', variant: 'outlined' }}
      />
      <ActionButton
        action={primary}
        defaults={{ color: 'primary', variant: 'solid' }}
      />
    </Box>
  )
}

export default ModalActions
