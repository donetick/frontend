import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
// import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { Settings } from '@mui/icons-material'
import AppleIcon from '@mui/icons-material/Apple'
import GoogleIcon from '@mui/icons-material/Google'
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Input,
  Sheet,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginSocialGoogle } from 'reactjs-social-login'
import { GOOGLE_CLIENT_ID, REDIRECT_URL } from '../../Config'
import { useAuth } from '../../hooks/useAuth.jsx'
import Logo from '../../Logo'
import { useResource } from '../../queries/ResourceQueries'
import { useUserProfile } from '../../queries/UserQueries.jsx'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { saveTokens } from '../../utils/TokenStorage'
import { buildChildUsername, getUserDisplayInfo } from '../../utils/UserHelpers'
import MFAVerificationModal from './MFAVerificationModal'

const LoginView = () => {
  // Use React Query client directly to invalidate the user profile query
  const queryClient = useQueryClient()
  // const [userProfile, setUserProfile] = useState(null)
  const { data: userProfile } = useUserProfile()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaSessionToken, setMfaSessionToken] = useState('')
  const [isAppleSignInSupported, setIsAppleSignInSupported] = useState(false)

  // Child login state
  const [loginType, setLoginType] = useState('primary')
  const [parentUsername, setParentUsername] = useState('')
  const [childName, setChildName] = useState('')

  // Clear fields when switching login modes
  const handleLoginModeChange = (event, newValue) => {
    setLoginType(newValue)
    setUsername('')
    setParentUsername('')
    setChildName('')
    setPassword('')
  }
  const { data: resource } = useResource()
  const { showError } = useNotification()
  const { isAuthenticated, login: authLogin, user } = useAuth()
  const Navigate = useNavigate()
  useEffect(() => {
    const initializeSocialLogin = async () => {
      await SocialLogin.initialize({
        google: {
          webClientId: import.meta.env.VITE_APP_GOOGLE_CLIENT_ID,
          iOSClientId: import.meta.env.VITE_APP_IOS_CLIENT_ID,
          mode: 'online', // replaces grantOfflineAccess
        },
      })

      // Check if Apple Sign In is supported (iOS 13+)
      if (Capacitor.isNativePlatform()) {
        try {
          const deviceInfo = await Device.getInfo()
          if (deviceInfo.platform === 'ios') {
            const majorVersion = parseInt(deviceInfo.osVersion.split('.')[0])
            setIsAppleSignInSupported(majorVersion >= 13)
          }
        } catch (error) {
          console.log(
            'Could not determine device info for Apple Sign In support',
          )
        }
      }
    }
    initializeSocialLogin()
  }, [])
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserProfile(user)
      Navigate('/chores')
    }
  }, [isAuthenticated, user, Navigate])
  const handleSubmit = async e => {
    e.preventDefault()

    // Validation for child login
    if (loginType === 'sub') {
      if (!parentUsername.trim()) {
        showError({
          title: 'Validation Error',
          message: 'Primary username is required for sub account login',
        })
        return
      }
      if (!childName.trim()) {
        showError({
          title: 'Validation Error',
          message: 'Sub account name is required for sub account login',
        })
        return
      }
    } else {
      if (!username.trim()) {
        showError({
          title: 'Validation Error',
          message: 'Username is required',
        })
        return
      }
    }

    if (!password) {
      showError({
        title: 'Validation Error',
        message: 'Password is required',
      })
      return
    }

    // Determine the actual username to send
    const actualUsername =
      loginType === 'sub'
        ? buildChildUsername(parentUsername, childName)
        : username

    const result = await authLogin({ username: actualUsername, password })

    if (result.success) {
      if (result.data?.mfaRequired) {
        setMfaSessionToken(result.data.sessionToken)
        setMfaModalOpen(true)
        return
      }

      // Refetch user profile after successful login
      queryClient.refetchQueries(['userProfile'])

      const redirectUrl = Cookies.get('ca_redirect')
      if (redirectUrl && redirectUrl !== '/') {
        Cookies.remove('ca_redirect')
        Navigate(redirectUrl)
      } else {
        Navigate('/chores')
      }
    } else {
      showError({
        title: 'Login Failed',
        message: result.error || 'An error occurred, please try again',
      })
    }
  }

  const loggedWithProvider = async function (provider, data) {
    const getAccessToken = data => {
      if (data['access_token']) {
        return data['access_token']
      } else if (data['accessToken']) {
        return data['accessToken']['token']
      } else if (data['response'] && data['response']['id_token']) {
        return data['response']['id_token']
      } else if (data['id_token']) {
        return data['id_token']
      }
    }

    try {
      const response = await apiClient.post(`/auth/${provider}/callback`, {
        provider: provider,
        token: getAccessToken(data),
        data: data,
      })

      if (response.ok) {
        const responseData = await response.json()

        // Check if MFA is required for OAuth login
        if (responseData.mfaRequired) {
          setMfaSessionToken(responseData.sessionToken)
          setMfaModalOpen(true)
          return
        }

        // Use new auth system to handle token storage
        if (responseData.token || responseData.access_token) {
          const token = responseData.token || responseData.access_token
          const expiry = responseData.expire || responseData.access_token_expiry

          // Save all tokens including refresh tokens
          await saveTokens({
            accessToken: token,
            accessTokenExpiry: expiry,
            refreshToken: responseData.refresh_token,
            refreshTokenExpiry: responseData.refresh_token_expiry,
          })

          // Refetch user profile after successful OAuth login
          queryClient.invalidateQueries(['userProfile'])

          const redirectUrl = Cookies.get('ca_redirect')
          if (redirectUrl) {
            Cookies.remove('ca_redirect')
            Navigate(redirectUrl)
          } else {
            getUserProfileAndNavigateToHome()
          }
        }
      } else {
        const providerName = provider === 'apple' ? 'Apple' : 'Google'
        showError({
          title: `${providerName} Login Failed`,
          message: `Couldn't log in with ${providerName}, please try again`,
        })
      }
    } catch (error) {
      const providerName = provider === 'apple' ? 'Apple' : 'Google'
      showError({
        title: `${providerName} Login Error`,
        message: 'Network error occurred, please try again',
      })
    }
  }
  const getUserProfileAndNavigateToHome = () => {
    // Refetch user profile after login using React Query
    queryClient.invalidateQueries(['userProfile']).then(() => {
      // check if redirect url is set in cookie:
      const redirectUrl = Cookies.get('ca_redirect')
      if (redirectUrl) {
        Cookies.remove('ca_redirect')
        Navigate(redirectUrl)
      } else {
        Navigate('/chores')
      }
    })
  }

  const handleMFASuccess = async data => {
    // Save all tokens including refresh tokens
    await saveTokens({
      accessToken: data.token,
      accessTokenExpiry: data.expire,
      refreshToken: data.refresh_token,
      refreshTokenExpiry: data.refresh_token_expiry,
    })

    setMfaModalOpen(false)
    setMfaSessionToken('')

    // Refetch user profile after MFA success
    queryClient.invalidateQueries(['userProfile'])

    const redirectUrl = Cookies.get('ca_redirect')
    if (redirectUrl) {
      Cookies.remove('ca_redirect')
      Navigate(redirectUrl)
    } else {
      Navigate('/chores')
    }
  }

  const handleMFAError = errorMessage => {
    showError({
      title: 'Two-Factor Authentication Failed',
      message: errorMessage,
    })
  }

  const handleMFAClose = () => {
    setMfaModalOpen(false)
    setMfaSessionToken('')
  }

  const handleForgotPassword = () => {
    Navigate('/forgot-password')
  }
  const generateRandomState = () => {
    const randomState = Math.random().toString(32).substring(5)
    localStorage.setItem('authState', randomState)

    return randomState
  }

  const handleAuthentikLogin = async () => {
    const authentikAuthorizeUrl = resource?.identity_provider?.auth_url
    const state = generateRandomState()

    if (Capacitor.isNativePlatform()) {
      // For mobile devices, use a custom URL scheme for the redirect
      const redirectUri = 'donetick://auth/oauth2'

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: resource?.identity_provider?.client_id,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state: state,
      })

      const authUrl = `${authentikAuthorizeUrl}?${params.toString()}`
      console.log('Opening OAuth in browser:', authUrl)

      try {
        // Open OAuth flow in system browser
        await Browser.open({ url: authUrl })

        // Note: The OAuth callback will be handled by deep link handling
        // You'll need to implement deep link handling to catch the redirect
        // and extract the authorization code
      } catch (error) {
        console.error('Failed to open OAuth browser:', error)
        showError({
          title: 'OAuth Error',
          message: 'Failed to open authentication browser',
        })
      }
    } else {
      // For web platforms, use the current approach
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: resource?.identity_provider?.client_id,
        redirect_uri: `${window.location.origin}/auth/oauth2`,
        scope: 'openid profile email',
        state: state,
      })

      console.log('redirect', `${authentikAuthorizeUrl}?${params.toString()}`)
      window.location.href = `${authentikAuthorizeUrl}?${params.toString()}`
    }
  }

  return (
    <Container
      component='main'
      maxWidth='xs'

      // make content center in the middle of the page:
    >
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
          {Capacitor.isNativePlatform() && (
            <IconButton
              //  on top right of the screen:
              sx={{ position: 'absolute', top: 2, right: 2, color: 'black' }}
              onClick={() => {
                Navigate('/login/settings')
              }}
            >
              {' '}
              <Settings />
            </IconButton>
          )}
          <Logo />

          <Typography level='h2'>
            Done
            <span style={{ color: '#06b6d4' }}>tick</span>
          </Typography>

          {userProfile && (
            <>
              <Avatar
                src={userProfile?.image}
                alt={userProfile?.username}
                size='lg'
                sx={{ mt: 2, width: '96px', height: '96px', mb: 1 }}
              />
              <Typography level='body-md' alignSelf={'center'}>
                Welcome back,{' '}
                {userProfile?.displayName || userProfile?.username}
                {getUserDisplayInfo(userProfile).userType === 'child' && (
                  <Typography
                    component='span'
                    level='body-xs'
                    color='neutral'
                    sx={{ ml: 1 }}
                  >
                    (Sub Account)
                  </Typography>
                )}
              </Typography>

              <Button
                fullWidth
                size='lg'
                sx={{ mt: 3, mb: 2 }}
                onClick={() => {
                  getUserProfileAndNavigateToHome()
                }}
              >
                Continue as {userProfile.displayName || userProfile.username}
              </Button>
              <Button
                type='submit'
                fullWidth
                size='lg'
                variant='plain'
                sx={{
                  width: '100%',
                  mb: 2,
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={() => {
                  apiClient.handleLogout()
                }}
              >
                Logout
              </Button>
            </>
          )}
          {!userProfile && (
            <>
              <Typography level='body2' sx={{ mb: 3 }}>
                Sign in to your account to continue
              </Typography>

              {/* Login Type Tabs */}
              <Tabs
                value={loginType}
                onChange={handleLoginModeChange}
                sx={{ width: '100%', mb: 3 }}
              >
                <TabList
                  sx={{
                    width: '100%',
                    p: 0.5,
                    borderBottom: 'none',
                    boxShadow: 'none',
                    '&::after': {
                      display: 'none',
                    },
                  }}
                >
                  <Tab
                    value='primary'
                    variant='plain'
                    sx={{
                      flex: 1,
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    Primary Account
                  </Tab>
                  <Tab
                    value='sub'
                    variant='plain'
                    sx={{
                      flex: 1,
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    Sub Account
                  </Tab>
                </TabList>

                <TabPanel value='primary' sx={{ p: 0, mt: 2 }}>
                  <Typography level='body2' alignSelf={'start'} mb={1}>
                    Username
                  </Typography>
                  <Input
                    margin='normal'
                    required
                    fullWidth
                    id='email'
                    label='Email Address'
                    name='email'
                    autoComplete='email'
                    autoFocus
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value)
                    }}
                  />
                </TabPanel>

                <TabPanel value='sub' sx={{ p: 0, mt: 2 }}>
                  <Typography level='body2' alignSelf={'start'} mb={1}>
                    Primary Account Username
                  </Typography>
                  <Input
                    margin='normal'
                    required
                    fullWidth
                    id='parentUsername'
                    name='parentUsername'
                    placeholder='Enter primary account username'
                    autoFocus
                    value={parentUsername}
                    onChange={e => {
                      setParentUsername(e.target.value)
                    }}
                  />
                  <Typography level='body2' alignSelf={'start'} mt={1} mb={1}>
                    Sub Account Username
                  </Typography>
                  <Input
                    margin='normal'
                    required
                    fullWidth
                    id='childName'
                    name='childName'
                    placeholder='Enter sub account name'
                    value={childName}
                    onChange={e => {
                      setChildName(e.target.value)
                    }}
                  />
                </TabPanel>
              </Tabs>

              <Typography level='body2' alignSelf={'start'} mb={1}>
                Password:
              </Typography>
              <Input
                margin='normal'
                required
                fullWidth
                name='password'
                label='Password'
                type='password'
                id='password'
                autoComplete='password'
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                }}
              />

              <Button
                type='submit'
                fullWidth
                size='lg'
                variant='solid'
                sx={{
                  width: '100%',
                  mt: 3,
                  mb: 2,
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={handleSubmit}
              >
                {loginType === 'sub' ? 'Sign In as Sub Account' : 'Sign In'}
              </Button>
              <Button
                type='submit'
                fullWidth
                size='lg'
                variant='plain'
                sx={{
                  width: '100%',
                  mb: 2,
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={handleForgotPassword}
              >
                Forgot password?
              </Button>
            </>
          )}
          <Divider> or </Divider>
          {import.meta.env.VITE_IS_SELF_HOSTED !== 'true' && (
            <>
              {!Capacitor.isNativePlatform() && (
                <Box sx={{ width: '100%' }}>
                  <LoginSocialGoogle
                    client_id={GOOGLE_CLIENT_ID}
                    redirect_uri={REDIRECT_URL}
                    scope='openid profile email'
                    discoveryDocs='claims_supported'
                    access_type='online'
                    isOnlyGetToken={true}
                    onResolve={({ provider, data }) => {
                      loggedWithProvider(provider, data)
                    }}
                    onReject={() => {
                      showError({
                        title: 'Google Login Failed',
                        message:
                          "Couldn't log in with Google, please try again",
                      })
                    }}
                  >
                    <Button
                      variant='soft'
                      color='neutral'
                      size='lg'
                      fullWidth
                      sx={{
                        width: '100%',
                        mt: 1,
                        mb: 1,
                        border: 'moccasin',
                        borderRadius: '8px',
                      }}
                    >
                      <div className='flex gap-2'>
                        <GoogleIcon />
                        Continue with Google
                      </div>
                    </Button>
                  </LoginSocialGoogle>

                  {/* <Button
                    fullWidth
                    variant='soft'
                    color='neutral'
                    size='lg'
                    sx={{
                      mt: 1,
                      mb: 1,
                      backgroundColor: 'black',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#333',
                      },
                    }}
                    onClick={() => {
                      SocialLogin.login({
                        provider: 'apple',
                        options: {
                          scopes: ['email', 'name'],
                        },
                      })
                        .then(user => {
                          console.log('Apple user', user)
                          loggedWithProvider('apple', user)
                        })
                        .catch(error => {
                          console.error('Apple login error:', error)
                          showError({
                            title: 'Apple Login Failed',
                            message:
                              "Couldn't log in with Apple, please try again",
                          })
                        })
                    }}
                  >
                    <div className='flex gap-2'>
                      <AppleIcon />
                      Continue with Apple
                    </div>
                  </Button> */}
                </Box>
              )}

              {Capacitor.isNativePlatform() && (
                <Box sx={{ width: '100%' }}>
                  <Button
                    fullWidth
                    variant='soft'
                    size='lg'
                    sx={{ mt: 3, mb: 2 }}
                    onClick={() => {
                      SocialLogin.login({
                        provider: 'google',
                        options: { scopes: ['profile', 'email', 'openid'] },
                      }).then(user => {
                        console.log('Google user', user)
                        loggedWithProvider('google', user.result)
                      })
                    }}
                  >
                    <div className='flex gap-2'>
                      <GoogleIcon />
                      Continue with Google
                    </div>
                  </Button>

                  {/* Apple Sign In Button for Native Platforms */}
                  {isAppleSignInSupported && (
                    <Button
                      fullWidth
                      variant='soft'
                      color='neutral'
                      size='lg'
                      sx={{
                        mb: 1,
                      }}
                      onClick={() => {
                        SocialLogin.login({
                          provider: 'apple',
                          options: {
                            scopes: ['email', 'name'],
                            state: 'random_string',
                          },
                        })
                          .then(user => {
                            console.log('Apple user', user)
                            loggedWithProvider('apple', user)
                          })
                          .catch(error => {
                            console.error('Apple login error:', error)
                            showError({
                              title: 'Apple Login Failed',
                              message:
                                "Couldn't log in with Apple, please try again",
                            })
                          })
                      }}
                    >
                      <div className='flex gap-2'>
                        <AppleIcon />
                        Continue with Apple
                      </div>
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}
          {resource?.identity_provider?.client_id && (
            <Button
              fullWidth
              color='neutral'
              variant='soft'
              size='lg'
              sx={{ mt: 3, mb: 2 }}
              onClick={handleAuthentikLogin}
            >
              Continue with {resource?.identity_provider?.name}
            </Button>
          )}

          <Button
            onClick={() => {
              Navigate('/signup')
            }}
            fullWidth
            variant='soft'
            size='lg'
            // sx={{ mt: 3, mb: 2 }}
          >
            Create new account
          </Button>

          <Box
            sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}
          >
            <Button
              variant='plain'
              size='sm'
              onClick={() => {
                window.open('https://donetick.com/privacy', '_blank')
              }}
            >
              Privacy Policy
            </Button>
            <Button
              variant='plain'
              size='sm'
              onClick={() => {
                window.open('https://donetick.com/terms', '_blank')
              }}
            >
              Terms of Use
            </Button>
          </Box>
        </Sheet>
      </Box>

      <MFAVerificationModal
        open={mfaModalOpen}
        onClose={handleMFAClose}
        sessionToken={mfaSessionToken}
        onSuccess={handleMFASuccess}
        onError={handleMFAError}
      />
    </Container>
  )
}

export default LoginView
