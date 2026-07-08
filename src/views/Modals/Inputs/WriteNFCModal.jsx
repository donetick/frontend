import { CopyAll } from '@mui/icons-material'
import { Box, Button, Checkbox, Input, ListItem, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function WriteNFCModal({ config }) {
  const { t } = useTranslation(['chores', 'common'])
  const { ResponsiveModal } = useResponsiveModal()

  const [nfcStatus, setNfcStatus] = useState('idle') // 'idle', 'writing', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [isAutoCompleteWhenScan, setIsAutoCompleteWhenScan] = useState(false)

  const requestNFCAccess = async () => {
    if ('NDEFReader' in window) {
      // Assuming permission request is implicit in 'write' or 'scan' methods
      setNfcStatus('idle')
    } else {
      alert(t('chores:nfc.unsupportedAlert'))
    }
  }

  const writeToNFC = async url => {
    if ('NDEFReader' in window) {
      try {
        const ndef = new window.NDEFReader()
        await ndef.write({
          records: [{ recordType: 'url', data: url }],
        })
        setNfcStatus('success')
      } catch (error) {
        console.error('Error writing to NFC tag:', error)
        setNfcStatus('error')
        setErrorMessage(t('chores:nfc.writeError'))
      }
    } else {
      setNfcStatus('error')
      setErrorMessage(t('chores:nfc.unsupportedMessage'))
    }
  }

  const handleClose = () => {
    config.onClose()
    setNfcStatus('idle')
    setErrorMessage('')
  }
  const getURL = () => {
    let url = config.url
    if (isAutoCompleteWhenScan) {
      url = url + '?auto_complete=true'
    }

    return url
  }
  return (
    <ResponsiveModal open={config?.isOpen} onClose={handleClose}>
      <Typography level='h4' mb={1}>
        {nfcStatus === 'success'
          ? t('chores:nfc.successTitle')
          : t('chores:actions.writeToNfc')}
      </Typography>

      {nfcStatus === 'success' ? (
        <Typography level='body-md' gutterBottom>
          {t('chores:nfc.successMessage')}
        </Typography>
      ) : (
        <>
          <Typography level='body-md' gutterBottom>
            {nfcStatus === 'error'
              ? errorMessage
              : t('chores:nfc.instructions')}
          </Typography>
          <Input
            value={getURL()}
            fullWidth
            readOnly
            label={t('common:labels.url')}
            sx={{ mt: 1 }}
            endDecorator={
              <CopyAll
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard.writeText(getURL())
                  alert(t('chores:nfc.urlCopied'))
                }}
              />
            }
          />
          <ListItem>
            <Checkbox
              checked={isAutoCompleteWhenScan}
              onChange={e => setIsAutoCompleteWhenScan(e.target.checked)}
              label={t('chores:nfc.autoCompleteWhenScanned')}
            />
          </ListItem>
          <Box display={'flex'} justifyContent={'space-around'} mt={1}>
            <Button
              size='lg'
              onClick={() => writeToNFC(getURL())}
              fullWidth
              sx={{ mr: 1 }}
              disabled={nfcStatus === 'writing'}
            >
              {t('chores:nfc.writeButton')}
            </Button>
            <Button size='lg' onClick={requestNFCAccess} variant='outlined'>
              {t('chores:nfc.requestAccess')}
            </Button>
          </Box>
        </>
      )}
    </ResponsiveModal>
  )
}

export default WriteNFCModal
