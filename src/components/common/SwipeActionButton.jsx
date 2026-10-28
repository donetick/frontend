import { SwipeAction } from '@meauxt/react-swipeable-list'
import { Box, Button, Typography } from '@mui/joy'
import { useId } from 'react'

/** A revealable action, with its restriction explained in the tray, not the row. */
export default function SwipeActionButton({
  bgcolor = 'primary.solidBg',
  color = 'primary.solidColor',
  disabled = false,
  icon,
  label,
  reason,
  offsetTop = false,
  minWidth = disabled ? 104 : 76,
  onClick,
  // Leading/TrailingActions clone these props onto their direct children.
  main,
  leading,
  trailing,
}) {
  const reasonId = useId()
  const content = (
    <Box
      sx={{
        display: 'flex',
        minWidth,
        height: offsetTop ? 'calc(100% - 28px)' : '100%',
        ...(offsetTop && { mt: '28px' }),
      }}
    >
      {/* Absorb the library's row-direction layout on the outer box. */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: disabled ? 'background.level1' : bgcolor,
          color: disabled ? 'text.secondary' : color,
          ...(disabled && {
            borderInlineEnd: '1px solid',
            borderColor: 'divider',
          }),
        }}
      >
        <Button
          disabled={disabled}
          aria-describedby={disabled && reason ? reasonId : undefined}
          variant='plain'
          startDecorator={disabled ? icon : undefined}
          sx={{
            flex: disabled ? 'initial' : 1,
            width: '100%',
            minWidth: 0,
            minHeight: disabled ? 20 : 44,
            p: disabled ? 0.25 : 1,
            flexDirection: disabled ? 'row' : 'column',
            gap: 0.5,
            borderRadius: 0,
            color: 'inherit',
            fontSize: 12,
            '& svg': { fontSize: disabled ? 16 : 22, color: 'inherit' },
            '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' },
            '&.Mui-disabled': {
              bgcolor: 'transparent',
              color: 'text.secondary',
            },
          }}
        >
          {!disabled && icon}
          {label}
        </Button>
        {disabled && reason && (
          <Typography
            id={reasonId}
            level='body-xs'
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              lineHeight: 1.2,
              textAlign: 'center',
              maxWidth: minWidth,
              px: 0.75,
              pb: 0.25,
            }}
          >
            {reason}
          </Typography>
        )}
      </Box>
    </Box>
  )

  // Do NOT mount SwipeAction for disabled controls: even a guarded callback
  // registers a full-swipe action and can trigger the library's dismissal.
  if (disabled)
    return (
      <Box className='swipe-action' onClick={event => event.stopPropagation()}>
        {content}
      </Box>
    )

  return (
    <SwipeAction
      main={main}
      leading={leading}
      trailing={trailing}
      onClick={onClick}
    >
      {content}
    </SwipeAction>
  )
}
