import { Capacitor } from '@capacitor/core'
import { Box, Button, LinearProgress } from '@mui/joy'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useUserProfile } from '../../queries/UserQueries'
import { apiClient } from '../../utils/ApiClient'
import { GetUserProfile } from '../../utils/Fetcher'
import { endOAuthExchange } from '../../utils/OAuthExchangeState'
import { saveTokens } from '../../utils/TokenStorage'
import AuthShell from './AuthShell'
import { authButtonSx } from './authStyles'
import MFAVerificationModal from './MFAVerificationModal'

const AuthenticationLoading = () => {
  const { t } = useTranslation('auth')
  const { refetch: refetchUserProfile } = useUserProfile()
  const Navigate = useNavigate()
  const hasCalledHandleOAuth2 = useRef(false)
  const [message, setMessage] = useState(t('authenticating.signingIn'))
  const [subMessage, setSubMessage] = useState(t('authenticating.signingInSub'))
  const [status, setStatus] = useState('pending')
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaSessionToken, setMfaSessionToken] = useState('')
  const { provider } = useParams()
  useEffect(() => {
    if (provider === 'oauth2' && !hasCalledHandleOAuth2.current) {
      hasCalledHandleOAuth2.current = true
      // Release the guard once the exchange settles, so a stuck flag can never
      // suppress a genuine session expiry later on.
      handleOAuth2().finally(endOAuthExchange)
    } else if (provider !== 'oauth2') {
      setMessage(t('authenticating.unknownProvider'))
      setSubMessage(t('authenticating.contactSupport'))
      setStatus('error')
    }
    return endOAuthExchange
  }, [provider])
  const getUserProfileAndNavigateToHome = () => {
    GetUserProfile().then(response => {
      response.json().then(() => {
        refetchUserProfile().then(() => {
          // check if redirect url is set in cookie:
          const redirectUrl = Cookies.get('ca_redirect')
          if (redirectUrl) {
            Cookies.remove('ca_redirect')
            Navigate(redirectUrl)
          } else {
            Navigate('/chores')
          }
        })
      })
    })
  }

  const handleMFASuccess = async data => {
    await saveTokens({
      accessToken: data.token,
      accessTokenExpiry: data.expire,
      refreshToken: data.refresh_token,
      refreshTokenExpiry: data.refresh_token_expiry,
    })

    setMfaModalOpen(false)
    setMfaSessionToken('')

    getUserProfileAndNavigateToHome()
  }

  const handleMFAClose = () => {
    setMfaModalOpen(false)
    setMfaSessionToken('')
    setMessage(t('authenticating.signInFailed'))
    setSubMessage(t('authenticating.mfaCancelled'))
    setStatus('error')
  }

  const handleOAuth2 = async () => {
    // get provider from params:
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const returnedState = urlParams.get('state')

    const storedState = localStorage.getItem('authState')

    if (returnedState !== storedState) {
      setMessage(t('authenticating.signInFailed'))
      setSubMessage(t('authenticating.requestNotVerified'))
      setStatus('error')
      return
    }

    if (code) {
      await apiClient.init()
      const baseURL = apiClient.getApiURL()
      const redirectURI = Capacitor.isNativePlatform()
        ? 'donetick://auth/oauth2'
        : `${window.location.origin}/auth/oauth2`
      try {
        const response = await fetch(`${baseURL}/auth/oauth2/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state: returnedState,
            redirect_uri: redirectURI,
          }),
        })

        if (!response.ok) {
          console.error('Authentication failed')
          setMessage(t('authenticating.signInFailed'))
          setSubMessage(t('authenticating.tryAgain'))
          setStatus('error')
          return
        }

        const data = await response.json()

        if (data.mfaRequired) {
          if (!data.sessionToken) {
            setMessage(t('authenticating.signInFailed'))
            setSubMessage(t('authenticating.mfaSessionMissing'))
            setStatus('error')
            return
          }

          setMfaSessionToken(data.sessionToken)
          setMfaModalOpen(true)
          setMessage(t('authenticating.twoFactor'))
          setSubMessage(t('authenticating.verifyToContinue'))
          return
        }

        if (!data.token && !data.access_token) {
          setMessage(t('authenticating.signInFailed'))
          setSubMessage(t('authenticating.noToken'))
          setStatus('error')
          return
        }

        await saveTokens({
          accessToken: data.token || data.access_token,
          accessTokenExpiry: data.expire || data.access_token_expiry,
          refreshToken: data.refresh_token,
          refreshTokenExpiry: data.refresh_token_expiry,
        })

        const redirectUrl = Cookies.get('ca_redirect')
        if (redirectUrl) {
          Cookies.remove('ca_redirect')
          Navigate(redirectUrl)
        } else {
          getUserProfileAndNavigateToHome()
        }
      } catch (error) {
        console.error('Authentication request failed', error)
        setMessage(t('authenticating.signInFailed'))
        setSubMessage(t('authenticating.tryAgain'))
        setStatus('error')
      }
    }
  }

  return (
    <AuthShell title={message} subtitle={subMessage}>
      <Box
        role='status'
        aria-live='polite'
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {status === 'pending' && (
          <LinearProgress
            sx={{ width: '60%', '--LinearProgress-radius': '999px' }}
          />
        )}

        {status === 'error' && (
          <Button
            component={Link}
            to='/login'
            size='lg'
            variant='soft'
            color='neutral'
            fullWidth
            sx={authButtonSx}
          >
            {t('authenticating.backToSignIn')}
          </Button>
        )}
      </Box>

      <MFAVerificationModal
        open={mfaModalOpen}
        onClose={handleMFAClose}
        sessionToken={mfaSessionToken}
        onSuccess={handleMFASuccess}
        onError={() => {
          setMessage(t('authenticating.signInFailed'))
          setSubMessage(t('authenticating.mfaFailed'))
        }}
      />
    </AuthShell>
  )
}

export default AuthenticationLoading
