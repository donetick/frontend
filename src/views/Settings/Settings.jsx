import { Capacitor } from '@capacitor/core'
import { Refresh } from '@mui/icons-material'
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
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { Purchases } from '@revenuecat/purchases-capacitor'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RealTimeSettings from '../../components/RealTimeSettings'
import SubscriptionModal from '../../components/SubscriptionModal'
import Logo from '../../Logo'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  AcceptCircleMemberRequest,
  CancelSubscription,
  DeleteCircleMember,
  GetAllCircleMembers,
  GetCircleMemberRequests,
  GetUserCircle,
  JoinCircle,
  LeaveCircle,
  PutWebhookURL,
  UpdateMemberRole,
  UpdatePassword,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import PassowrdChangeModal from '../Modals/Inputs/PasswordChangeModal'
import UserDeletionModal from '../Modals/Inputs/UserDeletionModal'
import APITokenSettings from './APITokenSettings'
import MFASettings from './MFASettings'
import NotificationSetting from './NotificationSetting'
import ProfileSettings from './ProfileSettings'
import SidepanelSettings from './SidepanelSettings'
import StorageSettings from './StorageSettings'
import ThemeToggle from './ThemeToggle'

const Settings = () => {
  const { data: userProfile } = useUserProfile()
  const { showNotification } = useNotification()
  const navigate = useNavigate()

  const [userCircles, setUserCircles] = useState([])
  const [circleMemberRequests, setCircleMemberRequests] = useState([])
  const [circleInviteCode, setCircleInviteCode] = useState('')
  const [circleMembers, setCircleMembers] = useState([])
  const [webhookURL, setWebhookURL] = useState(null)
  const [webhookError, setWebhookError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [subscriptionModal, setSubscriptionModal] = useState(false)
  const [userDeletionModal, setUserDeletionModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    color = 'primary',
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      message,
      title,
      confirmText,
      cancelText,
      color,
      onClose: isConfirmed => {
        if (isConfirmed) {
          onConfirm()
        }
        setConfirmModalConfig({})
      },
    })
  }
  const refreshMemberRequests = async () => {
    setIsRefreshing(true)
    try {
      const resp = await GetCircleMemberRequests()
      const data = await resp.json()
      setCircleMemberRequests(data.res ? data.res : [])
      setLastRefresh(new Date())
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to refresh member requests',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    GetUserCircle().then(resp => {
      resp.json().then(data => {
        setUserCircles(data.res ? data.res : [])
        setWebhookURL(data.res ? data.res[0].webhook_url : null)
      })
    })
    GetCircleMemberRequests().then(resp => {
      resp.json().then(data => {
        setCircleMemberRequests(data.res ? data.res : [])
        setLastRefresh(new Date())
      })
    })
    GetAllCircleMembers().then(data => {
      setCircleMembers(data.res ? data.res : [])
    })
  }, [])

  // useEffect when circleMembers and userprofile:
  useEffect(() => {
    if (userProfile && userProfile.id) {
      const isUserAdmin = circleMembers.some(
        member => member.userId === userProfile.id && member.role === 'admin',
      )
      setIsAdmin(isUserAdmin)
    }
  }, [circleMembers, userProfile])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash) {
        // Small delay to ensure the component is fully rendered before scrolling
        setTimeout(() => {
          const section = document.getElementById(hash.slice(1))
          if (section) {
            // Get the element position and scroll with some offset for the title
            const elementPosition = section.offsetTop
            const offsetPosition = elementPosition - 20 // 20px padding above the title

            window.scrollTo({
              top: offsetPosition,
              behavior: 'instant', // Use 'smooth' for smooth scrolling
            })
          }
        }, 500)
      }
    }

    // Handle initial hash on mount
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const getSubscriptionDetails = () => {
    if (userProfile?.subscription === 'active') {
      return `You are currently subscribed to the Plus plan. Your subscription will renew on ${moment(
        userProfile?.expiration,
      ).format('MMM DD, YYYY')}.`
    } else if (userProfile?.subscription === 'cancelled') {
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
    } else if (userProfile?.subscription === 'cancelled') {
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
  if (!userProfile) {
    return <LoadingComponent />
  }

  return (
    <Container>
      <ProfileSettings />
      <div className='grid gap-4 py-4' id='circle'>
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
              showNotification({
                type: 'success',
                message: 'Code copied to clipboard',
              })
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
              showNotification({
                type: 'success',
                message: 'Link copied to clipboard',
              })
            }}
          >
            Copy Link
          </Button>
          {userCircles.length > 0 && userCircles[0]?.userRole === 'member' && (
            <Button
              color='danger'
              variant='outlined'
              sx={{ ml: 1 }}
              onClick={() => {
                showConfirmation(
                  'Are you sure you want to leave your circle?',
                  'Leave Circle',
                  () => {
                    LeaveCircle(userCircles[0]?.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: 'Left circle successfully',
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: 'Failed to leave circle',
                        })
                      }
                    })
                  },
                  'Leave',
                  'Cancel',
                  'danger',
                )
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

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {member.userId !== userProfile.id && isAdmin && (
                  <Select
                    size='sm'
                    sx={{ mr: 1 }}
                    value={member.role}
                    renderValue={() => (
                      <Typography>
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </Typography>
                    )}
                    onChange={(e, value) => {
                      UpdateMemberRole(member.userId, value).then(resp => {
                        if (resp.ok) {
                          const newCircleMembers = circleMembers.map(m => {
                            if (m.userId === member.userId) {
                              m.role = value
                            }
                            return m
                          })
                          setCircleMembers(newCircleMembers)
                        } else {
                          showNotification({
                            type: 'error',
                            message: 'Failed to update role',
                          })
                        }
                      })
                    }}
                  >
                    {[
                      {
                        value: 'member',
                        description: 'Just a regular member of the circle',
                      },
                      {
                        value: 'manager',
                        description:
                          'Can impersonate users and perform actions on their behalf',
                      },
                      {
                        value: 'admin',
                        description: 'Full access to the circle',
                      },
                    ].map((option, index) => (
                      <Option value={option.value} key={index}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'start',
                            alignItems: 'start',
                            width: '100%',
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            level='title-sm'
                            sx={{ mb: 0, mt: 0, lineHeight: 1.1 }}
                          >
                            {option.value.charAt(0).toUpperCase() +
                              option.value.slice(1)}
                          </Typography>
                          <Typography
                            level='body-sm'
                            sx={{ mt: 0, mb: 0, lineHeight: 1.1 }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </Option>
                    ))}
                  </Select>
                )}
                {userProfile.role === 'admin' &&
                  member.userId !== userProfile.id &&
                  member.isActive && (
                    <Button
                      disabled={
                        circleMembers.find(m => userProfile.id == m.userId)
                          .role !== 'admin'
                      }
                      variant='outlined'
                      color='danger'
                      size='sm'
                      onClick={() => {
                        showConfirmation(
                          `Are you sure you want to remove ${member.displayName} from your circle?`,
                          'Remove Member',
                          () => {
                            DeleteCircleMember(
                              member.circleId,
                              member.userId,
                            ).then(resp => {
                              if (resp.ok) {
                                showNotification({
                                  type: 'success',
                                  message: 'Removed member successfully',
                                })
                              }
                            })
                          },
                          'Remove',
                          'Cancel',
                          'danger',
                        )
                      }}
                    >
                      Remove
                    </Button>
                  )}
              </Box>
            </Box>
          </Card>
        ))}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography level='title-md'>Circle Member Requests</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastRefresh && (
              <Typography level='body-sm' color='neutral'>
                Last updated: {moment(lastRefresh).format('MMM DD, HH:mm')}
              </Typography>
            )}
            <Button
              size='sm'
              variant='soft'
              onClick={refreshMemberRequests}
              disabled={isRefreshing}
              startDecorator={
                isRefreshing ? <CircularProgress size='sm' /> : <Refresh />
              }
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Box>

        {circleMemberRequests.map(request => (
          <Card key={request.id} className='p-4'>
            <Typography level='body-md'>
              {request.displayName} wants to join your circle.
            </Typography>
            <Button
              variant='soft'
              color='success'
              onClick={() => {
                showConfirmation(
                  `Are you sure you want to accept ${request.displayName} (username: ${request.username}) to join your circle?`,
                  'Accept Member Request',
                  () => {
                    AcceptCircleMemberRequest(request.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: 'Accepted request successfully',
                        })
                        // reload the page
                        window.location.reload()
                      }
                    })
                  },
                  'Accept',
                  'Cancel',
                )
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
              showConfirmation(
                `Are you sure you want to leave your circle and join '${circleInviteCode}'?`,
                'Join Circle',
                () => {
                  JoinCircle(circleInviteCode).then(resp => {
                    if (resp.ok) {
                      showNotification({
                        type: 'success',
                        message:
                          'Joined circle successfully, wait for the circle owner to accept your request.',
                      })
                    }
                  })
                },
                'Join',
                'Cancel',
              )
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
              services when events happen in your Circle. Configure a webhook
              URL to receive real-time updates.
            </Typography>
            {!isPlusAccount(userProfile) && (
              <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
                Webhook notifications are not available in the Basic plan.
                Upgrade to Plus to receive real-time updates via webhooks.
              </Typography>
            )}
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
                    Plus Feature
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
                        showNotification({
                          type: 'success',
                          message: 'Webhook URL updated successfully',
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: 'Failed to update webhook URL',
                        })
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

        {/* WebSocket Settings */}
        {/* <WebSocketSettings /> */}
        <RealTimeSettings />
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
              (moment(userProfile?.expiration).isAfter(moment()) &&
                userProfile?.subscription !== 'cancelled')
            }
            onClick={async () => {
              if (Capacitor.isNativePlatform()) {
                try {
                  const { RevenueCatUI } = await import(
                    '@revenuecat/purchases-capacitor-ui'
                  )
                  await Purchases.configure({
                    apiKey: import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY,
                    appUserID: String(userProfile?.id),
                  })
                  const offering = await Purchases.getOfferings()
                  await RevenueCatUI.presentPaywall({
                    offering: offering.current,
                  })

                  // Check if user now has entitlement after paywall interaction
                  const customerInfo = await Purchases.getCustomerInfo()
                  if (customerInfo.entitlements.active['plus']) {
                    showNotification({
                      type: 'success',
                      message:
                        'Purchase successful! Please restart the app to access Plus features.',
                    })
                  }
                } catch (error) {
                  if (error.code !== '1') {
                    // User cancelled
                    showNotification({
                      type: 'error',
                      message: 'Purchase failed. Please try again.',
                    })
                  }
                }
              } else {
                setSubscriptionModal(true)
              }
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
              color='danger'
              onClick={() => {
                CancelSubscription().then(resp => {
                  if (resp.ok) {
                    showNotification({
                      type: 'success',
                      message: 'Subscription cancelled',
                    })
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
                        showNotification({
                          type: 'success',
                          message: 'Password changed successfully',
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: 'Password change failed',
                        })
                      }
                    })
                  }
                  setChangePasswordModal(false)
                }}
              />
            ) : null}
          </Box>
        )}

        <Box>
          <Typography level='title-md' mb={1} color='danger'>
            Danger Zone
          </Typography>
          <Typography level='body-sm' mb={2} color='neutral'>
            Once you delete your account, there is no going back. Please be
            certain.
          </Typography>
          <Button
            variant='outlined'
            color='danger'
            onClick={() => setUserDeletionModal(true)}
          >
            Delete Account
          </Button>
        </Box>
      </div>
      <NotificationSetting />
      <MFASettings />
      <APITokenSettings />
      <StorageSettings />
      <div className='grid gap-4 py-4' id='sidepanel'>
        <Typography level='h3'>Sidepanel Customization</Typography>
        <Divider />
        <Typography level='body-md'>
          Customize the layout and visibility of cards in the sidepanel. the
          section only available on large screen devices such as tablets and
          desktops..
        </Typography>
        <SidepanelSettings />
      </div>

      <div className='grid gap-4 py-4' id='theme'>
        <Typography level='h3'>Theme preferences</Typography>
        <Divider />
        <Typography level='body-md'>
          Choose how the site looks to you. Select a single theme, or sync with
          your system and automatically switch between day and night themes.
        </Typography>
        <ThemeToggle />
      </div>

      {/* Modals */}
      {confirmModalConfig?.isOpen && (
        <ConfirmationModal config={confirmModalConfig} />
      )}

      <SubscriptionModal
        open={subscriptionModal}
        onClose={() => setSubscriptionModal(false)}
      />

      <UserDeletionModal
        isOpen={userDeletionModal}
        onClose={success => {
          setUserDeletionModal(false)
          if (success) {
            showNotification({
              type: 'success',
              message: 'Account deleted successfully',
            })
          }
        }}
        userProfile={userProfile}
      />
    </Container>
  )
}

export default Settings
