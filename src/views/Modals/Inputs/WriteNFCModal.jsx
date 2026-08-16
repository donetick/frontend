import { Capacitor } from '@capacitor/core'
import {
  CheckCircle,
  ContentCopy,
  ErrorOutline,
  Nfc,
} from '@mui/icons-material'
import { Box, IconButton, Input, Switch, Typography } from '@mui/joy'
import { useRef, useState } from 'react'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { startNativeNFCWrite } from '../../../service/NFCWriter'
import { useTranslation } from 'react-i18next'

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
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.400',
              animation: 'nfc-pulse 1.8s ease-out infinite',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.300',
              animation: 'nfc-pulse-2 1.8s ease-out infinite 0.4s',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
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
  const { t } = useTranslation('chores')
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
          setErrorMessage(t('nfc.errWrite'))
        }
      } else {
        setNfcStatus('error')
        setErrorMessage(t('nfc.errUnsupported'))
      }
    }
  }

  const isWaiting = nfcStatus === 'waiting_for_tag' || nfcStatus === 'writing'
  const isSuccess = nfcStatus === 'success'
  const isError = nfcStatus === 'error'

  const title = isSuccess
    ? t('nfc.titleSuccess')
    : isError
      ? t('nfc.titleError')
      : isWaiting
        ? t('nfc.titleWaiting')
        : t('actionMenu.writeNFC')

  const subtitle = isSuccess
    ? t('nfc.subSuccess')
    : isError
      ? errorMessage
      : isWaiting
        ? t('nfc.subWaiting')
        : t('nfc.subIdle')

  return (
    <>
      <style>{pulseKeyframes}</style>
      <ResponsiveModal
        open={config?.isOpen}
        onClose={handleClose}
        title={title}
        description={subtitle}
        closeOnBackdrop={!isWaiting}
        closeOnEscape={!isWaiting}
        footer={
          isSuccess ? (
            <ModalActions primary={{ label: t('activity.status.done'), onClick: handleClose }} />
          ) : isWaiting ? (
            <ModalActions
              secondary={{ label: t('choreView.cancel'), onClick: handleCancel }}
            />
          ) : (
            <ModalActions
              secondary={{ label: t('choreView.cancel'), onClick: handleClose }}
              primary={{
                label: nfcStatus === 'writing' ? 'Starting…' : 'Write tag',
                onClick: writeToNFC,
                disabled: nfcStatus === 'writing',
                startDecorator: <Nfc />,
              }}
            />
          )
        }
      >
        <Box sx={{ px: 0.5, pb: 1 }}>
          {/* Icon */}
          <NFCIcon status={nfcStatus} />

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
                  {t('nfc.tagUrl')}
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
                      aria-label='Copy tag URL'
                      size='sm'
                      variant='plain'
                      color={copied ? 'success' : 'neutral'}
                      onClick={handleCopy}
                      title={t('nfc.copyUrl')}
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
                    {t('common:copied')}
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
                    {t('nfc.autoComplete')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('nfc.autoCompleteHint')}
                  </Typography>
                </Box>
                <Switch
                  checked={isAutoCompleteWhenScan}
                  onChange={e => setIsAutoCompleteWhenScan(e.target.checked)}
                  size='sm'
                />
              </Box>
            </>
          )}
        </Box>
      </ResponsiveModal>
    </>
  )
}

export default WriteNFCModal
