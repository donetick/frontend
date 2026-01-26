import { Check, Star } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Modal,
  ModalDialog,
  Radio,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useNotification } from '../service/NotificationProvider'
import { GetSubscriptionSession } from '../utils/Fetcher'

const SubscriptionModal = ({ open, onClose }) => {
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
        throw new Error('Failed to create subscription session')
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
        title: 'Subscription Error',
        message: 'Failed to start subscription process. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout='center'
        sx={{
          width: 600,
          maxWidth: '95vw',
          maxHeight: '95vh',
          overflow: 'auto',
          p: 0,
        }}
      >
        <Box sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography level='h3' sx={{ mb: 1 }}>
              Upgrade to Plus
            </Typography>
          </Box>

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
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 4 }}
          >
            {Object.entries(plans).map(([key, plan]) => (
              <Card
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

          {/* Action Buttons */}
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mt: 2 }}
          >
            <Button
              variant='solid'
              color='primary'
              onClick={handleSubscribe}
              loading={isLoading}
              fullWidth
              size='lg'
              sx={{ mb: 1 }}
            >
              Subscribe
            </Button>
            <Button
              variant='plain'
              onClick={onClose}
              disabled={isLoading}
              fullWidth
            >
              Cancel
            </Button>
          </Box>

          {/* Footer */}
          <Typography
            level='body-xs'
            color='neutral'
            sx={{ textAlign: 'center', mt: 3 }}
          >
            Cancel anytime. No hidden fees. Secure payment powered by Stripe.
          </Typography>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default SubscriptionModal
