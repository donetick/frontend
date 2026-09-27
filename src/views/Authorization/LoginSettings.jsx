import { Preferences } from '@capacitor/preferences'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WifiIcon from '@mui/icons-material/Wifi'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/joy'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { API_URL } from '../../Config'
import { useResource } from '../../queries/ResourceQueries'
import { apiClient } from '../../utils/ApiClient'
import { offlineDB } from '../../utils/OfflineDB'
import { AuthSubmitButton, AuthTextField } from './AuthFields'
import AuthShell from './AuthShell'
import { authButtonSx } from './authStyles'

const CONNECTION_TIMEOUT_MS = 8000

const LoginSettings = () => {
  const { t } = useTranslation('auth')
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
          message: t('server.unavailable503'),
        }
      }
      return {
        ok: false,
        message: t('server.errorStatus', { status: response.status }),
      }
    } catch (err) {
      clearTimeout(timeoutId)

      if (err.name === 'AbortError') {
        return {
          ok: false,
          message: t('server.timeout', {
            seconds: CONNECTION_TIMEOUT_MS / 1000,
          }),
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
            message: t('server.corsBlocked'),
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
              message: t('server.dnsFailed'),
            }
          }
          return {
            ok: false,
            message: t('server.connectionRefused'),
          }
        }
        // no-cors also timed out → server/host truly unreachable
        return {
          ok: false,
          message: t('server.unreachable'),
        }
      }

      // Fallback (should rarely hit)
      return {
        ok: false,
        message: t('server.unreachable'),
      }
    }
  }

  const handleSave = async e => {
    e.preventDefault()
    const trimmedURL = serverURL.trim()

    if (trimmedURL === '') {
      await Preferences.set({ key: 'customServerUrl', value: API_URL })
      Navigate('/login')
      return
    }

    if (!isValidURL(trimmedURL)) {
      setStatus('error')
      setErrorMessage(t('server.invalidUrl'))
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
    try {
      await offlineDB.clearAll()
    } catch (e) {
      console.error('Error clearing offline data on server change', e)
    }
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
    <AuthShell
      title={t('serverSettings')}
      subtitle={t('server.settingsSubtitle')}
    >
      <Box
        component='form'
        onSubmit={handleSave}
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        <AuthTextField
          label={t('server.url')}
          id='serverURL'
          name='serverURL'
          inputMode='url'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck='false'
          placeholder={t('server.urlPlaceholder')}
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
          helper={t('server.urlHelper')}
        />

        {status === 'error' && (
          <Alert
            color='danger'
            variant='soft'
            startDecorator={<ErrorOutlineIcon />}
            sx={{ mt: 2, borderRadius: '12px', alignItems: 'flex-start' }}
          >
            {errorMessage}
          </Alert>
        )}

        {status === 'success' && (
          <Alert
            color='success'
            variant='soft'
            startDecorator={<CheckCircleOutlineIcon />}
            sx={{ mt: 2, borderRadius: '12px' }}
          >
            {t('serverConnected')}
          </Alert>
        )}

        {status === 'testing' && (
          <Alert
            color='neutral'
            variant='soft'
            startDecorator={<WifiIcon />}
            sx={{ mt: 2, borderRadius: '12px' }}
          >
            {t('server.testingConnection')}
          </Alert>
        )}

        <AuthSubmitButton
          loading={isTesting}
          disabled={status === 'success'}
          startDecorator={isTesting ? <CircularProgress size='sm' /> : null}
          sx={{ mt: 3 }}
        >
          {isTesting
            ? t('server.testingConnectionButton')
            : t('server.saveAndConnect')}
        </AuthSubmitButton>

        <Button
          type='button'
          fullWidth
          size='lg'
          variant='plain'
          color='neutral'
          disabled={isTesting}
          sx={{ ...authButtonSx, mt: 1 }}
          onClick={async () => {
            await Preferences.set({ key: 'customServerUrl', value: API_URL })
            await apiClient.init(true)
            refetchResource()
            Navigate('/login')
          }}
        >
          {t('server.resetToDefault')}
        </Button>
      </Box>

      <Typography
        level='body-xs'
        sx={{ mt: 2.5, textAlign: 'center', color: 'text.secondary' }}
      >
        {t('serverChangeWarning')}
      </Typography>
    </AuthShell>
  )
}

export default LoginSettings
