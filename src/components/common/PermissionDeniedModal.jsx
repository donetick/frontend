import { LockRounded } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import logo from '../../assets/logo.svg'
import AppModal from './AppModal'

/** Informational only: callers and the backend still enforce permissions.
 * Override title/description for other restrictions (e.g. a locked task).
 */
export default function PermissionDeniedModal({
  description,
  onClose,
  open,
  resourceName,
  resourceType = 'item',
  title,
}) {
  const { t } = useTranslation('common')
  const descriptionId = useId()

  return (
    <AppModal
      open={open}
      onClose={onClose}
      size='sm'
      mobilePresentation='dialog'
      aria-label={title || t('permissionDenied.title')}
      aria-describedby={descriptionId}
      contentSx={{ textAlign: 'center', px: 3, pb: 3.5 }}
    >
      <Box
        aria-hidden='true'
        sx={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: 120,
          height: 112,
          mx: 'auto',
          mb: 2,
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 130,
            height: 130,
            borderRadius: '50%',
            bgcolor: 'primary.softBg',
            opacity: 0.7,
            filter: 'blur(24px)',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: 88,
            height: 88,
            borderRadius: '28px',
            bgcolor: 'background.surface',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'sm',
            transform: 'rotate(-6deg)',
          }}
        >
          <Box
            component='img'
            src={logo}
            alt=''
            sx={{ width: 62, height: 62 }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: 3,
            right: 3,
            display: 'grid',
            placeItems: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: 'primary.softBg',
            color: 'primary.softColor',
            border: '3px solid',
            borderColor: 'background.surface',
          }}
        >
          <LockRounded sx={{ fontSize: 18 }} />
        </Box>
      </Box>
      <Typography
        component='h2'
        level='h3'
        sx={{ fontWeight: 700, letterSpacing: '-0.02em', textWrap: 'balance' }}
      >
        {title || t('permissionDenied.title')}
      </Typography>
      {resourceName && (
        <Typography level='title-sm' sx={{ mt: 1, overflowWrap: 'anywhere' }}>
          {resourceName}
        </Typography>
      )}
      <Typography
        id={descriptionId}
        level='body-md'
        sx={{ color: 'text.secondary', mt: 1.5, mb: 3, textWrap: 'pretty' }}
      >
        {description || t(`permissionDenied.${resourceType}Description`)}
      </Typography>
      <Button
        size='lg'
        fullWidth
        onClick={onClose}
        sx={{ borderRadius: '14px' }}
      >
        {t('permissionDenied.dismiss')}
      </Button>
    </AppModal>
  )
}

PermissionDeniedModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  resourceType: PropTypes.oneOf(['item', 'label', 'project', 'task']),
  resourceName: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
}
