import { Box, Button, Typography } from '@mui/joy'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

const NativeCancelSubscriptionModal = ({ isOpen, onClose }) => {
  const { ResponsiveModal } = useResponsiveModal()

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size='md' fullWidth>
      <Typography level='h4' sx={{ mb: 2 }}>
        Cancel Subscription
      </Typography>
      <Box sx={{ p: 2 }}>
        <Typography level='body-md' mb={3}>
          To cancel your subscription, please follow the instructions for your
          platform (you should cancel through the same platform you used to
          subscribe).
        </Typography>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            For iOS (iPhone/iPad):
          </Typography>
          <Typography level='body-sm' mb={1}>
            1. Open the <strong>Settings</strong> app on your device
          </Typography>
          <Typography level='body-sm' mb={1}>
            2. Tap your name at the top of the screen
          </Typography>
          <Typography level='body-sm' mb={1}>
            3. Tap <strong>Subscriptions</strong>
          </Typography>
          <Typography level='body-sm' mb={1}>
            4. Find and tap <strong>Donetick</strong>
          </Typography>
          <Typography level='body-sm' mb={2}>
            5. Tap <strong>Cancel Subscription</strong>
          </Typography>
          <Typography level='body-sm' mb={2} color='warning'>
            <strong>Note:</strong> If you subscribed through iOS and are using
            the web/desktop version, you must cancel through iOS Settings as
            described above.
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            For Android:
          </Typography>
          <Typography level='body-sm' mb={1}>
            1. Open the <strong>Google Play Store</strong> app
          </Typography>
          <Typography level='body-sm' mb={1}>
            2. Tap the profile icon in the top right
          </Typography>
          <Typography level='body-sm' mb={1}>
            3. Tap <strong>Payments & subscriptions</strong>
          </Typography>
          <Typography level='body-sm' mb={1}>
            4. Tap <strong>Subscriptions</strong>
          </Typography>
          <Typography level='body-sm' mb={1}>
            5. Find and tap <strong>Donetick</strong>
          </Typography>
          <Typography level='body-sm' mb={2}>
            6. Tap <strong>Cancel subscription</strong>
          </Typography>
          <Typography level='body-sm' mb={2} color='warning'>
            <strong>Note:</strong> If you subscribed through Google Play and are
            using the web/desktop version, you must cancel through Google Play
            as described above.
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            For Web/Desktop Subscriptions:
          </Typography>
          <Typography level='body-sm' mb={2}>
            If you originally subscribed through our website or desktop app, you
            can cancel your subscription by going to the Account Settings
            section on our website. using a web browser
          </Typography>
          <Typography level='body-sm' mb={2} color='warning'>
            <strong>Important:</strong> You must cancel your subscription
            through the same platform where you originally subscribed. If you
            subscribed through the iOS App Store or Google Play Store (even if
            you're now using the web/desktop version), you must cancel through
            that original platform using the instructions above.
          </Typography>
        </Box>

        <Typography level='body-sm' mb={3} color='neutral'>
          Your subscription will remain active until the end of your current
          billing period.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button size='lg' onClick={onClose} variant='outlined' fullWidth>
            I'll cancel from my app store
          </Button>
          <Button
            size='lg'
            onClick={() => onClose('desktop')}
            variant='solid'
            color='danger'
            fullWidth
          >
            I subscribed via desktop - Cancel now
          </Button>
          <Button size='lg' onClick={onClose} fullWidth>
            Dismiss
          </Button>
        </Box>
      </Box>
    </ResponsiveModal>
  )
}

export default NativeCancelSubscriptionModal
