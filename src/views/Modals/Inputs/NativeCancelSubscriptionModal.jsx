import { Box, Typography } from '@mui/joy'
import { Trans, useTranslation } from 'react-i18next'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

// The store steps embed bolded UI names mid-sentence, so they go through
// <Trans> rather than t() — translators keep the emphasis where their own
// word order needs it.
const Step = ({ i18nKey, ...props }) => (
  <Typography level='body-sm' {...props}>
    <Trans i18nKey={i18nKey} ns='settings' components={{ b: <strong /> }} />
  </Typography>
)

const NativeCancelSubscriptionModal = ({ isOpen, onClose }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const { t } = useTranslation('settings')

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      title={t('nativeCancel.title')}
      footer={
        <ModalActions
          stackOnMobile
          tertiary={{ label: t('nativeCancel.dismiss'), onClick: onClose }}
          secondary={{
            label: t('nativeCancel.cancelViaStore'),
            onClick: onClose,
          }}
          primary={{
            label: t('nativeCancel.cancelDesktop'),
            color: 'danger',
            onClick: () => onClose('desktop'),
          }}
        />
      }
    >
      <Box>
        <Typography level='body-md' mb={3}>
          {t('nativeCancel.intro')}
        </Typography>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            {t('nativeCancel.iosHeading')}
          </Typography>
          <Step i18nKey='nativeCancel.iosStep1' mb={1} />
          <Step i18nKey='nativeCancel.iosStep2' mb={1} />
          <Step i18nKey='nativeCancel.iosStep3' mb={1} />
          <Step i18nKey='nativeCancel.iosStep4' mb={1} />
          <Step i18nKey='nativeCancel.iosStep5' mb={2} />
          <Step i18nKey='nativeCancel.iosNote' mb={2} color='warning' />
        </Box>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            {t('nativeCancel.androidHeading')}
          </Typography>
          <Step i18nKey='nativeCancel.androidStep1' mb={1} />
          <Step i18nKey='nativeCancel.androidStep2' mb={1} />
          <Step i18nKey='nativeCancel.androidStep3' mb={1} />
          <Step i18nKey='nativeCancel.androidStep4' mb={1} />
          <Step i18nKey='nativeCancel.androidStep5' mb={1} />
          <Step i18nKey='nativeCancel.androidStep6' mb={2} />
          <Step i18nKey='nativeCancel.androidNote' mb={2} color='warning' />
        </Box>

        <Box mb={3}>
          <Typography level='title-md' mb={2} color='primary'>
            {t('nativeCancel.webHeading')}
          </Typography>
          <Typography level='body-sm' mb={2}>
            {t('nativeCancel.webBody')}
          </Typography>
          <Step i18nKey='nativeCancel.webNote' mb={2} color='warning' />
        </Box>

        <Typography level='body-sm' mb={3} color='neutral'>
          {t('nativeCancel.footer')}
        </Typography>
      </Box>
    </ResponsiveModal>
  )
}

export default NativeCancelSubscriptionModal
