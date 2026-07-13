import { Capacitor } from '@capacitor/core'
import {
  CheckCircle,
  ContentCopy,
  ErrorOutline,
  Nfc,
} from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Input,
  Switch,
  Typography,
} from '@mui/joy'
import { useRef, useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { startNativeNFCWrite } from '../../../service/NFCWriter'

const pulseKeyframes = `
  @keyframes nfc-pulse {
    0% { transform: scale(1); opacity: 0.6; }
    70% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes nfc-pulse-2 {
    0% { transform: scale(1); opacity: 0.4; }
    70% { transform: scale(2.1); opacity: 0; }
    100% { transform: scale(2.1); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .nfc-pulse-ring { animation: none !important; }
  }
`

function NFCIcon({ status }) {
  const isWaiting = status === 'waiting_for_tag'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 96,
        height: 96,
        mx: 'auto',
        mb: 3,
      }}
    >
      {isWaiting && (
        <>
          <Box
            className='nfc-pulse-ring'
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.400',
              animation: 'nfc-pulse 1.8s ease-out infinite',
            }}
          />
          <Box
            className='nfc-pulse-ring'
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.300',
              animation: 'nfc-pulse-2 1.8s ease-out infinite 0.4s',
            }}
          />
        </>
      )}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isSuccess
            ? 'success.softBg'
            : isError
              ? 'danger.softBg'
              : isWaiting
                ? 'primary.softBg'
                : 'neutral.100',
          transition: 'background-color 0.25s ease',
        }}
      >
        {isSuccess ? (
          <CheckCircle sx={{ fontSize: 40, color: 'success.500' }} />
        ) : isError ? (
          <ErrorOutline sx={{ fontSize: 40, color: 'danger.500' }} />
        ) : (
          <Nfc
            sx={{
              fontSize: 40,
              color: isWaiting ? 'primary.500' : 'neutral.500',
              transition: 'color 0.25s ease',
            }}
          />
        )}
      </Box>
    </Box>
  )
}

function WriteNFCModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [nfcStatus, setNfcStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isAutoCompleteWhenScan, setIsAutoCompleteWhenScan] = useState(false)
  const [copied, setCopied] = useState(false)
  const cancelScanRef = useRef(null)
  const isNative = Capacitor.isNativePlatform()

  const getURL = () => {
    let url = config.url
    if (isAutoCompleteWhenScan) url += '?auto_complete=true'
    return url
  }

  const handleClose = async () => {
    if (cancelScanRef.current) {
      await cancelScanRef.current()
      cancelScanRef.current = null
    }
    config.onClose()
    setNfcStatus('idle')
    setErrorMessage('')
  }

  const handleCancel = async () => {
    if (cancelScanRef.current) {
      await cancelScanRef.current()
      cancelScanRef.current = null
    }
    setNfcStatus('idle')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getURL())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const writeToNFC = async () => {
    const url = getURL()

    if (isNative) {
      setNfcStatus('writing')
      const cancel = await startNativeNFCWrite(url, {
        onWaiting: () => setNfcStatus('waiting_for_tag'),
        onSuccess: () => {
          cancelScanRef.current = null
          setNfcStatus('success')
        },
        onError: msg => {
          cancelScanRef.current = null
          setNfcStatus('error')
          setErrorMessage(msg)
        },
      })
      cancelScanRef.current = cancel
    } else {
      if ('NDEFReader' in window) {
        try {
          setNfcStatus('writing')
          const ndef = new window.NDEFReader()
          await ndef.write({ records: [{ recordType: 'url', data: url }] })
          setNfcStatus('success')
        } catch (error) {
          console.error('Error writing to NFC tag:', error)
          setNfcStatus('error')
          setErrorMessage('Error writing to NFC tag. Please try again.')
        }
      } else {
        setNfcStatus('error')
        setErrorMessage(
          'NFC is not supported by this browser. Copy the URL and write it to an NFC tag using a compatible device.',
        )
      }
    }
  }

  const isWaiting = nfcStatus === 'waiting_for_tag' || nfcStatus === 'writing'
  const isSuccess = nfcStatus === 'success'
  const isError = nfcStatus === 'error'

  const title = isSuccess
    ? 'Tag written!'
    : isError
      ? 'Something went wrong'
      : isWaiting
        ? 'Hold near NFC tag'
        : 'Write to NFC'

  const subtitle = isSuccess
    ? 'Your NFC tag is ready to use.'
    : isError
      ? errorMessage
      : isWaiting
        ? 'Keep your device near the tag until complete.'
        : 'Encode this task link onto any NFC tag.'

  return (
    <>
      <style>{pulseKeyframes}</style>
      <ResponsiveModal open={config?.isOpen} onClose={handleClose}>
        <Box sx={{ px: 0.5, pb: 1 }}>
          {/* Icon */}
          <NFCIcon status={nfcStatus} />

          {/* Heading */}
          <Typography
            level='title-lg'
            textAlign='center'
            sx={{ mb: 0.75, fontWeight: 600 }}
          >
            {title}
          </Typography>
          <Typography
            level='body-sm'
            textAlign='center'
            sx={{ color: 'text.secondary', mb: 3, px: 2 }}
          >
            {subtitle}
          </Typography>

          {/* Idle / Error: URL + toggle + CTA */}
          {!isWaiting && !isSuccess && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography
                  level='body-xs'
                  sx={{
                    mb: 0.75,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'text.tertiary',
                  }}
                >
                  Tag URL
                </Typography>
                <Input
                  value={getURL()}
                  readOnly
                  size='sm'
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    '--Input-focusedHighlight': 'transparent',
                    bgcolor: 'neutral.50',
                  }}
                  endDecorator={
                    <IconButton
                      size='sm'
                      variant='plain'
                      color={copied ? 'success' : 'neutral'}
                      onClick={handleCopy}
                      title='Copy URL'
                    >
                      <ContentCopy sx={{ fontSize: 16 }} />
                    </IconButton>
                  }
                />
                {copied && (
                  <Typography
                    level='body-xs'
                    sx={{ color: 'success.500', mt: 0.5, textAlign: 'right' }}
                  >
                    Copied!
                  </Typography>
                )}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 1.5,
                  px: 2,
                  borderRadius: 'md',
                  bgcolor: 'neutral.50',
                  mb: 3,
                }}
              >
                <Box>
                  <Typography level='body-sm' fontWeight={500}>
                    Auto-complete on scan
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    Mark task done when tag is tapped
                  </Typography>
                </Box>
                <Switch
                  checked={isAutoCompleteWhenScan}
                  onChange={e => setIsAutoCompleteWhenScan(e.target.checked)}
                  size='sm'
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  size='lg'
                  variant='outlined'
                  color='neutral'
                  sx={{ flex: 1 }}
                  onClick={isError ? handleClose : handleClose}
                >
                  Cancel
                </Button>
                <Button
                  size='lg'
                  sx={{ flex: 1 }}
                  onClick={writeToNFC}
                  disabled={nfcStatus === 'writing'}
                  startDecorator={
                    nfcStatus === 'writing' ? (
                      <CircularProgress size='sm' />
                    ) : (
                      <Nfc />
                    )
                  }
                >
                  {nfcStatus === 'writing' ? 'Starting…' : 'Write tag'}
                </Button>
              </Box>
            </>
          )}

          {/* Waiting state */}
          {isWaiting && (
            <Button
              size='lg'
              variant='outlined'
              color='neutral'
              fullWidth
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}

          {/* Success state */}
          {isSuccess && (
            <Button size='lg' fullWidth onClick={handleClose}>
              Done
            </Button>
          )}
        </Box>
      </ResponsiveModal>
    </>
  )
}

export default WriteNFCModal
