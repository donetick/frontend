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
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { CreateBackup, RestoreBackup } from '../../../utils/Fetcher'

function BackupRestoreModal({ isOpen, onClose, showNotification }) {
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
      setError('Encryption key is required')
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
          message: 'Backup created and downloaded successfully',
        })

        handleClose()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create backup')
      }
    } catch (err) {
      setError('Failed to create backup')
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
      setError('Encryption key is required')
      return
    }

    if (!backupFile) {
      setError('Please select a backup file')
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
              message: 'Backup restored successfully. Please refresh the page.',
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
          setError('Failed to restore backup')
        } finally {
          setLoading(false)
        }
      }

      reader.onerror = () => {
        setError('Failed to read backup file')
        setLoading(false)
      }

      reader.readAsText(backupFile)
    } catch (err) {
      setError('Failed to restore backup')
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
        Create an encrypted backup of your data. This backup will include all
        your chores, history, settings, and optionally your uploaded files.
      </Typography>

      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Encryption Key *</FormLabel>
        <Input
          type='password'
          value={encryptionKey}
          onChange={e => setEncryptionKey(e.target.value)}
          placeholder='Enter a strong encryption key'
        />
        <Typography level='body-xs' sx={{ mt: 0.5 }}>
          Keep this key safe - you'll need it to restore your backup
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
          label='Include uploaded files and assets'
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' gap={2}>
        <Button size='lg' variant='outlined' onClick={handleClose} fullWidth>
          Cancel
        </Button>
        <Button
          size='lg'
          color='primary'
          onClick={handleCreateBackup}
          loading={loading}
          disabled={!encryptionKey.trim()}
          fullWidth
        >
          Create Backup
        </Button>
      </Box>
    </Box>
  )

  const renderRestoreTab = () => (
    <Box>
      <Typography level='body-md' mb={3} color='warning'>
        <strong>Warning:</strong> Restoring a backup will replace all your
        current data. This action cannot be undone.
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
          placeholder='Enter the encryption key used for this backup'
        />
      </FormControl>

      {error && (
        <Typography level='body-sm' color='danger' mb={2}>
          {error}
        </Typography>
      )}

      <Box display='flex' justifyContent='space-between' gap={2}>
        <Button size='lg' variant='outlined' onClick={handleClose} fullWidth>
          Cancel
        </Button>
        <Button
          size='lg'
          color='warning'
          onClick={handleRestore}
          loading={loading}
          disabled={!restoreEncryptionKey.trim() || !backupFile}
          fullWidth
        >
          Restore Backup
        </Button>
      </Box>
    </Box>
  )

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={handleClose}
      size='md'
      unmountDelay={250}
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
        <>
          <Typography level='h4' mb={3}>
            🔄 Backup & Restore
          </Typography>

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
        </>
      )}
    </ResponsiveModal>
  )
}

export default BackupRestoreModal
