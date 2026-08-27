import { Typography } from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'

import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import ModalActions from '../../../components/common/ModalActions'
import { useModalShortcutScope } from '../../../contexts/KeyboardShortcutScopeContext'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function ConfirmationModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  // Claims the keyboard while open — if another modal (e.g. a nested
  // confirmation) opens on top, this one's Y/X/Enter/Escape must stay
  // silent. See KeyboardShortcutScopeContext.
  const isShortcutScopeActive = useModalShortcutScope(config?.isOpen)

  const handleAction = useCallback(
    isConfirmed => {
      config.onClose(isConfirmed)
    },
    [config],
  )

  useEffect(() => {
    const handleKeyDown = event => {
      if (!isShortcutScopeActive) return

      if (event.ctrlKey || event.metaKey) setShowKeyboardShortcuts(true)

      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault()
        handleAction(true)
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
        event.preventDefault()
        handleAction(false)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleAction(false)
      } else if (event.key === 'Enter' && config?.color !== 'danger') {
        event.preventDefault()
        handleAction(true)
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
  }, [config?.isOpen, config?.color, handleAction, isShortcutScopeActive])

  const isDestructive = config?.color === 'danger'

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={() => handleAction(false)}
      size='sm'
      role={isDestructive ? 'alertdialog' : 'dialog'}
      title={config?.title}
      showCloseButton={false}
      closeOnBackdrop={!isDestructive}
      footer={
        <ModalActions
          stackOnMobile
          secondary={{
            label: config?.cancelText,
            onClick: () => handleAction(false),
            endDecorator: showKeyboardShortcuts ? (
              <KeyboardShortcutHint shortcut='X' />
            ) : undefined,
          }}
          primary={{
            label: config?.confirmText,
            color: config?.color || 'primary',
            onClick: () => handleAction(true),
            endDecorator: showKeyboardShortcuts ? (
              <KeyboardShortcutHint shortcut='Y' />
            ) : undefined,
          }}
        />
      }
    >
      <Typography level='body-md' sx={{ whiteSpace: 'pre-wrap' }}>
        {config?.message}
      </Typography>
    </ResponsiveModal>
  )
}

export default ConfirmationModal
