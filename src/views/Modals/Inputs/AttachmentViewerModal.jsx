import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Close, Download } from '@mui/icons-material'
import { Box, Button, CircularProgress, Typography } from '@mui/joy'
import { useState } from 'react'
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
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            variant='plain'
            color='neutral'
            startDecorator={<Close />}
            onClick={handleClose}
          >
            Close
          </Button>
          <Button
            variant='soft'
            color='neutral'
            startDecorator={<Download />}
            onClick={() => downloadUrl(url, fileName)}
            disabled={!url}
          >
            Download
          </Button>
        </Box>
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
          <CircularProgress
            sx={{ position: 'absolute' }}
            size='md'
          />
        )}
        {imgError ? (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Failed to load image.
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
