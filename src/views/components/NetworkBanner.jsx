import { WifiOff } from '@mui/icons-material'
import { Alert, Box } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { networkManager } from '../../hooks/NetworkManager'

const NetworkBanner = () => {
  const { t } = useTranslation('common')
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)
  const [offlineReason, setOfflineReason] = useState(
    networkManager.offlineReason,
  )
  const [isBannerVisible, setIsBannerVisible] = useState(
    !networkManager.isOnline,
  )

  useEffect(() => {
    const handleNetworkChange = isOnline => {
      setIsOnline(isOnline)
      setOfflineReason(networkManager.offlineReason)

      if (!isOnline) {
        setIsBannerVisible(true)
      }
    }

    networkManager.registerNetworkListener(handleNetworkChange)
    return () => networkManager.unregisterNetworkListener(handleNetworkChange)
  }, [])

  useEffect(() => {
    if (isOnline || !isBannerVisible) {
      return
    }

    const timerId = setTimeout(() => {
      setIsBannerVisible(false)
    }, 5000)

    return () => clearTimeout(timerId)
  }, [isOnline, isBannerVisible])

  const message =
    offlineReason === 'server'
      ? t('networkBanner.serverUnavailable')
      : t('networkBanner.offline')

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
