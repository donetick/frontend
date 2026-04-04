import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormLabel,
  Input,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { CreateBackup, RestoreBackup } from '../../../utils/Fetcher'

function BackupRestoreModal({ isOpen, onClose, showNotification }) {
  const { t } = useTranslation(['settings', 'common'])
  const { ResponsiveModal } = useResponsiveModal()

  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Backup state
  const [encryptionKey, setEncryptionKey] = useState('')
  const [backupName, setBackupName] = useState('')
  const [includeAssets, setIncludeAssets] = useState(true)

  // Restore state
  const [restoreEncryptionKey, setRestoreEncryptionKey] = useState('')
  const [backupFile, setBackupFile] = useState(null)
  const fileInputRef = useRef(null)

  const resetModal = useCallback(() => {
    setActiveTab(0)
    setEncryptionKey('')
    setBackupName('')
    setIncludeAssets(true)
    setRestoreEncryptionKey('')
    setBackupFile(null)
    setError('')
    setLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleClose = useCallback(() => {
    resetModal()
    onClose()
  }, [onClose, resetModal])

  const downloadFile = (data, filename) => {
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleCreateBackup = async () => {
    if (!encryptionKey.trim()) {
      setError(t('settings:backup.encryptionKeyRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await CreateBackup(
        encryptionKey,
        includeAssets,
        backupName,
      )

      if (response.ok) {
        const data = await response.json()
        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, '-')
        const filename = backupName
          ? `${backupName}-${timestamp}.backup`
          : `donetick-backup-${timestamp}.backup`

        // Download the backup file
        downloadFile(data.backup_data, filename)

        showNotification({
          type: 'success',
          message: t('settings:backup.created'),
        })

        handleClose()
      } else {
        const errorData = await response.json()
        setError(errorData.message || t('settings:backup.createFailed'))
      }
    } catch (err) {
      setError(t('settings:backup.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = event => {
    const file = event.target.files[0]
    if (file) {
      setBackupFile(file)
      setError('')
    }
  }

  const handleRestore = async () => {
    if (!restoreEncryptionKey.trim()) {
      setError(t('settings:backup.encryptionKeyRequired'))
      return
    }

    if (!backupFile) {
      setError(t('settings:backup.selectFile'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async e => {
        try {
          const backupData = e.target.result
          const response = await RestoreBackup(restoreEncryptionKey, backupData)

          if (response.ok) {
            const data = await response.json()
            showNotification({
              type: 'success',
              message: t('settings:backup.restored'),
            })

            // Refresh the page after a short delay to allow user to see the message
            setTimeout(() => {
              window.location.reload()
            }, 2000)

            handleClose()
          } else {
            const errorData = await response.json()
            setError(errorData.message || t('settings:backup.restoreFailed'))
          }
        } catch (err) {
          setError(t('settings:backup.restoreFailed'))
        } finally {
          setLoading(false)
        }
      }

      reader.onerror = () => {
        setError(t('settings:backup.readFailed'))
        setLoading(false)
      }

      reader.readAsText(backupFile)
    } catch (err) {
      setError(t('settings:backup.restoreFailed'))
      setLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = event => {
      if (!isOpen) return

      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  const renderBackupTab = () => (
    <Box>
      <Typography level='body-md' mb={3}>
        {t('settings:backup.createDescription')}
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>{t('settings:backup.encryptionKeyLabel')}</FormLabel>
        <Input
          type='password'
          value={encryptionKey}
          onChange={e => setEncryptionKey(e.target.value)}
          placeholder={t('settings:backup.encryptionKeyPlaceholder')}
        />
        <Typography level='body-xs' sx={{ mt: 0.5 }}>
          {t('settings:backup.encryptionKeyHint')}
        </Typography>
      </FormControl>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>{t('settings:backup.nameLabel')}</FormLabel>
        <Input
          value={backupName}
          onChange={e => setBackupName(e.target.value)}
          placeholder={t('settings:backup.namePlaceholder')}
        />
      </FormControl>

      <FormControl sx={{ mb: 3 }}>
        <Checkbox
          checked={includeAssets}
          onChange={e => setIncludeAssets(e.target.checked)}
          label={t('settings:backup.includeAssets')}
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' gap={2}>
        <Button size='lg' variant='outlined' onClick={handleClose} fullWidth>
          {t('common:actions.cancel')}
        </Button>
        <Button
          size='lg'
          color='primary'
          onClick={handleCreateBackup}
          loading={loading}
          disabled={!encryptionKey.trim()}
          fullWidth
        >
          {t('settings:backup.createAction')}
        </Button>
      </Box>
    </Box>
  )

  const renderRestoreTab = () => (
    <Box>
      <Typography level='body-md' mb={3} color='warning'>
        <strong>{t('common:notifications.titles.warning')}:</strong>{' '}
        {t('settings:backup.restoreWarning')}
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>{t('settings:backup.fileLabel')}</FormLabel>
        <Input
          type='file'
          accept='.backup'
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
        {backupFile && (
          <Typography level='body-xs' sx={{ mt: 0.5 }}>
            {t('settings:backup.selectedFile', { name: backupFile.name })}
          </Typography>
        )}
      </FormControl>

      <FormControl sx={{ mb: 3 }}>
        <FormLabel>{t('settings:backup.encryptionKeyLabel')}</FormLabel>
        <Input
          type='password'
          value={restoreEncryptionKey}
          onChange={e => setRestoreEncryptionKey(e.target.value)}
          placeholder={t('settings:backup.restoreKeyPlaceholder')}
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' gap={2}>
        <Button size='lg' variant='outlined' onClick={handleClose} fullWidth>
          {t('common:actions.cancel')}
        </Button>
        <Button
          size='lg'
          color='warning'
          onClick={handleRestore}
          loading={loading}
          disabled={!restoreEncryptionKey.trim() || !backupFile}
          fullWidth
        >
          {t('settings:backup.restoreAction')}
        </Button>
      </Box>
    </Box>
  )

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={handleClose}
      size='lg'
      fullWidth={true}
      unmountDelay={250}
      title={t('settings:backup.title')}
    >
      {loading ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight={200}
        >
          <CircularProgress />
          <Typography level='body-md' sx={{ ml: 2 }}>
            {activeTab === 0
              ? t('settings:backup.creating')
              : t('settings:backup.restoring')}
          </Typography>
        </Box>
      ) : (
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
        >
          <TabList>
            <Tab>{t('settings:backup.createTab')}</Tab>
            <Tab>{t('settings:backup.restoreTab')}</Tab>
          </TabList>

          <TabPanel value={0}>{renderBackupTab()}</TabPanel>

          <TabPanel value={1}>{renderRestoreTab()}</TabPanel>
        </Tabs>
      )}
    </ResponsiveModal>
  )
}

export default BackupRestoreModal
