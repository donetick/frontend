import { Capacitor } from '@capacitor/core'
import { Box, Button, Container, Divider, Typography } from '@mui/joy'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useEffect, useState } from 'react'
import SubscriptionModal from '../../components/SubscriptionModal'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { CancelSubscription, UpdatePassword } from '../../utils/Fetcher'
import NativeCancelSubscriptionModal from '../Modals/Inputs/NativeCancelSubscriptionModal'
import PassowrdChangeModal from '../Modals/Inputs/PasswordChangeModal'
import UserDeletionModal from '../Modals/Inputs/UserDeletionModal'
import SettingsLayout from './SettingsLayout'

const AccountSettings = () => {
  const { data: userProfile } = useUserProfile()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [subscriptionModal, setSubscriptionModal] = useState(false)
  const [userDeletionModal, setUserDeletionModal] = useState(false)
  const [nativeCancelModal, setNativeCancelModal] = useState(false)

  useEffect(() => {
    async function configurePurchases() {
      if (Capacitor.isNativePlatform() && userProfile) {
        await Purchases.configure({
          apiKey: import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY,
          appUserID: String(userProfile?.id),
        })
      }
    }
    configurePurchases()
  }, [userProfile])

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

  if (!userProfile) {
    return (
      <SettingsLayout title="Account Settings">
        <div>Loading...</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title="Account Settings">
      <div className='grid gap-4'>
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

                  const offering = await Purchases.getOfferings()
                  await RevenueCatUI.presentPaywall({
                    offering: offering.current,
                  })

                  const { customerInfo } = await Purchases.getCustomerInfo()
                  if (customerInfo.entitlements.active['Donetick Plus']) {
                    queryClient.invalidateQueries(['userProfile'])
                    queryClient.refetchQueries(['userProfile'])
                    showNotification({
                      type: 'success',
                      message:
                        'Purchase successful! Please restart the app to access Plus features.',
                    })
                  }
                } catch (error) {
                  console.log('Purchase error:', error)

                  if (error.code === '1') {
                    return
                  } else if (error.code === '2') {
                    showNotification({
                      type: 'error',
                      message:
                        'Store connection issue. Please check your network and try again.',
                    })
                  } else if (error.code === '3') {
                    showNotification({
                      type: 'error',
                      message:
                        'Purchases are not allowed on this device. Please check your device restrictions.',
                    })
                  } else if (error.code === '4') {
                    showNotification({
                      type: 'error',
                      message:
                        'This subscription is not available. Please try again later.',
                    })
                  } else if (error.code === '5') {
                    showNotification({
                      type: 'error',
                      message:
                        'This purchase has already been processed. If you believe this is an error, please contact support.',
                    })
                  } else if (error.code === '6') {
                    showNotification({
                      type: 'error',
                      message:
                        'Purchase receipt missing. Please try purchasing again.',
                    })
                  } else if (error.code === '7') {
                    showNotification({
                      type: 'error',
                      message:
                        'Network error. Please check your connection and try again.',
                    })
                  } else if (error.code === '8') {
                    showNotification({
                      type: 'error',
                      message:
                        'Invalid purchase receipt. Please contact support if this persists.',
                    })
                  } else if (error.code === '9') {
                    showNotification({
                      type: 'warning',
                      message:
                        'Payment is pending approval. You will receive access once approved.',
                    })
                  } else {
                    console.error('Unexpected purchase error:', error)
                    console.error('Error occurred in purchase flow')
                    showNotification({
                      type: 'error',
                      message: `Purchase failed: ${error.message || 'Unknown error'}. Please try again or contact support.`,
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
                setNativeCancelModal(true)
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

      <NativeCancelSubscriptionModal
        isOpen={nativeCancelModal}
        onClose={action => {
          setNativeCancelModal(false)
          if (action === 'desktop') {
            CancelSubscription().then(resp => {
              if (resp.ok) {
                showNotification({
                  type: 'success',
                  message: 'Subscription cancelled',
                })
                window.location.reload()
              } else {
                showNotification({
                  type: 'error',
                  message: 'Failed to cancel subscription',
                })
              }
            })
          }
        }}
      />
    </SettingsLayout>
  )
}

export default AccountSettings