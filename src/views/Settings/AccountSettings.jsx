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
  const { t } = useTranslation(['settings', 'common'])
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
      return t('settings:account.activePlan', {
        date: fmt.date(userProfile?.expiration),
      })
    } else if (userProfile?.subscription === 'cancelled') {
      return t('settings:account.cancelledPlan', {
        date: fmt.date(userProfile?.expiration),
      })
    } else {
      return t('settings:account.freePlan')
    }
  }

  const getSubscriptionStatus = () => {
    if (userProfile?.subscription === 'active') {
      return t('settings:account.plus')
    } else if (userProfile?.subscription === 'cancelled') {
      if (moment().isBefore(userProfile?.expiration)) {
        return `${t('settings:account.plus')} (${fmt.date(userProfile?.expiration)})`
      }
      return t('settings:account.free')
    } else {
      return t('settings:account.free')
    }
  }

  if (!userProfile) {
    return (
      <SettingsLayout title={t('settings:pages.account.title')}>
        <div>{t('common:status.loading')}</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title={t('settings:pages.account.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>{t('settings:account.description')}</Typography>
        <Typography level='title-md' mb={-1}>
          {t('settings:account.accountType')} : {getSubscriptionStatus()}
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
                      message: t('settings:account.purchaseSuccess'),
                    })
                  }
                } catch (error) {
                  console.log('Purchase error:', error)

                  if (error.code === '1') {
                    return
                  } else if (error.code === '2') {
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseNetwork'),
                    })
                  } else if (error.code === '3') {
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseNotAllowed'),
                    })
                  } else if (error.code === '4') {
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseUnavailable'),
                    })
                  } else if (error.code === '5') {
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseProcessed'),
                    })
                  } else if (error.code === '6') {
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseReceiptMissing'),
                    })
                  } else if (error.code === '7') {
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseNetwork'),
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
                      message: t('settings:account.purchasePending'),
                    })
                  } else {
                    console.error('Unexpected purchase error:', error)
                    console.error('Error occurred in purchase flow')
                    showNotification({
                      type: 'error',
                      message: t('settings:account.purchaseFailed', {
                        message: error.message || t('common:status.unknown'),
                      }),
                    })
                  }
                }
              } else {
                setSubscriptionModal(true)
              }
            }}
          >
            {t('settings:account.upgrade')}
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
              {t('common:actions.cancel')}
            </Button>
          )}
        </Box>
        {import.meta.env.VITE_IS_SELF_HOSTED === 'true' && (
          <Box>
            <Typography level='title-md' mb={1}>
              {t('common:labels.password')} :
            </Typography>
            <Typography mb={1} level='body-sm'></Typography>
            <Button
              variant='soft'
              onClick={() => {
                setChangePasswordModal(true)
              }}
            >
              {t('settings:account.changePassword')}
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
                          message: t('settings:account.passwordChanged'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('settings:account.passwordChangeFailed'),
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
            {t('settings:account.dangerZone')}
          </Typography>
          <Typography level='body-sm' mb={2} color='neutral'>
            {t('settings:account.dangerDescription')}
          </Typography>
          <Button
            variant='outlined'
            color='danger'
            onClick={() => setUserDeletionModal(true)}
          >
            {t('settings:account.deleteAccount')}
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
              message: t('settings:modals.userDeletion.title'),
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
                  message: t('settings:account.subscriptionCancelled'),
                })
                window.location.reload()
              } else {
                showNotification({
                  type: 'error',
                  message: t('settings:account.subscriptionCancelFailed'),
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
