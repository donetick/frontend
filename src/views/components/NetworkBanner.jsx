import { WifiOff } from '@mui/icons-material'
import { Alert, Box } from '@mui/joy'
import { useEffect, useState } from 'react'
import { networkManager } from '../../hooks/NetworkManager'

const NetworkBanner = () => {
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)
  useEffect(() => {
    const handleNetworkChange = isOnline => {
      setIsOnline(isOnline)
    }

    networkManager.registerNetworkListener(handleNetworkChange)
  }, [])

  return (
    <Box sx={{ position: 'relative' }}>
      {!isOnline && (
        <Alert
          variant='soft'
          color='warning'
          sx={{
            zIndex: 1000,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '4px',
            fontSize: '10px',
            fontWeight: 'md',
          }}
          startDecorator={<WifiOff />}
        >
          You are currently offline. Some features may not be available.
        </Alert>
      )}
    </Box>
  )
}

export default NetworkBanner
