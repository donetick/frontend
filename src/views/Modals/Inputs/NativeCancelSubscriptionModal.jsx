import { Box, Button, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

const NativeCancelSubscriptionModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['settings', 'common'])
  const { ResponsiveModal } = useResponsiveModal()

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size='md' fullWidth>
      <Typography level='h4' sx={{ mb: 2 }}>
        {t('settings:nativeCancel.title')}
      </Typography>
      <Box sx={{ p: 2 }}>
        <Typography level='body-md' mb={3}>
          {t('settings:nativeCancel.description')}
        </Typography>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            {t('settings:nativeCancel.iosTitle')}
          </Typography>
          {[1, 2, 3, 4, 5].map(step => (
            <Typography level='body-sm' mb={step === 5 ? 2 : 1} key={step}>
              {t(`settings:nativeCancel.iosSteps.${step}`)}
            </Typography>
          ))}
          <Typography level='body-sm' mb={2} color='warning'>
            <strong>{t('common:notifications.titles.info')}:</strong>{' '}
            {t('settings:nativeCancel.iosNote')}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            {t('settings:nativeCancel.androidTitle')}
          </Typography>
          {[1, 2, 3, 4, 5, 6].map(step => (
            <Typography level='body-sm' mb={step === 6 ? 2 : 1} key={step}>
              {t(`settings:nativeCancel.androidSteps.${step}`)}
            </Typography>
          ))}
          <Typography level='body-sm' mb={2} color='warning'>
            <strong>{t('common:notifications.titles.info')}:</strong>{' '}
            {t('settings:nativeCancel.androidNote')}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            {t('settings:nativeCancel.webTitle')}
          </Typography>
          <Typography level='body-sm' mb={2}>
            {t('settings:nativeCancel.webDescription')}
          </Typography>
          <Typography level='body-sm' mb={2} color='warning'>
            <strong>{t('common:notifications.titles.warning')}:</strong>{' '}
            {t('settings:nativeCancel.webImportant')}
          </Typography>
        </Box>

        <Typography level='body-sm' mb={3} color='neutral'>
          {t('settings:nativeCancel.billingPeriod')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button size='lg' onClick={onClose} variant='outlined' fullWidth>
            {t('settings:nativeCancel.cancelFromStore')}
          </Button>
          <Button
            size='lg'
            onClick={() => onClose('desktop')}
            variant='solid'
            color='danger'
            fullWidth
          >
            {t('settings:nativeCancel.cancelDesktopNow')}
          </Button>
          <Button size='lg' onClick={onClose} fullWidth>
            {t('common:actions.close')}
          </Button>
        </Box>
      </Box>
    </ResponsiveModal>
  )
}

export default NativeCancelSubscriptionModal
