import {
  Box,
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

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { CreateBackup, RestoreBackup } from '../../../utils/Fetcher'

function BackupRestoreModal({ isOpen, onClose, showNotification }) {
  const { t } = useTranslation('settings')
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
      setError(t('backup.keyRequired'))
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
          message: t('backup.created'),
        })

        handleClose()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create backup')
      }
    } catch (err) {
      setError(t('backup.createFailed'))
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
      setError(t('backup.keyRequired'))
      return
    }

    if (!backupFile) {
      setError(t('backup.selectFile'))
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
            showNotification({
              type: 'success',
              message: t('backup.restored'),
            })

            // Refresh the page after a short delay to allow user to see the message
            setTimeout(() => {
              window.location.reload()
            }, 2000)

            handleClose()
          } else {
            const errorData = await response.json()
            setError(errorData.message || 'Failed to restore backup')
          }
        } catch (err) {
          setError(t('backup.restoreFailed'))
        } finally {
          setLoading(false)
        }
      }

      reader.onerror = () => {
        setError(t('backup.readFailed'))
        setLoading(false)
      }

      reader.readAsText(backupFile)
    } catch (err) {
      setError(t('backup.restoreFailed'))
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
        {t('backup.createIntro')}
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Encryption Key *</FormLabel>
        <Input
          type='password'
          value={encryptionKey}
          onChange={e => setEncryptionKey(e.target.value)}
          placeholder={t('backup.keyPlaceholder')}
        />
        <Typography level='body-xs' sx={{ mt: 0.5 }}>
          Keep this key safe—you&apos;ll need it to restore your backup
        </Typography>
      </FormControl>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Backup Name (Optional)</FormLabel>
        <Input
          value={backupName}
          onChange={e => setBackupName(e.target.value)}
          placeholder='e.g., weekly-backup'
        />
      </FormControl>

      <FormControl sx={{ mb: 3 }}>
        <Checkbox
          checked={includeAssets}
          onChange={e => setIncludeAssets(e.target.checked)}
          label={t('backup.includeAssets')}
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}
    </Box>
  )

  const renderRestoreTab = () => (
    <Box>
      <Typography level='body-md' mb={3} color='warning'>
        <strong>{t('backup.warningLabel')}</strong> {t('backup.restoreWarning')}
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Backup File *</FormLabel>
        <Input
          type='file'
          accept='.backup'
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
        {backupFile && (
          <Typography level='body-xs' sx={{ mt: 0.5 }}>
            Selected: {backupFile.name}
          </Typography>
        )}
      </FormControl>

      <FormControl sx={{ mb: 3 }}>
        <FormLabel>Encryption Key *</FormLabel>
        <Input
          type='password'
          value={restoreEncryptionKey}
          onChange={e => setRestoreEncryptionKey(e.target.value)}
          placeholder={t('backup.restoreKeyPlaceholder')}
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}
    </Box>
  )

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={handleClose}
      size='lg'
      fullWidth={true}
      unmountDelay={250}
      title='Backup & Restore'
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <ModalActions
          secondary={{
            label: t('accountSettings.cancel'),
            onClick: handleClose,
            disabled: loading,
          }}
          primary={{
            label: activeTab === 0 ? 'Create Backup' : 'Restore Backup',
            color: activeTab === 0 ? 'primary' : 'warning',
            onClick: activeTab === 0 ? handleCreateBackup : handleRestore,
            loading,
            disabled:
              activeTab === 0
                ? !encryptionKey.trim()
                : !restoreEncryptionKey.trim() || !backupFile,
          }}
        />
      }
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
            {activeTab === 0 ? 'Creating backup...' : 'Restoring backup...'}
          </Typography>
        </Box>
      ) : (
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
        >
          <TabList>
            <Tab>Create Backup</Tab>
            <Tab>Restore Backup</Tab>
          </TabList>

          <TabPanel value={0}>{renderBackupTab()}</TabPanel>

          <TabPanel value={1}>{renderRestoreTab()}</TabPanel>
        </Tabs>
      )}
    </ResponsiveModal>
  )
}

export default BackupRestoreModal
