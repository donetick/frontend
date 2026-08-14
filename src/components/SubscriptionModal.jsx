import { Check, Star } from '@mui/icons-material'
import { Box, Card, Chip, Divider, Radio, Typography } from '@mui/joy'
import { useState } from 'react'
import AppModal from './common/AppModal'
import ModalActions from './common/ModalActions'
import { useNotification } from '../service/NotificationProvider'
import { GetSubscriptionSession } from '../utils/Fetcher'
import { useTranslation } from 'react-i18next'

const SubscriptionModal = ({ open, onClose }) => {
  const { t } = useTranslation('settings')
  const [selectedPlan, setSelectedPlan] = useState('yearly')
  const [isLoading, setIsLoading] = useState(false)
  const { showError } = useNotification()

  const plans = {
    yearly: {
      price: '$39.00',
      period: 'year',
      total: '$39.00/year',
      // savings: 'Save $20.88',
      // popular: true,
    },
    // monthly: {
    //   price: '$4.99',
    //   period: 'month',
    //   total: '$4.99/month',
    //   savings: null,
    // },
  }

  const features = [
    'Task notifications and reminders',
    'Rich text descriptions with images uploads',
    'Thing-based task triggers',
    'API tokens for integrations',
    'Image uploads in descriptions',
    'Advanced task automation',
    // 'Unlimited task history',
    // 'Unlimited things history',
  ]

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      // Call the backend with the selected plan
      const response = await GetSubscriptionSession()

      if (!response.ok) {
        throw new Error(t('subscription.sessionFailed'))
      }

      const data = await response.json()

      // Redirect to Stripe
      if (data.sessionURL) {
        window.location.href = data.sessionURL
      } else {
        throw new Error('No session URL received')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      showError({
        title: t('subscription.errorTitle'),
        message: t('subscription.errorMessage'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t('overview.upgrade.title')}
      description='Unlock reminders, rich task details, and advanced automation.'
      size='lg'
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <ModalActions
          stackOnMobile
          secondary={{ label: t('accountSettings.cancel'), onClick: onClose, disabled: isLoading }}
          primary={{
            label: t('subscription.subscribe'),
            onClick: handleSubscribe,
            loading: isLoading,
          }}
        />
      }
    >
      {/* Features List */}
      <Box sx={{ mb: 2 }}>
        <Typography level='title-lg' sx={{ mb: 2 }}>
          What&apos;s included:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {features.map((feature, index) => (
            <Box
              key={index}
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <Check color='success' sx={{ fontSize: 20 }} />
              <Typography level='body-md'>{feature}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Divider sx={{ my: 3 }} />

      {/* Plan Selection */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 4 }}>
        {Object.entries(plans).map(([key, plan]) => (
          <Card
            component='label'
            htmlFor={`subscription-plan-${key}`}
            key={key}
            color={selectedPlan === key ? 'primary' : 'neutral'}
            onClick={() => setSelectedPlan(key)}
            sx={{
              width: '100%',
              minHeight: 48,
              maxHeight: 64,
              cursor: 'pointer',
              transition: 'all 0.2s',
              mb: 0.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              py: 1.2,
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                justifyContent: 'flex-start',
                width: '100%',
              }}
            >
              <Radio
                id={`subscription-plan-${key}`}
                checked={selectedPlan === key}
                onChange={() => setSelectedPlan(key)}
                value={key}
                name='subscription-plan'
                color='primary'
                sx={{ mr: 1 }}
              />
              <Typography level='body-md' sx={{ fontWeight: 600 }}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Typography>
              <Typography level='body-sm' sx={{ fontWeight: 500, ml: 1 }}>
                {plan.price}
                <span style={{ color: '#888', fontWeight: 400 }}>
                  {' '}
                  / {plan.period}
                </span>
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                position: 'absolute',
                right: 16,
                top: -18,
              }}
            >
              {plan.popular && (
                <Chip
                  variant='solid'
                  color='warning'
                  size='sm'
                  startDecorator={<Star />}
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    px: 1,
                    py: 0.1,
                    boxShadow: 2,
                    mt: 0.8,
                  }}
                >
                  Most Popular
                </Chip>
              )}
              {plan.savings && (
                <Chip
                  variant='soft'
                  color='success'
                  size='sm'
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    px: 1,
                    py: 0.1,
                    boxShadow: 2,
                    mt: 0.8,
                  }}
                >
                  {plan.savings}
                </Chip>
              )}
            </Box>
          </Card>
        ))}
      </Box>

      {/* Footer */}
      <Typography
        level='body-xs'
        color='neutral'
        sx={{ textAlign: 'center', mt: 3 }}
      >
        {t('subscription.cancelAnytime')}
      </Typography>
    </AppModal>
  )
}

export default SubscriptionModal
