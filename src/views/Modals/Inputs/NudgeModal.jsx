import {
    Alert,
    Box,
    Button,
    FormControl,
    FormLabel,
    Switch,
    Textarea,
    Typography,
} from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { isOfficialDonetickInstanceSync } from '../../../utils/FeatureToggle'

function NudgeModal({ config }) {
  const { t } = useTranslation(['chores', 'common'])
  const { ResponsiveModal } = useResponsiveModal()
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [message, setMessage] = useState('')
  const [notifyAllAssignees, setNotifyAllAssignees] = useState(false)
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)

  const handleAction = useCallback(
    isConfirmed => {
      if (isConfirmed) {
        config.onConfirm({
          choreId: config.choreId,
          message,
          notifyAllAssignees,
        })
      } else {
        config.onClose()
      }
    },
    [config, message, notifyAllAssignees],
  )

  // Reset form when modal opens
  useEffect(() => {
    if (config?.isOpen) {
      setMessage('')
      setNotifyAllAssignees(false)

      // Check if this is the official donetick.com instance
      try {
        setIsOfficialInstance(isOfficialDonetickInstanceSync())
      } catch (error) {
        console.warn('Error checking instance type:', error)
        setIsOfficialInstance(false)
      }
    }
  }, [config?.isOpen])

  // Keyboard shortcuts for nudge modal
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
      size='lg'
      fullWidth={true}
      unmountDelay={250}
      title={t('chores:actions.sendNudge')}
    >
      <Typography level='body-md' mb={2}>
        {t('chores:nudge.description')}
      </Typography>

      {!isOfficialInstance && (
        <Alert color='warning' sx={{ mb: 2 }}>
          <Typography level='body-sm'>
            <strong>{t('chores:nudge.headsUp')}</strong>{' '}
            {t('chores:nudge.selfHostedWarning')}
          </Typography>
        </Alert>
      )}

      <FormControl mb={2}>
        <FormLabel>{t('chores:nudge.customMessage')}</FormLabel>
        <Textarea
          placeholder={t('chores:nudge.customMessagePlaceholder')}
          value={message}
          onChange={e => setMessage(e.target.value)}
          minRows={3}
          maxRows={5}
        />
      </FormControl>

      <FormControl orientation='horizontal' sx={{ mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <FormLabel>{t('chores:edit.notifyAllAssignees')}</FormLabel>
          <Typography level='body-sm' color='text.secondary'>
            {t('chores:nudge.notifyAllDescription')}
          </Typography>
        </Box>
        <Switch
          checked={notifyAllAssignees}
          onChange={e => setNotifyAllAssignees(e.target.checked)}
        />
      </FormControl>

      <Box display={'flex'} justifyContent={'space-around'} gap={1}>
        <Button
          size='lg'
          onClick={() => handleAction(true)}
          disabled={!isOfficialInstance}
          fullWidth
          color='primary'
          endDecorator={
            <KeyboardShortcutHint shortcut='Y' show={showKeyboardShortcuts} />
          }
        >
          {t('chores:actions.sendNudge')}
        </Button>

        <Button
          size='lg'
          onClick={() => handleAction(false)}
          variant='outlined'
          fullWidth
          endDecorator={
            <KeyboardShortcutHint shortcut='X' show={showKeyboardShortcuts} />
          }
        >
          {t('common:actions.cancel')}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}

export default NudgeModal
