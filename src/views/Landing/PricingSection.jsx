/* eslint-disable react/jsx-key */
import { CheckRounded } from '@mui/icons-material'
import { Container, Typography } from '@mui/joy'
import { useNavigate } from 'react-router-dom'

const PricingSection = () => {
  const navigate = useNavigate()
  const FEATURES_FREE = [
    ['Create Tasks and Chores', <CheckRounded color='primary' />],
    ['Limited Task History', <CheckRounded color='primary' />],
    ['Circle up to two members', <CheckRounded color='primary' />],
  ]
  const FEATURES_PREMIUM = [
    ['All Basic Features', <CheckRounded color='primary' />],
    ['Hosted on DoneTick servers', <CheckRounded color='primary' />],
    ['Up to 8 Circle Members', <CheckRounded color='primary' />],
    [
      'Notification through Telegram (Discord coming soon)',
      <CheckRounded color='primary' />,
    ],
    ['Unlimited History', <CheckRounded color='primary' />],
    [
      'All circle members get the same features as the owner',
      <CheckRounded color='primary' />,
    ],
  ]
  const FEATURES_YEARLY = [
    // ['All Basic Features', <CheckRounded color='primary' />],
    // ['Up to 8 Circle Members', <CheckRounded color='primary' />],
    ['Notification through Telegram bot', <CheckRounded color='primary' />],
    ['Custom Webhook/API Integration', <CheckRounded color='primary' />],
    ['Unlimited History', <CheckRounded color='primary' />],

    ['Priority Support', <CheckRounded color='primary' />],
  ]
  const PRICEITEMS = [
    {
      title: 'Basic',
      description:
        'Hosted on Donetick servers, supports up to 2 circle members and includes all the features of the free plan.',
      price: 0,
      previousPrice: 0,
      interval: 'month',
      discount: false,
      features: FEATURES_FREE,
    },

    {
      title: 'Plus',
      description:
        // 'Supports up to 8 circle members and includes all the features of the Basic plan.',
        'Hosted on Donetick servers, supports up to 8 circle members and includes all the features of the Basic plan.',
      price: 30.0,
      //   previousPrice: 76.89,
      interval: 'year',
      //   discount: true,
      features: FEATURES_YEARLY,
    },
  ]
  return (
    <Container
      sx={{ textAlign: 'center', mb: 2 }}
      maxWidth={'lg'}
      id='pricing-tiers'
    >
      <Typography level='h4' mt={2} mb={2}>
        Pricing
      </Typography>
      <Container maxWidth={'sm'} sx={{ mb: 8 }}>
        <Typography level='body-md' color='neutral'>
          Choose the plan that works best for you.
        </Typography>
      </Container>
    </Container>
  )
}

export default PricingSection
