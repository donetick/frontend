import { Typography } from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function AcknowledgmentModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const handleAction = useCallback(() => {
    config.onClose()
  }, [config])

  useEffect(() => {
    const handleKeyDown = event => {
      if (!config?.isOpen) return

      if (event.ctrlKey || event.metaKey) setShowKeyboardShortcuts(true)

      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        event.key === 'Escape' ||
        event.key === 'Enter'
      ) {
        event.preventDefault()
        handleAction()
      }
    }

    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) setShowKeyboardShortcuts(false)
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
      onClose={handleAction}
      size='sm'
      title={config?.title}
      showCloseButton={false}
      footer={
        <ModalActions
          primary={{
            label: config?.acknowledgeText,
            color: config?.color || 'primary',
            onClick: handleAction,
            endDecorator: showKeyboardShortcuts ? (
              <KeyboardShortcutHint shortcut='Y' />
            ) : undefined,
          }}
        />
      }
    >
      <Typography
        level='body-md'
        sx={{
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {config?.message}
      </Typography>
    </ResponsiveModal>
  )
}

export default AcknowledgmentModal
