import {
  DeleteOutlineRounded,
  LockOutlined,
  WorkspacePremiumRounded,
} from '@mui/icons-material'
import { Box, Button, Chip, Sheet, Typography } from '@mui/joy'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import SubscriptionModal from '../../components/SubscriptionModal'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { CancelSubscription, UpdatePassword } from '../../utils/Fetcher'
import {
  isNativePurchasePlatform,
  NATIVE_PAYWALL_INVOKER,
  presentNativePaywall,
} from '../../utils/NativePaywall'
import LoadingComponent from '../components/Loading'
import NativeCancelSubscriptionModal from '../Modals/Inputs/NativeCancelSubscriptionModal'
import PassowrdChangeModal from '../Modals/Inputs/PasswordChangeModal'
import UserDeletionModal from '../Modals/Inputs/UserDeletionModal'
import SettingsLayout from './SettingsLayout'

const surfaceSx = {
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 'xl',
}

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
  const [isPurchasing, setIsPurchasing] = useState(false)

  if (!userProfile) return <LoadingComponent />

  const subscriptionIsActive = userProfile.subscription === 'active'
  const subscriptionIsCancelled = userProfile.subscription === 'cancelled'
  const expirationIsFuture = moment(userProfile.expiration).isAfter(moment())
  const hasPlusAccess =
    subscriptionIsActive || (subscriptionIsCancelled && expirationIsFuture)

  const subscriptionStatus = subscriptionIsActive
    ? t('accountSettings.plus')
    : subscriptionIsCancelled && expirationIsFuture
      ? t('accountSettings.plusUntil', {
          date: fmt.date(userProfile.expiration),
        })
      : t('accountSettings.free')

  const subscriptionDetails = subscriptionIsActive
    ? t('accountSettings.activeDescription', {
        date: fmt.date(userProfile.expiration),
      })
    : subscriptionIsCancelled
      ? t('accountSettings.cancelledDescription', {
          date: fmt.date(userProfile.expiration),
        })
      : t('accountSettings.freeDescription')

  const showPurchaseError = error => {
    if (error?.code === '1') return

    const errorKeys = {
      2: 'storeConnection',
      3: 'notAllowed',
      4: 'unavailable',
      5: 'alreadyProcessed',
      6: 'receiptMissing',
      7: 'networkError',
      8: 'invalidReceipt',
      9: 'pending',
    }
    const key = errorKeys[error?.code]
    showNotification({
      type: error?.code === '9' ? 'warning' : 'error',
      message: key
        ? t(`accountSettings.purchase.${key}`)
        : t('accountSettings.purchase.failed', {
            error: error?.message || t('accountSettings.purchase.unknownError'),
          }),
    })
  }

  const handleUpgrade = async () => {
    if (!isNativePurchasePlatform()) {
      setSubscriptionModal(true)
      return
    }

    setIsPurchasing(true)
    try {
      await presentNativePaywall({
        appUserID: userProfile.id,
        invoker: NATIVE_PAYWALL_INVOKER.ACCOUNT_SETTINGS,
      })

      const { customerInfo } = await Purchases.getCustomerInfo()
      if (customerInfo.entitlements.active['Donetick Plus']) {
        await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
        showNotification({
          type: 'success',
          message: t('accountSettings.purchase.success'),
        })
      }
    } catch (error) {
      showPurchaseError(error)
    } finally {
      setIsPurchasing(false)
    }
  }

  const handlePasswordChange = async password => {
    setChangePasswordModal(false)
    if (!password) return

    const response = await UpdatePassword(password)
    showNotification({
      type: response.ok ? 'success' : 'error',
      message: response.ok
        ? t('accountSettings.passwordChanged')
        : t('accountSettings.passwordChangeFailed'),
    })
  }

  const handleCancelSubscription = async action => {
    setNativeCancelModal(false)
    if (action !== 'desktop') return

    const response = await CancelSubscription()
    if (response.ok) {
      showNotification({
        type: 'success',
        message: t('accountSettings.subscriptionCancelled'),
      })
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      window.location.reload()
    } else {
      showNotification({
        type: 'error',
        message: t('accountSettings.subscriptionCancelFailed'),
      })
    }
  }

  return (
    <SettingsLayout title={t('accountSettings.title')}>
      <Box sx={{ maxWidth: 720, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 600, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('accountSettings.description')}
        </Typography>

        <Sheet
          sx={{
            ...surfaceSx,
            overflow: 'hidden',
            position: 'relative',
            p: { xs: 2, sm: 2.5 },
            '&::after': {
              bgcolor: hasPlusAccess ? 'primary.softBg' : 'neutral.softBg',
              borderRadius: '50%',
              content: '""',
              height: 180,
              opacity: 0.7,
              position: 'absolute',
              right: -70,
              top: -100,
              width: 180,
            },
          }}
        >
          <Box
            sx={{
              alignItems: 'flex-start',
              display: 'flex',
              gap: 1.5,
              mb: 2,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                bgcolor: hasPlusAccess ? 'primary.softBg' : 'background.level2',
                borderRadius: '50%',
                color: hasPlusAccess ? 'primary.plainColor' : 'text.secondary',
                display: 'grid',
                flex: '0 0 auto',
                height: 48,
                placeItems: 'center',
                width: 48,
              }}
            >
              <WorkspacePremiumRounded />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Typography level='title-lg' sx={{ fontWeight: 650 }}>
                  {t('accountSettings.accountType', {
                    type: subscriptionStatus,
                  })}
                </Typography>
                <Chip
                  size='sm'
                  variant='soft'
                  color={
                    subscriptionIsActive
                      ? 'primary'
                      : subscriptionIsCancelled && expirationIsFuture
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {hasPlusAccess
                    ? t('accountSettings.plus')
                    : t('accountSettings.free')}
                </Chip>
              </Box>
              <Typography
                level='body-sm'
                textColor='text.secondary'
                sx={{ maxWidth: 540, textWrap: 'pretty' }}
              >
                {subscriptionDetails}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {!subscriptionIsActive && (
              <Button
                loading={isPurchasing}
                onClick={handleUpgrade}
                startDecorator={<WorkspacePremiumRounded />}
                sx={{ minWidth: 128 }}
              >
                {t('accountSettings.upgrade')}
              </Button>
            )}
            {subscriptionIsActive && (
              <Button
                variant='outlined'
                color='neutral'
                onClick={() => setNativeCancelModal(true)}
              >
                {t('accountSettings.cancel')}
              </Button>
            )}
          </Box>
        </Sheet>

        {import.meta.env.VITE_IS_SELF_HOSTED === 'true' && (
          <Box component='section' sx={{ mt: 3.5 }}>
            <Typography
              level='title-md'
              sx={{ fontWeight: 650, letterSpacing: '-0.01em', mb: 1.25 }}
            >
              {t('accountSettings.password')}
            </Typography>
            <Sheet
              sx={{
                ...surfaceSx,
                alignItems: { xs: 'flex-start', sm: 'center' },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                justifyContent: 'space-between',
                p: 2,
              }}
            >
              <Box sx={{ alignItems: 'center', display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    bgcolor: 'background.level2',
                    borderRadius: '50%',
                    color: 'text.secondary',
                    display: 'grid',
                    flex: '0 0 auto',
                    height: 42,
                    placeItems: 'center',
                    width: 42,
                  }}
                >
                  <LockOutlined />
                </Box>
                <Typography level='body-md'>••••••••••••</Typography>
              </Box>
              <Button
                variant='soft'
                startDecorator={<LockOutlined />}
                onClick={() => setChangePasswordModal(true)}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t('accountSettings.changePassword')}
              </Button>
            </Sheet>
          </Box>
        )}

        <Box component='section' sx={{ mt: 4 }}>
          <Sheet
            variant='outlined'
            color='danger'
            sx={{
              borderRadius: 'xl',
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <Box
              sx={{
                alignItems: { xs: 'stretch', sm: 'center' },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography
                  level='title-md'
                  textColor='danger.plainColor'
                  sx={{ fontWeight: 650, mb: 0.5 }}
                >
                  {t('accountSettings.dangerZone')}
                </Typography>
                <Typography
                  level='body-sm'
                  textColor='text.secondary'
                  sx={{ maxWidth: 480, textWrap: 'pretty' }}
                >
                  {t('accountSettings.dangerZoneDescription')}
                </Typography>
              </Box>
              <Button
                variant='outlined'
                color='danger'
                startDecorator={<DeleteOutlineRounded />}
                onClick={() => setUserDeletionModal(true)}
                sx={{ flexShrink: 0 }}
              >
                {t('accountSettings.deleteAccount')}
              </Button>
            </Box>
          </Sheet>
        </Box>
      </Box>

      <SubscriptionModal
        open={subscriptionModal}
        invoker={NATIVE_PAYWALL_INVOKER.ACCOUNT_SETTINGS}
        onClose={() => setSubscriptionModal(false)}
      />

      {changePasswordModal && (
        <PassowrdChangeModal
          isOpen={changePasswordModal}
          onClose={handlePasswordChange}
        />
      )}

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
        onClose={handleCancelSubscription}
      />
    </SettingsLayout>
  )
}

export default AccountSettings
