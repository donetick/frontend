import { Browser } from '@capacitor/browser'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { Download } from '@mui/icons-material'
import { Box, CircularProgress, Typography } from '@mui/joy'
import { useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

const openUrl = async url => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

const downloadUrl = (url, fileName) => {
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url })
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'attachment'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

function AttachmentViewerModal({ config }) {
  const { t } = useTranslation('common')
  const { ResponsiveModal } = useResponsiveModal()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const { isOpen, url, fileName, onClose } = config || {}

  const handleClose = () => {
    setImgLoaded(false)
    setImgError(false)
    onClose?.()
  }

  return (
    <ResponsiveModal
      open={!!isOpen}
      onClose={handleClose}
      title={fileName || 'Attachment'}
      maxHeight='92vh'
      footer={
        <ModalActions
          secondary={{ label: t('close'), onClick: handleClose }}
          primary={{
            label: 'Download',
            startDecorator: <Download />,
            onClick: () => downloadUrl(url, fileName),
            disabled: !url,
          }}
        />
      }
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          position: 'relative',
        }}
      >
        {!imgLoaded && !imgError && (
          <CircularProgress sx={{ position: 'absolute' }} size='md' />
        )}
        {imgError ? (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('imageLoadFailed')}
          </Typography>
        ) : (
          <Box
            component='img'
            src={url}
            alt={fileName}
            onClick={() => url && openUrl(url)}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgLoaded(true)
              setImgError(true)
            }}
            sx={{
              cursor: url ? 'zoom-in' : 'default',
              maxWidth: '100%',
              maxHeight: '65vh',
              borderRadius: 'md',
              objectFit: 'contain',
              display: imgLoaded && !imgError ? 'block' : 'none',
            }}
          />
        )}
      </Box>
    </ResponsiveModal>
  )
}

export default AttachmentViewerModal
