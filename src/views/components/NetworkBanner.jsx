import { WifiOff } from '@mui/icons-material'
import { Alert, Box } from '@mui/joy'
import { useEffect, useState } from 'react'

import { networkManager } from '../../hooks/NetworkManager'

// Brief blips, and the status settling while the app starts, stay silent.
const OFFLINE_BANNER_DELAY_MS = 1500
const BANNER_VISIBLE_MS = 5000

const NetworkBanner = () => {
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)
  const [offlineReason, setOfflineReason] = useState(
    networkManager.offlineReason,
  )
  const [isBannerVisible, setIsBannerVisible] = useState(false)

  useEffect(() => {
    const handleNetworkChange = isOnline => {
      setIsOnline(isOnline)
      setOfflineReason(networkManager.offlineReason)
      if (isOnline) setIsBannerVisible(false)
    }

    networkManager.registerNetworkListener(handleNetworkChange)
    return () => networkManager.unregisterNetworkListener(handleNetworkChange)
  }, [])

  useEffect(() => {
    if (isOnline) return

    const timerId = setTimeout(
      () => setIsBannerVisible(true),
      OFFLINE_BANNER_DELAY_MS,
    )
    return () => clearTimeout(timerId)
  }, [isOnline])

  useEffect(() => {
    if (!isBannerVisible) return

    const timerId = setTimeout(
      () => setIsBannerVisible(false),
      BANNER_VISIBLE_MS,
    )
    return () => clearTimeout(timerId)
  }, [isBannerVisible])

  const message =
    offlineReason === 'server'
      ? 'Server unreachable. Changes will sync when connection is restored.'
      : 'No internet connection. Some features may not be available.'

  return (
    <Box sx={{}}>
      {!isOnline && isBannerVisible && (
        <Alert
          variant='soft'
          color='warning'
          sx={{
            padding: '4px',
            position: 'fixed',
            paddingTop: `calc(var(--safe-area-inset-top, 0px))`,
            top: 0,
            left: 0,
            zIndex: 'var(--joy-zIndex-snackbar)',
            pt: `calc( env(safe-area-inset-top, 0px))`,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '10px',
            fontWeight: 'md',
          }}
          startDecorator={<WifiOff />}
        >
          {message}
        </Alert>
      )}
    </Box>
  )
}

export default NetworkBanner
