import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { Settings } from '@mui/icons-material'
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
  Snackbar,
  Typography,
} from '@mui/joy'
import Cookies from 'js-cookie'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginSocialGoogle } from 'reactjs-social-login'
import { GOOGLE_CLIENT_ID, REDIRECT_URL } from '../../Config'
import { UserContext } from '../../contexts/UserContext'
import Logo from '../../Logo'
import { GetUserProfile, login } from '../../utils/Fetcher'
import { apiManager } from '../../utils/TokenManager'

const LoginView = () => {
  const { userProfile, setUserProfile } = React.useContext(UserContext)
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState(null)
  const Navigate = useNavigate()
  const handleSubmit = async e => {
    e.preventDefault()
    login(username, password)
      .then(response => {
        if (response.status === 200) {
          return response.json().then(data => {
            localStorage.setItem('ca_token', data.token)
            localStorage.setItem('ca_expiration', data.expire)
            const redirectUrl = Cookies.get('ca_redirect')
            // console.log('redirectUrl', redirectUrl)
            if (redirectUrl) {
              Cookies.remove('ca_redirect')
              Navigate(redirectUrl)
            } else {
              Navigate('/my/chores')
            }
          })
        } else if (response.status === 401) {
          setError('Wrong username or password')
        } else {
          setError('An error occurred, please try again')
          console.log('Login failed')
        }
      })
      .catch(err => {
        setError('Unable to communicate with server, please try again')
        console.log('Login failed', err)
      })
  }

  const loggedWithProvider = function (provider, data) {
    const baseURL = apiManager.getApiURL()
    return fetch(`${baseURL}/auth/${provider}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: provider,
        token:
          data['access_token'] || // data["access_token"] is for Google
          data['accessToken'], // data["accessToken"] is for Google Capacitor
        data: data,
      }),
    }).then(response => {
      if (response.status === 200) {
        return response.json().then(data => {
          localStorage.setItem('ca_token', data.token)
          localStorage.setItem('ca_expiration', data.expire)

          const redirectUrl = Cookies.get('ca_redirect')
          if (redirectUrl) {
            Cookies.remove('ca_redirect')
            Navigate(redirectUrl)
          } else {
            getUserProfileAndNavigateToHome()
          }
        })
      }
      return response.json().then(error => {
        setError("Couldn't log in with Google, please try again")
      })
    })
  }
  const getUserProfileAndNavigateToHome = () => {
    GetUserProfile().then(data => {
      data.json().then(data => {
        setUserProfile(data.res)
        // check if redirect url is set in cookie:
        const redirectUrl = Cookies.get('ca_redirect')
        if (redirectUrl) {
          Cookies.remove('ca_redirect')
          Navigate(redirectUrl)
        } else {
          Navigate('/my/chores')
        }
      })
    })
  }
  const handleForgotPassword = () => {
    Navigate('/forgot-password')
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
          <IconButton
            //  on top right of the screen:
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              color: 'black',
            }}
            onClick={() => {
              Navigate('/login/settings')
            }}
          >
            {' '}
            <Settings />
          </IconButton>
          {/* <img
            src='/src/assets/logo.svg'
            alt='logo'
            width='128px'
            height='128px'
          /> */}
          <Logo />

          <Typography level='h2'>
            Done
            <span
              style={{
                color: '#06b6d4',
              }}
            >
              tick
            </span>
          </Typography>

          {userProfile && (
            <>
              <Avatar
                src={userProfile?.image}
                alt={userProfile?.username}
                size='lg'
                sx={{
                  mt: 2,
                  width: '96px',
                  height: '96px',
                  mb: 1,
                }}
              />
              <Typography level='body-md' alignSelf={'center'}>
                Welcome back,{' '}
                {userProfile?.displayName || userProfile?.username}
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
                q
                variant='plain'
                sx={{
                  width: '100%',
                  mb: 2,
                  border: 'moccasin',
                  borderRadius: '8px',
                }}
                onClick={() => {
                  setUserProfile(null)
                  localStorage.removeItem('ca_token')
                  localStorage.removeItem('ca_expiration')
                  // go to login page:
                  window.location.href = '/login'
                }}
              >
                Logout
              </Button>
            </>
          )}
          {!userProfile && (
            <>
              <Typography level='body2'>
                Sign in to your account to continue
              </Typography>
              <Typography level='body2' alignSelf={'start'} mt={4}>
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
              <Typography level='body2' alignSelf={'start'}>
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
                Sign In
              </Button>
              <Button
                type='submit'
                fullWidth
                size='lg'
                q
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
                onReject={err => {
                  setError("Couldn't log in with Google, please try again")
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
                  GoogleAuth.initialize({
                    clientId: import.meta.env.VITE_APP_GOOGLE_CLIENT_ID,
                    scopes: ['profile', 'email', 'openid'],
                    grantOfflineAccess: true,
                  })
                  GoogleAuth.signIn().then(user => {
                    console.log('Google user', user)

                    loggedWithProvider('google', user.authentication)
                  })
                }}
              >
                <div className='flex gap-2'>
                  <GoogleIcon />
                  Continue with Google
                </div>
              </Button>
            </Box>
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
        </Sheet>
      </Box>
      <Snackbar
        open={error !== null}
        onClose={() => setError(null)}
        autoHideDuration={3000}
        message={error}
      >
        {error}
      </Snackbar>
    </Container>
  )
}

export default LoginView
