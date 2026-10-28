import { Button } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import logo from '../../assets/logo.svg'
import { networkManager } from '../../hooks/NetworkManager'

// Mirrors StartupScreen's markup/CSS classes (defined in index.html) so the
// handoff from the pre-JS startup screen to this component feels seamless.
const LoadingComponent = () => {
  const { t } = useTranslation('common')
  const [message, setMessage] = useState(t('loading'))
  const [subMessage, setSubMessage] = useState('')
  const [isOnline, setIsOnline] = useState(networkManager.isOnline)

  useEffect(() => {
    if (!isOnline) {
      setMessage(t('loadingOffline'))
      setSubMessage(t('loadingOfflineSub'))
    }
  }, [isOnline, t])
  useEffect(() => {
    networkManager.registerNetworkListener(isOnline => setIsOnline(isOnline))

    // if loading took more than 5 seconds update submessage to mention there might be an error:
    const timeout = setTimeout(() => {
      if (networkManager.isOnline) {
        setSubMessage(t('loadingSlow'))
      }
    }, 5000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className='startup-screen' role='status' aria-label={message}>
      <div className='startup-screen__content'>
        <div className='startup-screen__visual' aria-hidden='true'>
          <div className='startup-screen__halo' />
          <div className='startup-screen__card startup-screen__card--back'>
            <span className='startup-screen__check'>✓</span>
            <span className='startup-screen__lines'>
              <span />
              <span />
            </span>
          </div>
          <div className='startup-screen__mascot'>
            <img src={logo} width='88' height='88' alt='' />
          </div>
          <div className='startup-screen__card startup-screen__card--front'>
            <span className='startup-screen__check'>✓</span>
            <span className='startup-screen__lines'>
              <span />
              <span />
            </span>
          </div>
          <span className='startup-screen__spark startup-screen__spark--one' />
          <span className='startup-screen__spark startup-screen__spark--two' />
        </div>
        <div className='startup-screen__copy'>
          <div className='startup-screen__name'>
            Done<span>tick</span>
          </div>
          <div className='startup-screen__caption'>{subMessage || message}</div>
        </div>
        <div className='startup-screen__dots' aria-hidden='true'>
          <span />
          <span />
          <span />
        </div>
        <div style={{ height: 68 }}>
          <Button
            variant='outlined'
            color='primary'
            onClick={() => {
              window.location.href = '/' // navigate back to the home page
            }}
            sx={{
              mt: 2,
              opacity: subMessage ? 1 : 0,
              transform: subMessage ? 'translateY(0)' : 'translateY(-6px)',
              pointerEvents: subMessage ? 'auto' : 'none',
              transition: 'opacity 400ms ease, transform 400ms ease',
            }}
          >
            {t('navigateBack')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LoadingComponent
