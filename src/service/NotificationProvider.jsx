import {
  CheckCircleRounded,
  CloseRounded,
  ErrorRounded,
  InfoRounded,
  UndoRounded,
  WarningRounded,
} from '@mui/icons-material'
import { Box, Button, IconButton, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import React, { createContext, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useThemeSkin } from '../contexts/ThemeSkinContext'
import { useMobileBottomNavVisible } from '../hooks/useMobileBottomNavVisible'

const NotificationContext = createContext()

export const useNotification = () => useContext(NotificationContext)

// For backward compatibility
export const useError = () => {
  const { showError } = useNotification()
  return { showError }
}

// How long the exit animation runs before the toast leaves the list.
const EXIT_DURATION_MS = 180
// Older toasts stay in the list (and keep their timers) but stop rendering,
// so a burst of notifications never swallows the screen.
const MAX_VISIBLE = 3

// Notification types configuration; defaultTitle holds an i18n key resolved
// at render time (this object is module-level, so it can't call useTranslation).
const NOTIFICATION_TYPES = {
  error: {
    color: 'danger',
    icon: ErrorRounded,
    autoHideDuration: 6000,
    defaultTitle: 'notification.error',
  },
  success: {
    color: 'success',
    icon: CheckCircleRounded,
    autoHideDuration: 5000,
    defaultTitle: 'notification.success',
  },
  undo: {
    color: 'success',
    icon: UndoRounded,
    autoHideDuration: null,
    defaultTitle: 'notification.undoneSuccessfully',
  },
  warning: {
    color: 'warning',
    icon: WarningRounded,
    autoHideDuration: 4000,
    defaultTitle: 'notification.warning',
  },
  info: {
    color: 'primary',
    icon: InfoRounded,
    autoHideDuration: 4000,
    defaultTitle: 'notification.information',
  },
  custom: {
    color: 'neutral',
    icon: null,
    autoHideDuration: null,
    defaultTitle: 'notification.title',
  },
}

// Anchored to the top whenever the mobile bottom bar owns the bottom edge,
// otherwise it keeps the familiar bottom-right placement.
const stackPositionSx = atTop =>
  atTop
    ? {
        alignItems: 'stretch',
        left: '50%',
        top: 'calc(var(--safe-area-inset-top, 0px) + var(--app-header-offset, 0px) + 10px)',
        transform: 'translateX(-50%)',
        transition: 'top 220ms ease',
        width: 'min(440px, calc(100vw - 20px))',
      }
    : {
        alignItems: 'flex-end',
        bottom: 'calc(var(--safe-area-inset-bottom, 0px) + 16px)',
        right: 16,
        width: 'min(420px, calc(100vw - 32px))',
      }

const NotificationStack = ({ atTop, children }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      // Only the toasts themselves should intercept taps.
      pointerEvents: 'none',
      position: 'fixed',
      zIndex: 'var(--joy-zIndex-snackbar, 1400)',
      ...stackPositionSx(atTop),
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    }}
  >
    {children}
  </Box>
)

NotificationStack.propTypes = {
  atTop: PropTypes.bool.isRequired,
  children: PropTypes.node,
}

const Toast = ({
  actionLabel,
  atTop,
  color,
  dismissLabel,
  duration,
  icon,
  leaving,
  message,
  onAction,
  onDismiss,
  title,
}) => (
  <Sheet
    role={color === 'danger' ? 'alert' : 'status'}
    sx={{
      alignItems: 'flex-start',
      animation: `${leaving ? 'donetickToastOut' : 'donetickToastIn'} ${
        leaving ? EXIT_DURATION_MS : 220
      }ms cubic-bezier(.22,.61,.36,1) forwards`,
      bgcolor: 'background.surface',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 'xl',
      boxShadow: '0 14px 34px rgba(0, 0, 0, .16)',
      display: 'flex',
      gap: 1.25,
      overflow: 'hidden',
      p: 1.25,
      pointerEvents: 'auto',
      position: 'relative',
      width: '100%',
      '@keyframes donetickToastIn': {
        from: {
          opacity: 0,
          transform: `translateY(${atTop ? '-14px' : '14px'}) scale(.97)`,
        },
        to: { opacity: 1, transform: 'translateY(0) scale(1)' },
      },
      '@keyframes donetickToastOut': {
        from: { opacity: 1, transform: 'translateY(0) scale(1)' },
        to: {
          opacity: 0,
          transform: `translateY(${atTop ? '-10px' : '10px'}) scale(.97)`,
        },
      },
      '@keyframes donetickToastProgress': {
        from: { transform: 'scaleX(1)' },
        to: { transform: 'scaleX(0)' },
      },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}
  >
    {icon && (
      <Box
        sx={{
          // Joy icons read --Icon-color before currentColor, so the bubble has
          // to hand its tint over explicitly.
          '--Icon-color': 'currentColor',
          bgcolor: `${color}.softBg`,
          borderRadius: '50%',
          color: `${color}.plainColor`,
          display: 'grid',
          flex: '0 0 auto',
          height: 34,
          placeItems: 'center',
          width: 34,
          '& svg': { fontSize: 19 },
        }}
      >
        {icon}
      </Box>
    )}

    <Box sx={{ flex: 1, minWidth: 0, py: 0.25 }}>
      <Typography level='title-sm' sx={{ textWrap: 'pretty' }}>
        {title}
      </Typography>
      {message && (
        <Typography
          level='body-xs'
          textColor='text.secondary'
          sx={{ mt: 0.25, textWrap: 'pretty' }}
        >
          {message}
        </Typography>
      )}
    </Box>

    {onAction && (
      <Button
        size='sm'
        variant='soft'
        color={color}
        onClick={onAction}
        sx={{ alignSelf: 'center', borderRadius: 'lg', flex: '0 0 auto' }}
      >
        {actionLabel}
      </Button>
    )}

    <IconButton
      size='sm'
      variant='plain'
      color='neutral'
      aria-label={dismissLabel}
      onClick={onDismiss}
      sx={{
        borderRadius: '50%',
        flex: '0 0 auto',
        minHeight: 28,
        minWidth: 28,
        '& svg': { fontSize: 17 },
      }}
    >
      <CloseRounded />
    </IconButton>

    {duration && !leaving && (
      <Box
        aria-hidden='true'
        sx={{
          animation: `donetickToastProgress ${duration}ms linear forwards`,
          bgcolor: `${color}.solidBg`,
          bottom: 0,
          height: 2,
          insetInline: 0,
          opacity: 0.45,
          position: 'absolute',
          transformOrigin: 'left',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    )}
  </Sheet>
)

Toast.propTypes = {
  actionLabel: PropTypes.string,
  atTop: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  dismissLabel: PropTypes.string.isRequired,
  duration: PropTypes.number,
  icon: PropTypes.node,
  leaving: PropTypes.bool,
  message: PropTypes.node,
  onAction: PropTypes.func,
  onDismiss: PropTypes.func.isRequired,
  title: PropTypes.node,
}

export const NotificationProvider = ({ children }) => {
  const { t } = useTranslation('common')
  const { skin } = useThemeSkin()
  const isCustomTheme = skin !== 'default'
  const bottomNavVisible = useMobileBottomNavVisible()
  const [notifications, setNotifications] = useState([])

  const removeNotification = id => {
    // Flag first so the toast can play its exit animation, then drop it.
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, leaving: true } : n)),
    )
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, EXIT_DURATION_MS)
  }

  const addNotification = notification => {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      ...notification,
      timestamp: Date.now(),
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto-remove notification if it has a duration
    const config =
      NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info
    if (config.autoHideDuration) {
      setTimeout(() => {
        removeNotification(id)
      }, config.autoHideDuration)
    }

    return id
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  // Helper function to normalize notification input
  const normalizeNotification = (input, type) => {
    if (typeof input === 'string') {
      return {
        type,
        message: input,
      }
    }

    if (typeof input === 'object' && input !== null) {
      // If it's already a properly structured notification
      if (input.title || input.message) {
        return {
          type,
          ...input,
        }
      }

      // If it's a simple object with just message content
      return {
        type,
        message: input.message || input.toString(),
        title: input.title,
        ...input,
      }
    }

    return {
      type,
      message: input?.toString() || t('notification.unknown'),
    }
  }

  // Unified notification method
  const showNotification = notification => {
    // Handle different input formats
    if (typeof notification === 'string') {
      return addNotification(normalizeNotification(notification, 'info'))
    }

    return addNotification(
      normalizeNotification(notification, notification.type || 'info'),
    )
  }

  // Specific notification methods with enhanced language
  const showError = error => {
    return addNotification(normalizeNotification(error, 'error'))
  }

  const showUndo = message => {
    return addNotification(normalizeNotification(message, 'undo'))
  }

  const showSuccess = message => {
    return addNotification(normalizeNotification(message, 'success'))
  }

  const showWarning = message => {
    return addNotification(normalizeNotification(message, 'warning'))
  }

  const showInfo = message => {
    return addNotification(normalizeNotification(message, 'info'))
  }

  const renderNotification = notification => {
    const config =
      NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info

    // Handle custom notifications with components
    if (notification.type === 'custom' && notification.component) {
      return (
        <Box
          key={notification.id}
          sx={{ pointerEvents: 'auto', width: '100%' }}
        >
          {React.cloneElement(notification.component, {
            onClose: () => removeNotification(notification.id),
            ...notification.componentProps,
          })}
        </Box>
      )
    }

    // Custom skins use one accent for all toast types. Icons and titles still
    // communicate severity without introducing unrelated status colors.
    const color = isCustomTheme ? 'primary' : config.color
    const Icon = config.icon
    const icon = notification.icon || (Icon ? <Icon /> : undefined)

    // Determine title and message. A message-only toast reads better as a
    // single line than as a generic title with the real text beneath it.
    const title = notification.title || notification.message
    const message = notification.title ? notification.message : undefined

    return (
      <Toast
        key={notification.id}
        atTop={bottomNavVisible}
        color={color}
        dismissLabel={t('notification.dismiss')}
        duration={config.autoHideDuration}
        icon={icon}
        leaving={Boolean(notification.leaving)}
        message={message}
        title={title || t(config.defaultTitle)}
        actionLabel={t('notification.undo')}
        onAction={
          notification.undoAction
            ? () => {
                notification.undoAction()
                removeNotification(notification.id)
              }
            : undefined
        }
        onDismiss={() => removeNotification(notification.id)}
      />
    )
  }

  // Newest toast sits closest to the screen edge the stack is anchored to.
  const visible = notifications.slice(-MAX_VISIBLE)
  const ordered = bottomNavVisible ? [...visible].reverse() : visible

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showError,
        showSuccess,
        showUndo,
        showWarning,
        showInfo,
        removeNotification,
        clearAllNotifications,
        notifications,
      }}
    >
      {children}
      {ordered.length > 0 && (
        <NotificationStack atTop={bottomNavVisible}>
          {ordered.map(renderNotification)}
        </NotificationStack>
      )}
    </NotificationContext.Provider>
  )
}
