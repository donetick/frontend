import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import NotificationsIcon from '@mui/icons-material/Notifications'
import Alert from '@mui/joy/Alert'
import Badge from '@mui/joy/Badge'
import Box from '@mui/joy/Box'
import Button from '@mui/joy/Button'
import IconButton from '@mui/joy/IconButton'
import Input from '@mui/joy/Input'
import Option from '@mui/joy/Option'
import Select from '@mui/joy/Select'
import Typography from '@mui/joy/Typography'
import { useCallback, useEffect, useState } from 'react'

const timeUnits = [
  { label: 'Minutes', value: 'minutes' },
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
]

const beforeAfterOptions = [
  { label: 'Before Due', value: 'before' },
  { label: 'On Due', value: 'ondue' },
  { label: 'After Due', value: 'after' },
]

function getRelativeLabel(notification) {
  const { amount, unit, when } = notification

  // For "On Due" notification
  if (when === 'ondue') {
    return 'On due date'
  }

  // For before/after notifications
  return `${amount} ${unit} ${when === 'before' ? 'before' : 'after'} due`
}

const NotificationTemplate = ({ maxNotifications = 5, onChange, value }) => {
  const [templateName, setTemplateName] = useState(
    value?.name || 'New Notification Template',
  )
  const [notifications, setNotifications] = useState([
    value?.notifications || {
      amount: 0,
      when: 'ondue',
    },
  ])
  const [error, setError] = useState(null)

  // Create a map of notification indices for timeline display
  const [notificationIndexMap, setNotificationIndexMap] = useState({})

  // Use useCallback to memoize the function
  const updateNotificationIndices = useCallback(() => {
    // Sort notifications for consistent ordering
    const sorted = [...notifications].sort((a, b) => {
      // Always ensure correct ordering: Before Due -> On Due -> After Due
      if (a.when !== b.when) {
        // Before Due always comes first
        if (a.when === 'before') return -1
        if (b.when === 'before') return 1

        // On Due comes before After Due
        if (a.when === 'ondue') return -1
        if (b.when === 'ondue') return 1

        // Default case (should not be reached with our options)
        return 0
      }

      // Convert everything to minutes for consistent comparison
      const getMinutes = notif => {
        const { amount, unit } = notif
        let minutes = amount
        if (unit === 'hours') minutes *= 60
        if (unit === 'days') minutes *= 24 * 60
        return minutes
      }

      // For Before Due: sort in descending order (furthest from due first)
      // For After Due: sort in ascending order (closest to due first)
      const aMinutes = getMinutes(a)
      const bMinutes = getMinutes(b)
      return a.when === 'before' ? bMinutes - aMinutes : aMinutes - bMinutes
    })

    // Create index mapping
    const indexMap = {}
    sorted.forEach((item, index) => {
      const originalIdx = notifications.findIndex(
        n =>
          n.amount === item.amount &&
          n.unit === item.unit &&
          n.when === item.when,
      )
      indexMap[originalIdx] = index + 1
    })

    setNotificationIndexMap(indexMap)
  }, [notifications])

  // Sort notifications and update the index mapping
  useEffect(() => {
    updateNotificationIndices()
    // Clear any errors when notifications change
    setError(null)
  }, [updateNotificationIndices])

  // Notify parent component of changes including the template name
  useEffect(() => {
    if (onChange) {
      onChange({ name: templateName, notifications })
    }
  }, [templateName, notifications, onChange])

  // Validates if a notification configuration already exists
  const isDuplicate = (notification, currentIdx = -1) => {
    return notifications.some((n, idx) => {
      // Skip comparing with itself when editing
      if (idx === currentIdx) return false

      return (
        n.amount === notification.amount &&
        n.unit === notification.unit &&
        n.when === notification.when
      )
    })
  }

  const handleChange = (idx, field, value) => {
    let updatedNotification = {
      ...notifications[idx],
      [field]: value,
    }

    // Special handling for "On Due" option
    if (field === 'when' && value === 'ondue') {
      // Set default values for On Due (not applicable)
      updatedNotification = {
        ...updatedNotification,
        amount: 0,
        unit: 'minutes', // default unit, not displayed to user
      }

      // Check if another notification is already "On Due"
      const existingOnDue = notifications.findIndex(
        (n, i) => i !== idx && n.when === 'ondue',
      )

      if (existingOnDue !== -1) {
        setError(
          'Only one notification can be set to "On Due". Please choose a different timing.',
        )
        return
      }
    }

    // Check for duplicates when changing a notification
    if (isDuplicate(updatedNotification, idx)) {
      setError(
        'This notification setting already exists. Please use a different timing.',
      )
      return
    }

    const updated = notifications.map((n, i) =>
      i === idx ? updatedNotification : n,
    )
    setNotifications(updated)
    setError(null)
  }

  const handleNameChange = e => {
    setTemplateName(e.target.value)
  }
  const addSmartNotification = type => {
    if (notifications.length >= maxNotifications) return

    let newNotification
    let suggestions = []

    switch (type) {
      case 'reminder':
        // Suggest common reminder times that don't exist
        suggestions = [
          { amount: 1, unit: 'hours', when: 'before' },
          { amount: 1, unit: 'days', when: 'before' },
          { amount: 30, unit: 'minutes', when: 'before' },
          { amount: 2, unit: 'hours', when: 'before' },
          { amount: 3, unit: 'days', when: 'before' },
        ]
        break

      case 'due':
        if (notifications.some(n => n.when === 'ondue')) {
          setError('Only one "Due Alert" notification is allowed.')
          return
        }
        newNotification = { amount: 0, unit: 'minutes', when: 'ondue' }
        break

      case 'followup':
        suggestions = [
          { amount: 1, unit: 'hours', when: 'after' },
          { amount: 1, unit: 'days', when: 'after' },
          { amount: 3, unit: 'days', when: 'after' },
          { amount: 1, unit: 'weeks', when: 'after' },
        ]
        break
    }

    // For reminder/followup, find first non-duplicate suggestion
    if (suggestions.length > 0) {
      newNotification = suggestions.find(suggestion => !isDuplicate(suggestion))

      if (!newNotification) {
        setError(`All common ${type} times are already configured.`)
        return
      }
    }

    // Insert the new notification in the correct chronological position
    const updatedNotifications = [...notifications, newNotification].sort(
      (a, b) => {
        // Convert everything to minutes for consistent comparison
        const getMinutes = notif => {
          const { amount, unit, when } = notif
          // On Due is exactly at due date (0 minutes)
          if (when === 'ondue') return 0

          let minutes = amount
          if (unit === 'hours') minutes *= 60
          if (unit === 'days') minutes *= 24 * 60
          return when === 'before' ? -minutes : minutes
        }

        return getMinutes(a) - getMinutes(b)
      },
    )

    setNotifications(updatedNotifications)
    setError(null)
  }

  const removeNotification = idx => {
    const updated = notifications.filter((_, i) => i !== idx)
    setNotifications(updated)
    onChange && onChange(updated)
  }
  // Visualization: improved timeline with better scaling
  const renderTimeline = () => {
    // Sort notifications chronologically
    const sorted = [...notifications].sort((a, b) => {
      // Convert everything to minutes for consistent comparison
      const getMinutes = notif => {
        const { amount, unit, when } = notif
        // On Due is exactly at due date (0 minutes)
        if (when === 'ondue') return 0

        let minutes = amount
        if (unit === 'hours') minutes *= 60
        if (unit === 'days') minutes *= 24 * 60
        return when === 'before' ? -minutes : minutes
      }

      return getMinutes(a) - getMinutes(b)
    })

    // Create a map to track sorted indices for original notifications
    const notificationIndexMap = {}
    sorted.forEach((item, index) => {
      // Find the original index of this item in notifications array
      const originalIdx = notifications.findIndex(
        n =>
          n.amount === item.amount &&
          n.unit === item.unit &&
          n.when === item.when,
      )
      notificationIndexMap[originalIdx] = index + 1
    }) // Get min and max notification times for dynamic scaling
    const minutesValues = sorted.map(n => {
      // On Due is exactly at due date (0 minutes)
      if (n.when === 'ondue') return 0

      let minutes = n.amount
      if (n.unit === 'hours') minutes *= 60
      if (n.unit === 'days') minutes *= 24 * 60
      return n.when === 'before' ? -minutes : minutes
    })

    // Find min (before) and max (after) notification times
    const minBefore = Math.min(0, ...minutesValues) // Default to 0 if no "before" notifications
    const maxAfter = Math.max(0, ...minutesValues) // Default to 0 if no "after" notifications

    // Dynamic scaling based on notification range
    const getPositionPercent = minutes => {
      // Due date is always at center (50%)
      if (minutes === 0) return 50

      // For notifications before due date
      if (minutes < 0) {
        if (minBefore === 0) return 30 // Default position if no before notifications
        // Scale between 10% (furthest left) and 45% (closest to due)
        return 45 - (Math.abs(minutes) / Math.abs(minBefore)) * 35
      }

      // For notifications after due date
      if (maxAfter === 0) return 70 // Default position if no after notifications
      // Scale between 55% (closest to due) and 90% (furthest right)
      return 55 + (minutes / maxAfter) * 35
    }

    return (
      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography level={'body2'} sx={{ mb: 1, fontWeight: 'md' }}>
          Notification Timeline
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            height: 100,
            bgcolor: 'background.level1',
            borderRadius: 'md',
            p: 2,
            transition: 'height 0.3s ease',
            // '&:hover': {
            //   height: 130,
            // },
          }}
        >
          {/* Timeline line */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 3,
              bgcolor: 'neutral.outlinedBorder',
              mt: 2,
            }}
          >
            {/* Due date marker */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                height: 16,
                width: 3,
                bgcolor: 'warning.500',
                top: -8,
                transform: 'translateX(-50%)',
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Typography
                level={'body-xs'}
                sx={{
                  mt: 4,
                  fontWeight: 'md',
                  color: 'warning.700',
                  fontSize: '0.6rem',
                }}
              >
                Due Date
              </Typography>
            </Box>

            {/* Notification markers */}
            {sorted.map((n, i) => {
              // Convert to minutes for consistent scale
              let minutes = 0
              if (n.when !== 'ondue') {
                minutes = n.amount
                if (n.unit === 'hours') minutes *= 60
                if (n.unit === 'days') minutes *= 24 * 60
                if (n.when === 'before') minutes = -minutes
              }
              // On Due notifications are always at the due date (0 minutes)

              // Calculate position based on dynamic scaling
              const percent = getPositionPercent(minutes)

              return (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    left: `${percent}%`,
                    transform: 'translateX(-50%)',
                    color:
                      n.when === 'before'
                        ? 'primary.600'
                        : n.when === 'ondue'
                          ? 'warning.600'
                          : 'success.600',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    opacity: 0.85,
                    '&:hover': {
                      opacity: 1,
                      transform: 'translateX(-50%) scale(1.1)',
                      zIndex: 10,
                    },
                  }}
                  title={getRelativeLabel(n)}
                >
                  <Badge
                    badgeContent={i + 1}
                    size={'sm'}
                    variant={'solid'}
                    color={
                      n.when === 'before'
                        ? 'primary'
                        : n.when === 'ondue'
                          ? 'warning'
                          : 'success'
                    }
                    sx={{
                      '--Badge-paddingX': '4px',
                      '--Badge-minHeight': '16px',
                      '--Badge-fontSize': '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <NotificationsIcon
                      fontSize={'small'}
                      sx={{
                        height: 18,
                        width: 18,
                      }}
                    />
                  </Badge>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'neutral.outlinedBorder',
        borderRadius: 2,
        p: 3,
        maxWidth: 500,
        bgcolor: 'background.body',
        boxShadow: 'sm',
      }}
    >
      <Typography level={'h4'} sx={{ mb: 2 }}>
        Schedule Name
      </Typography>

      {/* Template Name Field */}
      <Box sx={{ mb: 3 }}>
        <Typography level={'body2'} sx={{ mb: 1, fontWeight: 'md' }}>
          Template Name
        </Typography>
        <Input
          value={templateName}
          onChange={handleNameChange}
          placeholder='Enter template name'
          sx={{ width: '100%' }}
        />
      </Box>

      {error && (
        <Alert
          variant='soft'
          color='danger'
          sx={{ mb: 2 }}
          startDecorator={<InfoIcon />}
        >
          {error}
        </Alert>
      )}

      {notifications.map((n, idx) => {
        // Get ordered badge number from timeline sorting
        const badgeNumber = notificationIndexMap[idx]

        return (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                mr: 1,
                flexShrink: 0,
              }}
            >
              <Badge
                badgeContent={badgeNumber}
                size={'sm'}
                sx={{
                  '--Badge-minHeight': '20px',
                  '--Badge-fontSize': '0.75rem',
                }}
                color={
                  n.when === 'before'
                    ? 'primary'
                    : n.when === 'ondue'
                      ? 'warning'
                      : 'success'
                }
              >
                <Box sx={{ width: 4, height: 16 }} />
                {/* Empty box to attach badge to */}
              </Badge>
            </Box>
            <Select
              value={n.when}
              onChange={(_, value) => handleChange(idx, 'when', value)}
              sx={{ mr: 1, minWidth: 120 }}
              size={'sm'}
            >
              {beforeAfterOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
            {/* Show disabled fields for "On Due" option for visual consistency */}
            <Input
              type={'number'}
              min={1}
              disabled={n.when === 'ondue'}
              value={n.when === 'ondue' ? '—' : n.amount}
              onChange={e =>
                handleChange(idx, 'amount', Math.max(1, Number(e.target.value)))
              }
              sx={{
                width: 70,
                mr: 1,
                opacity: n.when === 'ondue' ? 0.6 : 1,
                ...(n.when === 'ondue' && {
                  '& input': {
                    textAlign: 'center',
                  },
                }),
              }}
              size={'sm'}
              placeholder={n.when === 'ondue' ? '—' : ''}
            />
            <Select
              value={n.unit}
              disabled={n.when === 'ondue'}
              onChange={(_, value) => handleChange(idx, 'unit', value)}
              sx={{
                mr: 1,
                minWidth: 100,
                opacity: n.when === 'ondue' ? 0.6 : 1,
              }}
              size={'sm'}
            >
              {timeUnits.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
            <IconButton
              onClick={() => removeNotification(idx)}
              disabled={notifications.length === 1}
              color={'danger'}
              size={'sm'}
              sx={{ mr: 1 }}
              variant={'soft'}
            >
              <DeleteIcon fontSize={'small'} />
            </IconButton>
          </Box>
        )
      })}
      <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button
          onClick={() => addSmartNotification('reminder')}
          disabled={notifications.length >= maxNotifications}
          startDecorator={<AddIcon />}
          size={'sm'}
          variant={'outlined'}
          color={'primary'}
        >
          Reminder
        </Button>
        <Button
          onClick={() => addSmartNotification('due')}
          disabled={
            notifications.length >= maxNotifications ||
            notifications.some(n => n.when === 'ondue')
          }
          startDecorator={<AddIcon />}
          size={'sm'}
          variant={'outlined'}
          color={'warning'}
        >
          Due Alert
        </Button>
        <Button
          onClick={() => addSmartNotification('followup')}
          disabled={notifications.length >= maxNotifications}
          startDecorator={<AddIcon />}
          size={'sm'}
          variant={'outlined'}
          color={'success'}
        >
          Follow-up
        </Button>
      </Box>
      {renderTimeline()}
    </Box>
  )
}

export default NotificationTemplate
