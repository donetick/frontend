import { Box, Button, Typography } from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function AcknowledgmentModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const handleAction = useCallback(() => {
    config.onClose()
  }, [config])

  // Keyboard shortcuts for acknowledgment modal
  useEffect(() => {
    const handleKeyDown = event => {
      if (!config?.isOpen) return

      // Show keyboard shortcuts when Ctrl/Cmd is pressed
      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }

      // Ctrl/Cmd + Y for acknowledge
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault()
        handleAction()
        return
      }

      // Escape key for acknowledge
      if (event.key === 'Escape') {
        event.preventDefault()
        handleAction()
        return
      }

      // Enter key for acknowledge
      if (event.key === 'Enter') {
        event.preventDefault()
        handleAction()
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
      size='md'
      unmountDelay={250}
    >
      <Box
        sx={{ p: 2, minWidth: { xs: '100%', sm: '400px' }, maxWidth: '500px' }}
      >
        <Typography level='h4' mb={2} textAlign='center'>
          {config?.title}
        </Typography>

        <Typography
          level='body-md'
          mb={3}
          sx={{
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {config?.message}
        </Typography>

        <Box display={'flex'} justifyContent={'center'} mt={2}>
          <Button
            size='lg'
            onClick={handleAction}
            color={config?.color || 'primary'}
            fullWidth
            endDecorator={
              <KeyboardShortcutHint shortcut='Y' show={showKeyboardShortcuts} />
            }
            sx={{ minWidth: '120px' }}
          >
            {config?.acknowledgeText}
          </Button>
        </Box>
      </Box>
    </ResponsiveModal>
  )
}

export default AcknowledgmentModal
