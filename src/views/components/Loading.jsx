import { Button, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import StartupScreen from '../../components/StartupScreen'
import { networkManager } from '../../hooks/NetworkManager'

// Long enough that a normal load or a brief connection blip never shows it.
const DETAILS_DELAY_MS = 5000

// Same visual as the startup screen, so route data loading during boot looks
// like one continuous screen. Slow/offline details only appear when stuck.
const LoadingComponent = () => {
  const { t } = useTranslation('common')
  const [showDetails, setShowDetails] = useState(false)
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)

  useEffect(() => {
    const handleNetworkChange = online => setIsOnline(online)
    networkManager.registerNetworkListener(handleNetworkChange)
    const timeout = setTimeout(() => setShowDetails(true), DETAILS_DELAY_MS)

    return () => {
      clearTimeout(timeout)
      networkManager.unregisterNetworkListener(handleNetworkChange)
    }
  }, [])

  return (
    <StartupScreen>
      {showDetails && (
        <div className='startup-screen__details'>
          {!isOnline && <Typography>{t('loadingOffline')}</Typography>}
          <Typography>
            {t(isOnline ? 'loadingSlow' : 'loadingOfflineSub')}
          </Typography>
          <Button
            variant='outlined'
            color='primary'
            sx={{ mt: 2 }}
            onClick={() => {
              window.location.href = '/' // navigate back to the home page
            }}
          >
            {t('navigateBack')}
          </Button>
        </div>
      )}
    </StartupScreen>
  )
}

export default LoadingComponent
