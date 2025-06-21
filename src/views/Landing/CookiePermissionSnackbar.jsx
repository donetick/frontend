import { Button } from '@mui/joy'
import Cookies from 'js-cookie'
import { useEffect } from 'react'
import { useNotification } from '../../service/NotificationProvider'

const CookiePermissionSnackbar = () => {
  const { showNotification } = useNotification()

  useEffect(() => {
    const cookiePermission = Cookies.get('cookies_permission')

    if (cookiePermission !== 'true') {
      showNotification({
        type: 'custom',
        component: <CookieAcceptComponent />,
        snackbarProps: {
          autoHideDuration: null,
        },
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      })
    }
  }, [showNotification])

  return null
}

const CookieAcceptComponent = ({ onClose }) => {
  const handleAccept = () => {
    Cookies.set('cookies_permission', 'true')
    onClose?.()
  }

  return (
    <div>
      We use cookies to ensure you get the best experience on our website.
      <Button variant='soft' onClick={handleAccept} sx={{ ml: 2 }}>
        Accept
      </Button>
    </div>
  )
}

export default CookiePermissionSnackbar
