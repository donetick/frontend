import { Box, Button, CircularProgress, Container, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import Logo from '../../Logo'

import { Capacitor } from '@capacitor/core'
import Cookies from 'js-cookie'
import { useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUserProfile } from '../../queries/UserQueries'
import { apiClient } from '../../utils/ApiClient'
import { GetUserProfile } from '../../utils/Fetcher'
import { saveTokens } from '../../utils/TokenStorage'
import MFAVerificationModal from './MFAVerificationModal'

const AuthenticationLoading = () => {
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile()
  const Navigate = useNavigate()
  const hasCalledHandleOAuth2 = useRef(false)
  const [message, setMessage] = useState('Authenticating')
  const [subMessage, setSubMessage] = useState('Please wait')
  const [status, setStatus] = useState('pending')
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaSessionToken, setMfaSessionToken] = useState('')
  const { provider } = useParams()
  useEffect(() => {
    if (provider === 'oauth2' && !hasCalledHandleOAuth2.current) {
      hasCalledHandleOAuth2.current = true
      handleOAuth2()
    } else if (provider !== 'oauth2') {
      setMessage('Unknown Authentication Provider')
      setSubMessage('Please contact support')
    }
  }, [provider])
  const getUserProfileAndNavigateToHome = () => {
    GetUserProfile().then(data => {
      data.json().then(data => {
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
    setMessage('Authentication failed')
    setSubMessage('Two-factor authentication was cancelled')
    setStatus('error')
  }

  const handleOAuth2 = async () => {
    // get provider from params:
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const returnedState = urlParams.get('state')

    const storedState = localStorage.getItem('authState')

    if (returnedState !== storedState) {
      setMessage('Authentication failed')
      setSubMessage('State does not match')
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
          setMessage('Authentication failed')
          setSubMessage('Please try again')
          setStatus('error')
          return
        }

        const data = await response.json()

        if (data.mfaRequired) {
          if (!data.sessionToken) {
            setMessage('Authentication failed')
            setSubMessage('MFA session is missing. Please try again')
            setStatus('error')
            return
          }

          setMfaSessionToken(data.sessionToken)
          setMfaModalOpen(true)
          setMessage('Two-Factor Authentication Required')
          setSubMessage('Please verify your login to continue')
          return
        }

        if (!data.token && !data.access_token) {
          setMessage('Authentication failed')
          setSubMessage('No valid authentication token returned')
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
        setMessage('Authentication failed')
        setSubMessage('Please try again')
        setStatus('error')
      }
    }
  }

  return (
    <Container className='flex h-full items-center justify-center'>
      <Box
        className='flex flex-col items-center justify-center'
        sx={{
          minHeight: '80vh',
        }}
      >
        <CircularProgress
          determinate={status === 'error'}
          color={status === 'pending' ? 'primary' : 'danger'}
          sx={{ '--CircularProgress-size': '200px' }}
        >
          <Logo />
        </CircularProgress>
        <Box
          className='flex items-center gap-2'
          sx={{
            fontWeight: 700,
            fontSize: 24,
            mt: 2,
          }}
        >
          {message}
        </Box>
        <Typography level='body-md' fontWeight={500} textAlign={'center'}>
          {subMessage}
        </Typography>

        {status === 'error' && (
          <Button
            size='lg'
            variant='outlined'
            sx={{
              mt: 4,
            }}
          >
            <Link to='/login'>Go back Login</Link>
          </Button>
        )}

        <MFAVerificationModal
          open={mfaModalOpen}
          onClose={handleMFAClose}
          sessionToken={mfaSessionToken}
          onSuccess={handleMFASuccess}
          onError={() => {
            setMessage('Authentication failed')
            setSubMessage('Two-factor authentication failed. Please try again')
          }}
        />
      </Box>
    </Container>
  )
}

export default AuthenticationLoading
