import { Preferences } from '@capacitor/preferences'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WifiIcon from '@mui/icons-material/Wifi'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Input,
  Sheet,
  Typography,
} from '@mui/joy'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../Config'
import Logo from '../../Logo'
import { useResource } from '../../queries/ResourceQueries'
import { apiClient } from '../../utils/ApiClient'

const CONNECTION_TIMEOUT_MS = 8000

const LoginSettings = () => {
  const Navigate = useNavigate()
  const { refetch: refetchResource } = useResource()
  const [serverURL, setServerURL] = React.useState('')
  const [status, setStatus] = React.useState('idle') // 'idle' | 'testing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = React.useState('')

  React.useEffect(() => {
    Preferences.get({ key: 'customServerUrl' }).then(result => {
      setServerURL(result.value || API_URL)
    })
  }, [])

  const isValidURL = url => {
    return /^(http|https):\/\/[^ "]+$/.test(url.trim())
  }

  const testConnection = async url => {
    const testURL = url.replace(/\/+$/, '') + '/api/v1/resource'
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONNECTION_TIMEOUT_MS,
    )

    try {
      const response = await fetch(testURL, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      // Any HTTP response (even 401/404) means the server is reachable
      if (response.status < 500) {
        return { ok: true }
      }
      if (response.status === 503) {
        return {
          ok: false,
          message:
            'Server is starting up or temporarily unavailable (503). Try again in a moment.',
        }
      }
      return {
        ok: false,
        message: `Server responded with error ${response.status}. Please check your Donetick server.`,
      }
    } catch (err) {
      clearTimeout(timeoutId)

      if (err.name === 'AbortError') {
        return {
          ok: false,
          message: `Connection timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. The host may be unreachable or behind a firewall — check the IP/hostname and network.`,
        }
      }

      // Try no-cors to distinguish CORS misconfiguration from server being down
      const noCorsController = new AbortController()
      const noCorsTimeout = setTimeout(() => noCorsController.abort(), 3000)
      try {
        const probeStart = Date.now()
        const probe = await fetch(testURL, {
          method: 'GET',
          mode: 'no-cors',
          signal: noCorsController.signal,
        })
        clearTimeout(noCorsTimeout)
        if (probe.type === 'opaque') {
          // Server responded but CORS headers blocked the real request
          return {
            ok: false,
            message:
              'Server is reachable but blocked the request (CORS). Ensure your Donetick server allows requests from this origin, or check the server CORS config.',
          }
        }
        // Opaque is the only expected type for no-cors success; anything else is odd
        void probeStart
      } catch (probeErr) {
        clearTimeout(noCorsTimeout)
        if (probeErr.name !== 'AbortError') {
          // Both normal and no-cors fetch threw immediately → port refused
          const msg = probeErr.message?.toLowerCase() ?? ''
          if (
            msg.includes('getaddrinfo') ||
            msg.includes('name not resolved') ||
            msg.includes('err_name')
          ) {
            return {
              ok: false,
              message:
                'Hostname could not be resolved. Check the URL for typos or verify DNS.',
            }
          }
          return {
            ok: false,
            message:
              'Connection refused. The port may be wrong or nothing is listening — verify the URL and port (default Donetick port is 2021).',
          }
        }
        // no-cors also timed out → server/host truly unreachable
        return {
          ok: false,
          message:
            'Unable to reach the server. Check the URL, port, and network connection.',
        }
      }

      // Fallback (should rarely hit)
      return {
        ok: false,
        message:
          'Unable to reach the server. Check the URL, port, and network connection.',
      }
    }
  }

  const handleSave = async () => {
    const trimmedURL = serverURL.trim()

    if (trimmedURL === '') {
      await Preferences.set({ key: 'customServerUrl', value: API_URL })
      Navigate('/login')
      return
    }

    if (!isValidURL(trimmedURL)) {
      setStatus('error')
      setErrorMessage(
        'Invalid URL format. Include the protocol (http:// or https://) and port if needed.',
      )
      return
    }

    setStatus('testing')
    setErrorMessage('')

    const result = await testConnection(trimmedURL)

    if (!result.ok) {
      setStatus('error')
      setErrorMessage(result.message)
      return
    }

    await Preferences.set({ key: 'customServerUrl', value: trimmedURL })
    await apiClient.init(true)
    refetchResource()
    setStatus('success')

    setTimeout(() => {
      Navigate('/login')
    }, 1200)
  }

  const handleURLChange = e => {
    setServerURL(e.target.value)
    if (status !== 'idle') {
      setStatus('idle')
      setErrorMessage('')
    }
  }

  const isTesting = status === 'testing'

  return (
    <Container component='main' maxWidth='xs'>
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Sheet
          component='form'
          sx={{
            mt: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 2,
            borderRadius: '8px',
            boxShadow: 'md',
          }}
        >
          <Logo />

          <Typography level='h2'>
            Done
            <span style={{ color: '#06b6d4' }}>tick</span>
          </Typography>

          <Typography level='body2' alignSelf={'start'} mt={4}>
            Server URL
          </Typography>
          <Input
            margin='normal'
            required
            fullWidth
            id='serverURL'
            name='serverURL'
            autoFocus
            value={serverURL}
            onChange={handleURLChange}
            disabled={isTesting}
            color={
              status === 'success'
                ? 'success'
                : status === 'error'
                  ? 'danger'
                  : 'neutral'
            }
            endDecorator={
              status === 'success' ? (
                <CheckCircleOutlineIcon color='success' fontSize='small' />
              ) : status === 'error' ? (
                <ErrorOutlineIcon color='error' fontSize='small' />
              ) : null
            }
          />

          <Typography mt={1} level='body-xs'>
            Change the server URL to connect to a different server, such as your
            own self-hosted Donetick server.
          </Typography>
          <Typography mt={1} level='body-xs'>
            Include the protocol (http:// or https://) and port if necessary
            (default Donetick port is 2021).
          </Typography>

          {status === 'error' && (
            <Alert
              color='danger'
              variant='soft'
              startDecorator={<ErrorOutlineIcon />}
              sx={{ mt: 2, width: '100%' }}
            >
              {errorMessage}
            </Alert>
          )}

          {status === 'success' && (
            <Alert
              color='success'
              variant='soft'
              startDecorator={<CheckCircleOutlineIcon />}
              sx={{ mt: 2, width: '100%' }}
            >
              Connected! Redirecting to login...
            </Alert>
          )}

          {status === 'testing' && (
            <Alert
              color='neutral'
              variant='soft'
              startDecorator={<WifiIcon />}
              sx={{ mt: 2, width: '100%' }}
            >
              Testing connection to server...
            </Alert>
          )}

          <Button
            fullWidth
            size='lg'
            variant='solid'
            disabled={isTesting || status === 'success'}
            sx={{ width: '100%', mt: 2, mb: 2, borderRadius: '8px' }}
            onClick={handleSave}
            startDecorator={
              isTesting ? <CircularProgress size='sm' /> : undefined
            }
          >
            {isTesting ? 'Testing...' : 'Save & Connect'}
          </Button>
          <Button
            fullWidth
            size='lg'
            variant='soft'
            color='danger'
            disabled={isTesting}
            sx={{ width: '100%', mb: 2, borderRadius: '8px' }}
            onClick={async () => {
              await Preferences.set({ key: 'customServerUrl', value: API_URL })
              await apiClient.init(true)
              refetchResource()
              Navigate('/login')
            }}
          >
            Cancel and Reset
          </Button>
        </Sheet>
      </Box>
    </Container>
  )
}

export default LoginSettings
