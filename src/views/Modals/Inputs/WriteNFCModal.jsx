import { CopyAll } from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Input,
  ListItem,
  Typography,
} from '@mui/joy'
import { useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { startNativeNFCWrite } from '../../../service/NFCWriter'

function WriteNFCModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [nfcStatus, setNfcStatus] = useState('idle') // 'idle' | 'writing' | 'waiting_for_tag' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [isAutoCompleteWhenScan, setIsAutoCompleteWhenScan] = useState(false)
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
          'NFC is not supported by this browser. You can still copy the URL and write it to an NFC tag using a compatible device.',
        )
      }
    }
  }

  const renderBody = () => {
    if (nfcStatus === 'success') {
      return (
        <Typography level='body-md' gutterBottom>
          URL written to NFC tag successfully!
        </Typography>
      )
    }

    if (nfcStatus === 'waiting_for_tag') {
      return (
        <>
          <Box
            display='flex'
            flexDirection='column'
            alignItems='center'
            gap={2}
            py={3}
          >
            <CircularProgress size='lg' />
            <Typography level='body-md' textAlign='center'>
              Hold your device near the NFC tag
            </Typography>
          </Box>
          <Button
            variant='outlined'
            color='neutral'
            fullWidth
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </>
      )
    }

    return (
      <>
        <Typography level='body-md' gutterBottom>
          {nfcStatus === 'error'
            ? errorMessage
            : 'Press the button below to write to NFC.'}
        </Typography>
        <Input
          value={getURL()}
          fullWidth
          readOnly
          label='URL'
          sx={{ mt: 1 }}
          endDecorator={
            <CopyAll
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                navigator.clipboard.writeText(getURL())
                alert('URL copied to clipboard!')
              }}
            />
          }
        />
        <ListItem>
          <Checkbox
            checked={isAutoCompleteWhenScan}
            onChange={e => setIsAutoCompleteWhenScan(e.target.checked)}
            label='Auto-complete when scanned'
          />
        </ListItem>
        <Box display='flex' justifyContent='space-around' mt={1}>
          <Button
            size='lg'
            onClick={writeToNFC}
            fullWidth
            disabled={nfcStatus === 'writing'}
          >
            Write NFC
          </Button>
        </Box>
      </>
    )
  }

  return (
    <ResponsiveModal open={config?.isOpen} onClose={handleClose}>
      <Typography level='h4' mb={1}>
        {nfcStatus === 'success' ? 'Success!' : 'Write to NFC'}
      </Typography>
      {renderBody()}
    </ResponsiveModal>
  )
}

export default WriteNFCModal
