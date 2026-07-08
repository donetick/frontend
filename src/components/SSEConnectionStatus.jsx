import { Circle, SignalWifi4Bar, SignalWifiOff } from '@mui/icons-material'
import { Box, Chip, Tooltip, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useSSEContext } from '../hooks/useSSEContext'

const SSEConnectionStatus = ({
  variant = 'minimal',
  showError = false,
  sx = {},
}) => {
  const { t } = useTranslation('settings')
  const { isConnected, isConnecting, error, getConnectionStatus } =
    useSSEContext()

  const getStatusColor = () => {
    if (isConnected) return 'success'
    if (isConnecting) return 'warning'
    return 'danger'
  }

  const getStatusIcon = () => {
    if (isConnected) return <SignalWifi4Bar />
    if (isConnecting) return <Circle />
    return <SignalWifiOff />
  }

  const getStatusText = () => {
    if (isConnected) return t('advanced.connection.connected')
    if (isConnecting) return t('advanced.connection.connecting')
    return t('advanced.connection.disconnected')
  }

  const getTooltipText = () => {
    const status = getConnectionStatus()
    if (error) {
      return t('advanced.connection.tooltipError', {
        status,
        error,
      })
    }
    if (!isConnected && !isConnecting) {
      return t('advanced.connection.tooltipJoinCircle', {
        status,
      })
    }
    return t('advanced.connection.tooltipBase', { status })
  }

  if (variant === 'minimal') {
    return (
      <Tooltip title={getTooltipText()} size='sm'>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            ...sx,
          }}
        >
          <Circle
            sx={{
              fontSize: 8,
              color:
                getStatusColor() === 'success'
                  ? 'success.main'
                  : getStatusColor() === 'warning'
                    ? 'warning.main'
                    : 'danger.main',
            }}
          />
          {showError && error && (
            <Typography level='body-xs' color='danger'>
              {error}
            </Typography>
          )}
        </Box>
      </Tooltip>
    )
  }

  if (variant === 'chip') {
    return (
      <Tooltip title={getTooltipText()} size='sm'>
        <Chip
          color={getStatusColor()}
          size='sm'
          variant='soft'
          startDecorator={getStatusIcon()}
          sx={sx}
        >
          {getStatusText()}
        </Chip>
      </Tooltip>
    )
  }

  // Full variant
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getStatusIcon()}
        <Typography level='body-sm' color={getStatusColor()}>
          {getStatusText()}
        </Typography>
      </Box>
      {showError && error && (
        <Typography level='body-xs' color='danger'>
          {error}
        </Typography>
      )}
    </Box>
  )
}

export default SSEConnectionStatus
