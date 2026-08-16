import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { ChevronRight, Gavel, PrivacyTip } from '@mui/icons-material'
import { Button, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../components/common/ModalActions.jsx'
import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'

const POLICY_BASE_URL = 'https://app.donetick.com'

// Native webviews swallow target="_blank"; route through the system browser.
const openUrl = async url => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * One-time notice that the Privacy Policy and Terms changed. The frame is
 * generic and always points at the documents, so a future revision only needs
 * POLICY_VERSION bumped.
 */
const PolicyUpdateModal = ({ onAcknowledge, onClose, open }) => {
  const { t } = useTranslation()
  const { ResponsiveModal } = useResponsiveModal()

  // Acknowledgement is the only way out: the backdrop, escape key, and close
  // button are all disabled so the user must press "Got it".
  const handleAcknowledge = () => {
    onAcknowledge?.()
    onClose()
  }

  // Reading a document must not dismiss the notice; the modal is still waiting
  // on an acknowledgement when the user returns from the browser.
  const openDocument = path => {
    openUrl(`${POLICY_BASE_URL}${path}`)
  }

  const documentButtonSx = {
    justifyContent: 'flex-start',
    fontWeight: 500,
    '--Button-gap': '12px',
    '& .MuiButton-endDecorator': { ml: 'auto' },
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={handleAcknowledge}
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      size='sm'
      title={t('policyUpdate.title')}
      description={t('policyUpdate.subtitle')}
      footer={
        <ModalActions
          primary={{
            label: t('policyUpdate.acknowledge'),
            onClick: handleAcknowledge,
            sx: { width: { xs: '100%', sm: 'auto' } },
          }}
        />
      }
    >
      <Stack spacing={1}>
        <Button
          variant='outlined'
          color='neutral'
          fullWidth
          startDecorator={<PrivacyTip />}
          endDecorator={<ChevronRight />}
          onClick={() => openDocument('/privacy')}
          sx={documentButtonSx}
        >
          {t('policyUpdate.readPrivacy')}
        </Button>
        <Button
          variant='outlined'
          color='neutral'
          fullWidth
          startDecorator={<Gavel />}
          endDecorator={<ChevronRight />}
          onClick={() => openDocument('/terms')}
          sx={documentButtonSx}
        >
          {t('policyUpdate.readTerms')}
        </Button>
      </Stack>
    </ResponsiveModal>
  )
}

export default PolicyUpdateModal
