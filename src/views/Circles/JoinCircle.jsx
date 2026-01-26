import { Box, Container, Input, Sheet, Typography } from '@mui/joy'
import Logo from '../../Logo'

import { Button } from '@mui/joy'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAcknowledgmentModal from '../../hooks/useAcknowledgmentModal'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { JoinCircle } from '../../utils/Fetcher'
import AcknowledgmentModal from '../Modals/Inputs/AcknowledgmentModal'

const JoinCircleView = () => {
  const { data: userProfile } = useUserProfile()
  const { showError } = useNotification()
  const { ackModalConfig, showAcknowledgment } = useAcknowledgmentModal()
  const [isJoining, setIsJoining] = useState(false)

  let [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')

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
          {code && userProfile && (
            <>
              <Typography level='body-md' alignSelf={'center'}>
                Hi {userProfile?.displayName}, you have been invited to join the
                circle{' '}
              </Typography>
              <Input
                fullWidth
                placeholder='Enter code'
                value={code}
                disabled={!!code}
                size='lg'
                sx={{
                  width: '220px',
                  mb: 1,
                }}
              />
              <Typography level='body-md' alignSelf={'center'}>
                Joining will give you access to the circle's chores and members.
              </Typography>
              <Typography level='body-md' alignSelf={'center'}>
                You can leave the circle later from you Settings page.
              </Typography>
              <Button
                fullWidth
                size='lg'
                sx={{ mt: 3, mb: 2 }}
                disabled={isJoining}
                onClick={() => {
                  setIsJoining(true)
                  JoinCircle(code).then(resp => {
                    if (resp.ok) {
                      showAcknowledgment(
                        'Your join request has been sent successfully! The circle admin will need to approve your request before you can access the circle and its chores. You will receive a notification once your request is approved.',
                        'Join Request Sent!',
                        () => navigate('/'),
                        'Got it',
                        'success',
                      )
                    } else {
                      setIsJoining(false)
                      if (resp.status === 409) {
                        showError('You are already a member of this circle')
                      } else {
                        showError('Failed to join circle')
                      }
                      navigate('/')
                    }
                  })
                }}
              >
                {isJoining ? 'Joining...' : 'Join Circle'}
              </Button>
              <Button
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
                  navigate('/chores')
                }}
              >
                Cancel
              </Button>
            </>
          )}
          {!code ||
            (!userProfile && (
              <>
                <Typography level='body-md' alignSelf={'center'}>
                  You need to be logged in to join a circle
                </Typography>
                <Typography level='body-md' alignSelf={'center'} sx={{ mb: 9 }}>
                  Login or sign up to continue
                </Typography>
                <Button
                  fullWidth
                  size='lg'
                  sx={{ mt: 3, mb: 2 }}
                  onClick={() => {
                    navigate('/login')
                  }}
                >
                  Login
                </Button>
              </>
            ))}
        </Sheet>
      </Box>
      <AcknowledgmentModal config={ackModalConfig} />
    </Container>
  )
}

export default JoinCircleView
