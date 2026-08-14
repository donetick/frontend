import { ChevronRight, Gavel, PrivacyTip } from '@mui/icons-material'
import { Button, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import ModalActions from '../../components/common/ModalActions.jsx'
import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'

/**
 * One-time notice that the Privacy Policy and Terms changed. The frame is
 * generic and always points at the documents, so a future revision only needs
 * POLICY_VERSION bumped.
 */
const PolicyUpdateModal = ({ onAcknowledge, onClose, open }) => {
  const { t } = useTranslation()
  const { ResponsiveModal } = useResponsiveModal()
  const navigate = useNavigate()

  const handleClose = () => {
    onAcknowledge?.()
    onClose()
  }

  const openDocument = path => {
    handleClose()
    navigate(path)
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
      onClose={handleClose}
      size='sm'
      title={t('policyUpdate.title')}
      description={t('policyUpdate.subtitle')}
      footer={
        <ModalActions
          primary={{
            label: t('policyUpdate.acknowledge'),
            onClick: handleClose,
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
