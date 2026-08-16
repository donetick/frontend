import {
  ArrowDropDown,
  DeleteSweep,
  Info,
  Pause,
  PlayArrow,
} from '@mui/icons-material'
import { Box, Button, ButtonGroup, IconButton, Menu, MenuItem } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'

const TimerSplitButton = ({
  chore,
  disabled = false,
  fullWidth = false,
  onAction,
  onClearAllTime,
  onResetTimer,
  onShowDetails,
}) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const isMenuOpen = Boolean(anchorEl)
  const menuRef = useRef(null)

  const handleMainAction = () => {
    if (chore.status === 1) {
      onAction('pause')
    } else if (chore.status === 2) {
      onAction('resume')
    }
  }

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleShowDetails = () => {
    onShowDetails()
    handleMenuClose()
  }

  const handleResetTimer = () => {
    onResetTimer()
    handleMenuClose()
  }

  const handleClearAllTime = () => {
    onClearAllTime()
    handleMenuClose()
  }

  // Handle outside clicks to close menu
  useEffect(() => {
    const handleMenuOutsideClick = event => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        handleMenuClose()
      }
    }

    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])

  // Only show the split button when there's an active timer (status 1 or 2)
  if (chore.status === 0) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      <ButtonGroup
        variant='soft'
        color={chore.status === 1 ? 'warning' : 'success'}
        sx={{
          '--ButtonGroup-separatorSize': '1px',
          '--ButtonGroup-connected': '1',
          width: fullWidth ? '100%' : 'auto',
        }}
        disabled={disabled}
      >
        {/* Main action button */}
        <Button
          onClick={handleMainAction}
          disabled={disabled}
          size='md'
          startDecorator={chore.status === 1 ? <Pause /> : <PlayArrow />}
          sx={{
            minWidth: fullWidth ? 'auto' : 120,
            flex: fullWidth ? 1 : 'none',
          }}
        >
          {chore.status === 1 ? 'Pause' : 'Resume'}
        </Button>

        {/* Dropdown arrow button */}
        <IconButton
          onClick={handleMenuOpen}
          disabled={disabled}
          size='md'
          sx={{ px: 1, minWidth: 'auto' }}
        >
          <ArrowDropDown />
        </IconButton>
      </ButtonGroup>

      {/* Dropdown menu */}
      <Menu
        ref={menuRef}
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        placement='bottom-end'
        sx={{
          mt: 1,
        }}
      >
        <MenuItem onClick={handleShowDetails}>
          <Info sx={{ mr: 1 }} />
          Timer Details
        </MenuItem>
        {/* <MenuItem onClick={handleResetTimer}>
          <RestartAlt sx={{ mr: 1 }} />
          Restart timer
        </MenuItem> */}
        <MenuItem onClick={handleClearAllTime} color='danger'>
          <DeleteSweep sx={{ mr: 1 }} />
          Clear & Reset
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default TimerSplitButton
