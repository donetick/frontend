import { Save } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined'
import Alert from '@mui/joy/Alert'
import Box from '@mui/joy/Box'
import Button from '@mui/joy/Button'
import IconButton from '@mui/joy/IconButton'
import Input from '@mui/joy/Input'
import Option from '@mui/joy/Option'
import Select from '@mui/joy/Select'
import Typography from '@mui/joy/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PAYWALL_REASON, usePaywall } from '../contexts/PaywallContext'
import { TIME_UNITS } from '../utils/DurationUtils'
import { sanitizeRemindersForPlan } from '../utils/entitlements'

const timingOptions = ['before', 'ondue', 'after']

function getInitialNotifications(value) {
  if (Array.isArray(value?.templates)) return value.templates

  try {
    const saved = JSON.parse(
      localStorage.getItem('defaultNotificationTemplate'),
    )
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function getUIRepresentation(notification) {
  const numericValue = Number(notification.value)

  if (numericValue === 0) {
    return { timing: 'ondue', displayValue: 0, unit: notification.unit || 'm' }
  }

  return {
    timing: numericValue < 0 ? 'before' : 'after',
    displayValue: Math.abs(numericValue),
    unit: notification.unit,
  }
}

function getInternalValue(timing, displayValue) {
  if (timing === 'ondue') return 0
  if (timing === 'before') return -Math.abs(displayValue)
  return Math.abs(displayValue)
}

const NotificationTemplate = ({
  maxNotifications = 5,
  // ChoreEdit owns the on/off state and must retain at least one reminder.
  // Consumers with their own empty state can pass 0.
  minNotifications = 1,
  onChange,
  value,
}) => {
  const { t } = useTranslation('chores')
  const { isPlanKnown, isPlus, showPaywall } = usePaywall()
  const [notifications, setNotifications] = useState(() =>
    getInitialNotifications(value),
  )
  const notificationsRef = useRef(notifications)
  const [draftValues, setDraftValues] = useState({})
  const [error, setError] = useState(null)
  const [showSaveDefault, setShowSaveDefault] = useState(false)

  const requirePlus = useCallback(() => {
    if (isPlus) return true
    showPaywall(PAYWALL_REASON.ADVANCED_REMINDERS)
    return false
  }, [isPlus, showPaywall])

  const commitNotifications = updated => {
    setNotifications(updated)
    notificationsRef.current = updated
    setError(null)
    setShowSaveDefault(true)
  }

  // Defaults created while subscribed may contain advanced reminders. Remove
  // those once the current plan is known so the editor matches what can save.
  useEffect(() => {
    if (!isPlanKnown || isPlus) return

    setNotifications(previous => {
      const allowed = sanitizeRemindersForPlan(previous, false)
      if (allowed.length === previous.length) return previous
      notificationsRef.current = allowed
      return allowed
    })
  }, [isPlanKnown, isPlus])

  useEffect(() => {
    onChange?.({ notifications })
  }, [notifications, onChange])

  const isDuplicate = (notification, currentIdx = -1, list = notifications) =>
    list.some(
      (item, idx) =>
        idx !== currentIdx &&
        Number(item.value) === Number(notification.value) &&
        item.unit === notification.unit,
    )

  const getSmartSuggestion = type => {
    const suggestions =
      type === 'reminder' || type === 'before'
        ? [
            { value: -1, unit: 'd' },
            { value: -3, unit: 'h' },
            { value: -30, unit: 'm' },
          ]
        : [
            { value: 1, unit: 'd' },
            { value: 3, unit: 'd' },
            { value: 7, unit: 'd' },
          ]

    return suggestions.find(
      suggestion => !isDuplicate(suggestion, -1, notificationsRef.current),
    )
  }

  const handleChange = (idx, field, nextValue) => {
    const currentNotification = notificationsRef.current[idx]
    if (!currentNotification || nextValue === null) return

    const ui = getUIRepresentation(currentNotification)

    if (field === 'timing') {
      if (nextValue !== 'ondue' && !requirePlus()) return
      ui.timing = nextValue

      if (nextValue === 'ondue') {
        ui.displayValue = 0
        ui.unit = 'm'
      } else if (Number(currentNotification.value) === 0) {
        const suggestion = getSmartSuggestion(nextValue)
        ui.displayValue = Math.abs(suggestion?.value ?? 1)
        ui.unit = suggestion?.unit ?? 'h'
      }
    } else if (field === 'displayValue') {
      ui.displayValue = Math.max(0, Number(nextValue))
    } else if (field === 'unit') {
      ui.unit = nextValue
    }

    const updatedNotification = {
      ...currentNotification,
      value: getInternalValue(ui.timing, ui.displayValue),
      unit: ui.unit,
    }
    const updated = notificationsRef.current.map((item, itemIdx) =>
      itemIdx === idx ? updatedNotification : item,
    )

    commitNotifications(updated)
  }

  const validateNotification = idx => {
    const currentList = notificationsRef.current
    const notification = currentList[idx]
    if (notification && isDuplicate(notification, idx, currentList)) {
      setError(t('notificationTemplate.errDuplicate'))
    }
  }

  const addSmartNotification = type => {
    if (notificationsRef.current.length >= maxNotifications) return
    if (type !== 'due' && !requirePlus()) return

    let newNotification
    if (type === 'due') {
      if (notificationsRef.current.some(item => Number(item.value) === 0)) {
        setError(t('notificationTemplate.errOneDue'))
        return
      }
      newNotification = { value: 0, unit: 'm' }
    } else {
      newNotification = getSmartSuggestion(type)
      if (!newNotification) {
        setError(t('notificationTemplate.errAllConfigured', { type }))
        return
      }
    }

    commitNotifications([...notificationsRef.current, newNotification])
  }

  const removeNotification = idx => {
    commitNotifications(
      notificationsRef.current.filter((_, itemIdx) => itemIdx !== idx),
    )
    setDraftValues(previous => {
      const next = {}
      Object.entries(previous).forEach(([key, draft]) => {
        const numericKey = Number(key)
        if (numericKey < idx) next[numericKey] = draft
        if (numericKey > idx) next[numericKey - 1] = draft
      })
      return next
    })
  }

  const hasDueReminder = notifications.some(item => Number(item.value) === 0)
  const hasReachedLimit = notifications.length >= maxNotifications

  return (
    <Box>
      {error && (
        <Alert
          variant='soft'
          color='danger'
          sx={{ mb: 1.5 }}
          startDecorator={<InfoIcon />}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {notifications.map((notification, idx) => {
          const ui = getUIRepresentation(notification)
          const hasOnDueElsewhere = notifications.some(
            (item, itemIdx) => itemIdx !== idx && Number(item.value) === 0,
          )

          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 48,
                px: 1.25,
                py: 0.75,
                border: '1px solid',
                borderColor: 'neutral.outlinedBorder',
                borderRadius: 'md',
                bgcolor: 'background.surface',
              }}
            >
              <NotificationsOutlined
                color='action'
                sx={{ fontSize: 20, flexShrink: 0 }}
              />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  flex: 1,
                  minWidth: 0,
                  flexWrap: 'wrap',
                }}
              >
                {ui.timing === 'ondue' ? (
                  <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                    {t('notificationTemplate.onDueDate')}
                  </Typography>
                ) : (
                  <>
                    <Select
                      value={ui.timing}
                      onChange={(_, nextTiming) =>
                        handleChange(idx, 'timing', nextTiming)
                      }
                      onBlur={() => validateNotification(idx)}
                      size='sm'
                      variant='plain'
                      sx={{ minWidth: 82 }}
                    >
                      {timingOptions.map(option => (
                        <Option
                          key={option}
                          value={option}
                          disabled={option === 'ondue' && hasOnDueElsewhere}
                        >
                          {t(`notificationTemplate.timing.${option}`)}
                        </Option>
                      ))}
                    </Select>
                    <Input
                      type='number'
                      slotProps={{ input: { min: 1, inputMode: 'numeric' } }}
                      value={
                        draftValues[idx] !== undefined
                          ? draftValues[idx]
                          : ui.displayValue
                      }
                      onChange={event => {
                        const draft = event.target.value
                        if (draft.includes('-')) return
                        setDraftValues(previous => ({
                          ...previous,
                          [idx]: draft,
                        }))

                        if (draft !== '' && Number.isFinite(Number(draft))) {
                          handleChange(idx, 'displayValue', Number(draft))
                        }
                      }}
                      onKeyDown={event => {
                        if (['-', 'e', '+', '.'].includes(event.key)) {
                          event.preventDefault()
                        }
                      }}
                      onBlur={event => {
                        handleChange(
                          idx,
                          'displayValue',
                          Math.max(1, Number(event.target.value) || 1),
                        )
                        setDraftValues(previous => {
                          const next = { ...previous }
                          delete next[idx]
                          return next
                        })
                        validateNotification(idx)
                      }}
                      sx={{ width: 58 }}
                      size='sm'
                    />
                    <Select
                      value={ui.unit}
                      onChange={(_, unit) => handleChange(idx, 'unit', unit)}
                      onBlur={() => validateNotification(idx)}
                      sx={{ minWidth: 72 }}
                      size='sm'
                      variant='plain'
                    >
                      {TIME_UNITS.map(option => (
                        <Option key={option.value} value={option.value}>
                          {t(`notificationTemplate.unitShort.${option.value}`)}
                        </Option>
                      ))}
                    </Select>
                  </>
                )}
              </Box>

              <IconButton
                onClick={() => removeNotification(idx)}
                disabled={notifications.length <= minNotifications}
                color='neutral'
                size='sm'
                variant='plain'
              >
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Box>
          )
        })}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: notifications.length ? 1.5 : 0,
          flexWrap: 'wrap',
        }}
      >
        {!hasDueReminder && (
          <Button
            onClick={() => addSmartNotification('due')}
            disabled={hasReachedLimit}
            startDecorator={<AddIcon />}
            size='sm'
            variant='soft'
          >
            {t('notificationTemplate.dueAlert')}
          </Button>
        )}
        <Button
          onClick={() => addSmartNotification('reminder')}
          disabled={hasReachedLimit}
          startDecorator={<AddIcon />}
          size='sm'
          variant='outlined'
          color='neutral'
        >
          {t('notificationTemplate.reminder')}
        </Button>
        <Button
          onClick={() => addSmartNotification('followup')}
          disabled={hasReachedLimit}
          startDecorator={<AddIcon />}
          size='sm'
          variant='outlined'
          color='neutral'
        >
          {t('notificationTemplate.followUp')}
        </Button>
      </Box>

      {showSaveDefault && notifications.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'start' }}>
          <Button
            variant='outlined'
            size='sm'
            color='neutral'
            startDecorator={<Save />}
            sx={{
              borderRadius: 6,
              fontWeight: 500,
              '&:hover': {
                background: 'neutral.softHoverBg',
              },
            }}
            onClick={() => {
              localStorage.setItem(
                'defaultNotificationTemplate',
                JSON.stringify(notifications),
              )
              setShowSaveDefault(false)
            }}
          >
            {t('notificationTemplate.rememberFuture')}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default NotificationTemplate
