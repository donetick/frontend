import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  Input,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useContext, useEffect, useState } from 'react'
import { UserContext } from '../../contexts/UserContext'
import Logo from '../../Logo'
import {
  AcceptCircleMemberRequest,
  CancelSubscription,
  DeleteCircleMember,
  GetAllCircleMembers,
  GetCircleMemberRequests,
  GetSubscriptionSession,
  GetUserCircle,
  GetUserProfile,
  JoinCircle,
  LeaveCircle,
  PutWebhookURL,
  UpdatePassword,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import PassowrdChangeModal from '../Modals/Inputs/PasswordChangeModal'
import APITokenSettings from './APITokenSettings'
import NotificationSetting from './NotificationSetting'
import ProfileSettings from './ProfileSettings'
import StorageSettings from './StorageSettings'
import ThemeToggle from './ThemeToggle'

const Settings = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [userCircles, setUserCircles] = useState([])
  const [circleMemberRequests, setCircleMemberRequests] = useState([])
  const [circleInviteCode, setCircleInviteCode] = useState('')
  const [circleMembers, setCircleMembers] = useState([])
  const [webhookURL, setWebhookURL] = useState(null)
  const [webhookError, setWebhookError] = useState(null)

  const [changePasswordModal, setChangePasswordModal] = useState(false)
  useEffect(() => {
    GetUserProfile().then(resp => {
      resp.json().then(data => {
        setUserProfile(data.res)
      })
    })
    GetUserCircle().then(resp => {
      resp.json().then(data => {
        setUserCircles(data.res ? data.res : [])
        setWebhookURL(data.res ? data.res[0].webhook_url : null)
      })
    })
    GetCircleMemberRequests().then(resp => {
      resp.json().then(data => {
        setCircleMemberRequests(data.res ? data.res : [])
      })
    })
    GetAllCircleMembers().then(data => {
      setCircleMembers(data.res ? data.res : [])
    })
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const sharingSection = document.getElementById(
        window.location.hash.slice(1),
      )
      if (sharingSection) {
        sharingSection.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  const getSubscriptionDetails = () => {
    if (userProfile?.subscription === 'active') {
      return `You are currently subscribed to the Plus plan. Your subscription will renew on ${moment(
        userProfile?.expiration,
      ).format('MMM DD, YYYY')}.`
    } else if (userProfile?.subscription === 'canceled') {
      return `You have cancelled your subscription. Your account will be downgraded to the Free plan on ${moment(
        userProfile?.expiration,
      ).format('MMM DD, YYYY')}.`
    } else {
      return `You are currently on the Free plan. Upgrade to the Plus plan to unlock more features.`
    }
  }
  const getSubscriptionStatus = () => {
    if (userProfile?.subscription === 'active') {
      return `Plus`
    } else if (userProfile?.subscription === 'canceled') {
      if (moment().isBefore(userProfile?.expiration)) {
        return `Plus(until ${moment(userProfile?.expiration).format(
          'MMM DD, YYYY',
        )})`
      }
      return `Free`
    } else {
      return `Free`
    }
  }

  if (userProfile === null) {
    return (
      <Container className='flex h-full items-center justify-center'>
        <Box className='flex flex-col items-center justify-center'>
          <CircularProgress
            color='success'
            sx={{ '--CircularProgress-size': '200px' }}
          >
            <Logo />
          </CircularProgress>
        </Box>
      </Container>
    )
  }
  return (
    <Container>
      <ProfileSettings />
      <div className='grid gap-4 py-4' id='sharing'>
        <Typography level='h3'>Circle settings</Typography>
        <Divider />
        <Typography level='body-md'>
          Your account is automatically connected to a Circle when you create or
          join one. Easily invite friends by sharing the unique Circle code or
          link below. You'll receive a notification below when someone requests
          to join your Circle.
        </Typography>
        <Typography level='title-sm' mb={-1}>
          {userCircles[0]?.userRole === 'member'
            ? `You part of ${userCircles[0]?.name} `
            : `You circle code is:`}

          <Input
            value={userCircles[0]?.invite_code}
            disabled
            size='lg'
            sx={{
              width: '220px',
              mb: 1,
            }}
          />
          <Button
            variant='soft'
            onClick={() => {
              navigator.clipboard.writeText(userCircles[0]?.invite_code)
              alert('Code Copied to clipboard')
            }}
          >
            Copy Code
          </Button>
          <Button
            variant='soft'
            sx={{ ml: 1 }}
            onClick={() => {
              navigator.clipboard.writeText(
                window.location.protocol +
                  '//' +
                  window.location.host +
                  `/circle/join?code=${userCircles[0]?.invite_code}`,
              )
              alert('Link Copied to clipboard')
            }}
          >
            Copy Link
          </Button>
          {userCircles.length > 0 && userCircles[0]?.userRole === 'member' && (
            <Button
              sx={{ ml: 1 }}
              onClick={() => {
                const confirmed = confirm(
                  `Are you sure you want to leave your circle?`,
                )
                if (confirmed) {
                  LeaveCircle(userCircles[0]?.id).then(resp => {
                    if (resp.ok) {
                      alert('Left circle successfully.')
                    } else {
                      alert('Failed to leave circle.')
                    }
                  })
                }
              }}
            >
              Leave Circle
            </Button>
          )}
        </Typography>

        <Typography level='title-md'>Circle Members</Typography>
        {circleMembers.map(member => (
          <Card key={member.id} className='p-4'>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography level='body-md'>
                  {member.displayName.charAt(0).toUpperCase() +
                    member.displayName.slice(1)}
                  {member.userId === userProfile.id ? '(You)' : ''}{' '}
                  <Chip>
                    {' '}
                    {member.isActive ? member.role : 'Pending Approval'}
                  </Chip>
                </Typography>
                {member.isActive ? (
                  <Typography level='body-sm'>
                    Joined on {moment(member.createdAt).format('MMM DD, YYYY')}
                  </Typography>
                ) : (
                  <Typography level='body-sm' color='danger'>
                    Request to join{' '}
                    {moment(member.updatedAt).format('MMM DD, YYYY')}
                  </Typography>
                )}
              </Box>
              {member.userId !== userProfile.id && member.isActive && (
                <Button
                  disabled={
                    circleMembers.find(m => userProfile.id == m.userId).role !==
                    'admin'
                  }
                  variant='outlined'
                  color='danger'
                  size='sm'
                  onClick={() => {
                    const confirmed = confirm(
                      `Are you sure you want to remove ${member.displayName} from your circle?`,
                    )
                    if (confirmed) {
                      DeleteCircleMember(member.circleId, member.userId).then(
                        resp => {
                          if (resp.ok) {
                            alert('Removed member successfully.')
                          }
                        },
                      )
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </Box>
          </Card>
        ))}

        {circleMemberRequests.length > 0 && (
          <Typography level='title-md'>Circle Member Requests</Typography>
        )}
        {circleMemberRequests.map(request => (
          <Card key={request.id} className='p-4'>
            <Typography level='body-md'>
              {request.displayName} wants to join your circle.
            </Typography>
            <Button
              variant='soft'
              color='success'
              onClick={() => {
                const confirmed = confirm(
                  `Are you sure you want to accept ${request.displayName}(username:${request.username}) to join your circle?`,
                )
                if (confirmed) {
                  AcceptCircleMemberRequest(request.id).then(resp => {
                    if (resp.ok) {
                      alert('Accepted request successfully.')
                      // reload the page
                      window.location.reload()
                    }
                  })
                }
              }}
            >
              Accept
            </Button>
          </Card>
        ))}
        <Divider> or </Divider>

        <Typography level='body-md'>
          if want to join someone else's Circle? Ask them for their unique
          Circle code or join link. Enter the code below to join their Circle.
        </Typography>

        <Typography level='title-sm' mb={-1}>
          Enter Circle code:
          <Input
            placeholder='Enter code'
            value={circleInviteCode}
            onChange={e => setCircleInviteCode(e.target.value)}
            size='lg'
            sx={{
              width: '220px',
              mb: 1,
            }}
          />
          <Button
            variant='soft'
            onClick={() => {
              const confirmed = confirm(
                `Are you sure you want to leave you circle and join '${circleInviteCode}'?`,
              )
              if (confirmed) {
                JoinCircle(circleInviteCode).then(resp => {
                  if (resp.ok) {
                    alert(
                      'Joined circle successfully, wait for the circle owner to accept your request.',
                    )
                  }
                })
              }
            }}
          >
            Join Circle
          </Button>
        </Typography>
        {circleMembers.find(m => userProfile.id == m.userId)?.role ===
          'admin' && (
          <>
            <Typography level='title-lg' mt={2}>
              Webhook
            </Typography>
            <Typography level='body-md' mt={-1}>
              Webhooks allow you to send real-time notifications to other
              services when events happen in your Circle. Use the webhook URL
              below to
            </Typography>
            <FormControl sx={{ mt: 1 }}>
              <Checkbox
                checked={webhookURL !== null}
                onClick={() => {
                  if (webhookURL === null) {
                    setWebhookURL('')
                  } else {
                    setWebhookURL(null)
                  }
                }}
                variant='soft'
                label='Enable Webhook'
                disabled={!isPlusAccount(userProfile)}
                overlay
              />
              <FormHelperText
                sx={{
                  opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
                }}
              >
                Enable webhook notifications for tasks and things updates.{' '}
                {userProfile && !isPlusAccount(userProfile) && (
                  <Chip variant='soft' color='warning'>
                    Not available in Basic Plan
                  </Chip>
                )}
              </FormHelperText>
            </FormControl>

            {webhookURL !== null && (
              <Box>
                <Typography level='title-sm'>Webhook URL</Typography>
                <Input
                  value={webhookURL ? webhookURL : ''}
                  onChange={e => setWebhookURL(e.target.value)}
                  size='lg'
                  sx={{
                    width: '220px',
                    mb: 1,
                  }}
                />
                {webhookError && (
                  <Typography level='body-sm' color='danger'>
                    {webhookError}
                  </Typography>
                )}
                <Button
                  variant='soft'
                  sx={{ width: '110px', mt: 1 }}
                  onClick={() => {
                    PutWebhookURL(webhookURL).then(resp => {
                      if (resp.ok) {
                        alert('Webhook URL updated successfully.')
                      } else {
                        alert('Failed to update webhook URL.')
                      }
                    })
                  }}
                  disabled={!isPlusAccount(userProfile)}
                >
                  Save
                </Button>
              </Box>
            )}
          </>
        )}
      </div>

      <div className='grid gap-4 py-4' id='account'>
        <Typography level='h3'>Account Settings</Typography>
        <Divider />
        <Typography level='body-md'>
          Change your account settings, type or update your password
        </Typography>
        <Typography level='title-md' mb={-1}>
          Account Type : {getSubscriptionStatus()}
        </Typography>
        <Typography level='body-sm'>{getSubscriptionDetails()}</Typography>
        <Box>
          <Button
            sx={{
              width: '110px',
              mb: 1,
            }}
            disabled={
              userProfile?.subscription === 'active' ||
              moment(userProfile?.expiration).isAfter(moment())
            }
            onClick={() => {
              GetSubscriptionSession().then(data => {
                data.json().then(data => {
                  console.log(data)
                  window.location.href = data.sessionURL
                  // open in new window:
                  // window.open(data.sessionURL, '_blank')
                })
              })
            }}
          >
            Upgrade
          </Button>

          {userProfile?.subscription === 'active' && (
            <Button
              sx={{
                width: '110px',
                mb: 1,
                ml: 1,
              }}
              variant='outlined'
              onClick={() => {
                CancelSubscription().then(resp => {
                  if (resp.ok) {
                    alert('Subscription cancelled.')
                    window.location.reload()
                  }
                })
              }}
            >
              Cancel
            </Button>
          )}
        </Box>
        {import.meta.env.VITE_IS_SELF_HOSTED === 'true' && (
          <Box>
            <Typography level='title-md' mb={1}>
              Password :
            </Typography>
            <Typography mb={1} level='body-sm'></Typography>
            <Button
              variant='soft'
              onClick={() => {
                setChangePasswordModal(true)
              }}
            >
              Change Password
            </Button>
            {changePasswordModal ? (
              <PassowrdChangeModal
                isOpen={changePasswordModal}
                onClose={password => {
                  if (password) {
                    UpdatePassword(password).then(resp => {
                      if (resp.ok) {
                        alert('Password changed successfully')
                      } else {
                        alert('Password change failed')
                      }
                    })
                  }
                  setChangePasswordModal(false)
                }}
              />
            ) : null}
          </Box>
        )}
      </div>
      <NotificationSetting />
      <APITokenSettings />
      <StorageSettings />
      <div className='grid gap-4 py-4'>
        <Typography level='h3'>Theme preferences</Typography>
        <Divider />
        <Typography level='body-md'>
          Choose how the site looks to you. Select a single theme, or sync with
          your system and automatically switch between day and night themes.
        </Typography>
        <ThemeToggle />
      </div>
    </Container>
  )
}

export default Settings
