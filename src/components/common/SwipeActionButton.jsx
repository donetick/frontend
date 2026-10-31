import { SwipeAction } from '@meauxt/react-swipeable-list'
import { Box, Button } from '@mui/joy'

/** Keep action names recognizable; permission guidance lives in task details. */
export default function SwipeActionButton({
  bgcolor = 'primary.solidBg',
  color = 'primary.solidColor',
  disabled = false,
  icon,
  label,
  leading,
  main,
  minWidth = 76,
  // Leading/TrailingActions clone these props onto their direct children.
  offsetTop = false,
  onClick,
  trailing,
}) {
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
          bgcolor: disabled ? 'background.level1' : bgcolor,
          color: disabled ? 'text.tertiary' : color,
          ...(disabled && {
            borderInlineEnd: '1px solid',
            borderColor: 'divider',
          }),
        }}
      >
        <Button
          disabled={disabled}
          variant='plain'
          sx={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            minHeight: 36,
            p: 0.5,
            flexDirection: 'column',
            gap: 0.25,
            borderRadius: 0,
            color: 'inherit',
            fontSize: 12,
            '& svg': { fontSize: 20, color: 'inherit' },
            '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' },
            '&.Mui-disabled': {
              bgcolor: 'transparent',
              color: 'text.tertiary',
            },
          }}
        >
          {icon}
          {label}
        </Button>
      </Box>
    </Box>
  )

  // Never register a full-swipe/dismissal callback for a disabled control.
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
