import { Box, Button, Typography } from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function ConfirmationModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const handleAction = useCallback(
    isConfirmed => {
      config.onClose(isConfirmed)
    },
    [config],
  )

  // Keyboard shortcuts for confirmation modal
  useEffect(() => {
    const handleKeyDown = event => {
      if (!config?.isOpen) return

      // Show keyboard shortcuts when Ctrl/Cmd is pressed
      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }

      // Ctrl/Cmd + Y for confirm
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault()
        handleAction(true)
        return
      }

      // Ctrl/Cmd + X for cancel
      if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
        event.preventDefault()
        handleAction(false)
        return
      }

      // Escape key for cancel
      if (event.key === 'Escape') {
        event.preventDefault()
        handleAction(false)
        return
      }

      // Enter key for confirm
      if (event.key === 'Enter') {
        event.preventDefault()
        handleAction(true)
        return
      }
    }

    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setShowKeyboardShortcuts(false)
      }
    }

    if (config?.isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [config?.isOpen, handleAction])

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={config?.onClose}
      size='sm'
      unmountDelay={250}
    >
      <Typography level='h4' mb={1}>
        {config?.title}
      </Typography>
      <Typography level='body-md' gutterBottom>
        {config?.message}
      </Typography>

      <Box display={'flex'} justifyContent={'space-around'} mt={1} gap={1}>
        <Button
          size='lg'
          onClick={() => {
            handleAction(true)
          }}
          fullWidth
          color={config?.color || 'primary'}
          endDecorator={
            <KeyboardShortcutHint shortcut='Y' show={showKeyboardShortcuts} />
          }
        >
          {config?.confirmText}
        </Button>

        <Button
          size='lg'
          onClick={() => {
            handleAction(false)
          }}
          variant='outlined'
          endDecorator={
            <KeyboardShortcutHint shortcut='X' show={showKeyboardShortcuts} />
          }
        >
          {config?.cancelText}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}
export default ConfirmationModal
