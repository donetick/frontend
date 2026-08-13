import { Capacitor } from '@capacitor/core'
import { Box, Button, Typography } from '@mui/joy'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SubscriptionModal from '../../components/SubscriptionModal'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { CancelSubscription, UpdatePassword } from '../../utils/Fetcher'
import NativeCancelSubscriptionModal from '../Modals/Inputs/NativeCancelSubscriptionModal'
import PassowrdChangeModal from '../Modals/Inputs/PasswordChangeModal'
import UserDeletionModal from '../Modals/Inputs/UserDeletionModal'
import SettingsLayout from './SettingsLayout'

const AccountSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const { fmt } = useLocalization()

  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [subscriptionModal, setSubscriptionModal] = useState(false)
  const [userDeletionModal, setUserDeletionModal] = useState(false)
  const [nativeCancelModal, setNativeCancelModal] = useState(false)

  useEffect(() => {
    async function configurePurchases() {
      if (Capacitor.isNativePlatform() && userProfile) {
        await Purchases.configure({
          apiKey:
            Capacitor.getPlatform() === 'ios'
              ? import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_IOS
              : import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_ANDROID,
          appUserID: String(userProfile?.id),
        })
      }
    }
    configurePurchases()
  }, [userProfile])

  const getSubscriptionDetails = () => {
    if (userProfile?.subscription === 'active') {
      return t('accountSettings.activeDescription', {
        date: fmt.date(userProfile?.expiration),
      })
    } else if (userProfile?.subscription === 'cancelled') {
      return t('accountSettings.cancelledDescription', {
        date: fmt.date(userProfile?.expiration),
      })
    } else {
      return t('accountSettings.freeDescription')
    }
  }

  const getSubscriptionStatus = () => {
    if (userProfile?.subscription === 'active') {
      return t('accountSettings.plus')
    } else if (userProfile?.subscription === 'cancelled') {
      if (moment().isBefore(userProfile?.expiration)) {
        return t('accountSettings.plusUntil', {
          date: fmt.date(userProfile?.expiration),
        })
      }
      return t('accountSettings.free')
    } else {
      return t('accountSettings.free')
    }
  }

  if (!userProfile) {
    return (
      <SettingsLayout title={t('accountSettings.title')}>
        <div>{t('common.loading')}</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title={t('accountSettings.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('accountSettings.description')}
        </Typography>
        <Typography level='title-md' mb={-1}>
          {t('accountSettings.accountType', { type: getSubscriptionStatus() })}
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
                  const { RevenueCatUI } =
                    await import('@revenuecat/purchases-capacitor-ui')

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
                      message: t('accountSettings.purchase.success'),
                    })
                  }
                } catch (error) {
                  console.log('Purchase error:', error)

                  if (error.code === '1') {
                    return
                  } else if (error.code === '2') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.storeConnection'),
                    })
                  } else if (error.code === '3') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.notAllowed'),
                    })
                  } else if (error.code === '4') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.unavailable'),
                    })
                  } else if (error.code === '5') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.alreadyProcessed'),
                    })
                  } else if (error.code === '6') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.receiptMissing'),
                    })
                  } else if (error.code === '7') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.networkError'),
                    })
                  } else if (error.code === '8') {
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.invalidReceipt'),
                    })
                  } else if (error.code === '9') {
                    showNotification({
                      type: 'warning',
                      message: t('accountSettings.purchase.pending'),
                    })
                  } else {
                    console.error('Unexpected purchase error:', error)
                    console.error('Error occurred in purchase flow')
                    showNotification({
                      type: 'error',
                      message: t('accountSettings.purchase.failed', {
                        error:
                          error.message ||
                          t('accountSettings.purchase.unknownError'),
                      }),
                    })
                  }
                }
              } else {
                setSubscriptionModal(true)
              }
            }}
          >
            {t('accountSettings.upgrade')}
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
              {t('accountSettings.cancel')}
            </Button>
          )}
        </Box>
        {import.meta.env.VITE_IS_SELF_HOSTED === 'true' && (
          <Box>
            <Typography level='title-md' mb={1}>
              {t('accountSettings.password')}
            </Typography>
            <Typography mb={1} level='body-sm'></Typography>
            <Button
              variant='soft'
              onClick={() => {
                setChangePasswordModal(true)
              }}
            >
              {t('accountSettings.changePassword')}
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
                          message: t('accountSettings.passwordChanged'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('accountSettings.passwordChangeFailed'),
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
            {t('accountSettings.dangerZone')}
          </Typography>
          <Typography level='body-sm' mb={2} color='neutral'>
            {t('accountSettings.dangerZoneDescription')}
          </Typography>
          <Button
            variant='outlined'
            color='danger'
            onClick={() => setUserDeletionModal(true)}
          >
            {t('accountSettings.deleteAccount')}
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
              message: t('accountSettings.accountDeleted'),
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
                  message: t('accountSettings.subscriptionCancelled'),
                })
                window.location.reload()
              } else {
                showNotification({
                  type: 'error',
                  message: t('accountSettings.subscriptionCancelFailed'),
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
