import {
  CloudDownload,
  CloudSync,
  CloudUpload,
  Warning,
} from '@mui/icons-material'
import { Alert, Box, Button, Card, Chip, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { downloadBackup, importBackup } from '../../data/backup'
import {
  requestPersistentStorage,
  resetLocalStoreReady,
  storageDiagnostics,
} from '../../data/health'
import { useCapabilities } from '../../hooks/useCapabilities'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import SettingsLayout from './SettingsLayout'

const formatBytes = bytes => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Backup and restore for the on-device database.
 *
 * In local-only mode this file is the user's only copy of their data, so the
 * screen leads with export and treats import as the destructive operation it
 * is — a confirmation, and an explicit note that restoring replaces everything.
 */
const BackupSettings = () => {
  const queryClient = useQueryClient()
  const { isLocal } = useCapabilities()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [diagnostics, setDiagnostics] = useState(null)
  const [status, setStatus] = useState(null)
  const [pendingImport, setPendingImport] = useState(null)

  const refreshDiagnostics = () => {
    storageDiagnostics()
      .then(setDiagnostics)
      .catch(() => setDiagnostics(null))
  }

  useEffect(refreshDiagnostics, [])

  const handleExport = async () => {
    try {
      await downloadBackup()
      setStatus({ level: 'success', message: 'Backup downloaded.' })
    } catch (error) {
      setStatus({ level: 'danger', message: `Export failed: ${error.message}` })
    }
  }

  const handleFilePicked = async event => {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice still fires a change event.
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      setPendingImport({ text, name: file.name })
    } catch (error) {
      setStatus({
        level: 'danger',
        message: `Could not read that file: ${error.message}`,
      })
    }
  }

  const runImport = async () => {
    const payload = pendingImport
    setPendingImport(null)
    if (!payload) return

    try {
      const { restored } = await importBackup(payload.text, { mode: 'replace' })
      const total = Object.values(restored).reduce((sum, n) => sum + n, 0)

      resetLocalStoreReady()
      // Every list in the app is now stale.
      queryClient.invalidateQueries()
      refreshDiagnostics()

      setStatus({
        level: 'success',
        message: `Restored ${total} item${total === 1 ? '' : 's'} from ${payload.name}.`,
      })
    } catch (error) {
      setStatus({ level: 'danger', message: error.message })
    }
  }

  return (
    <SettingsLayout title='Backup & restore'>
      <Box className='grid gap-4 py-4' id='backup'>
        {isLocal && (
          <Card sx={{ maxWidth: 560, p: 2 }}>
            <Typography level='title-md'>Back up & sync</Typography>
            <Typography
              level='body-sm'
              sx={{ color: 'text.secondary', mb: 1.5 }}
            >
              Create an account and everything on this device — tasks, labels,
              projects and history — moves with you. Nothing is deleted from
              this device until it&apos;s confirmed on the server.
            </Typography>
            <Button
              startDecorator={<CloudSync />}
              onClick={() => navigate('/signup')}
              sx={{ alignSelf: 'flex-start' }}
            >
              Sign up or sign in
            </Button>
          </Card>
        )}

        <Card sx={{ maxWidth: 560, p: 2 }}>
          <Typography level='title-md'>Export a backup</Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 1.5 }}>
            {isLocal
              ? 'Your tasks live only on this device. Download a copy you can keep somewhere safe.'
              : 'Download a JSON copy of the data stored on this device.'}
          </Typography>
          <Button
            startDecorator={<CloudDownload />}
            onClick={handleExport}
            sx={{ alignSelf: 'flex-start' }}
          >
            Download backup
          </Button>
        </Card>

        <Card sx={{ maxWidth: 560, p: 2 }}>
          <Typography level='title-md'>Restore from a backup</Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 1.5 }}>
            Restoring replaces everything currently on this device. Export first
            if you are not sure.
          </Typography>
          <input
            ref={fileInputRef}
            type='file'
            accept='application/json,.json'
            onChange={handleFilePicked}
            style={{ display: 'none' }}
          />
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Choose a backup file
          </Button>
        </Card>

        {diagnostics && (
          <Card sx={{ maxWidth: 560, p: 2 }}>
            <Typography level='title-md' sx={{ mb: 1 }}>
              On this device
            </Typography>
            <Box sx={{ display: 'grid', gap: 0.5 }}>
              {Object.entries(diagnostics.collections ?? {}).map(
                ([name, counts]) => (
                  <Typography key={name} level='body-sm'>
                    {name}: {counts.live} live
                    {counts.total !== counts.live &&
                      ` (${counts.total - counts.live} deleted)`}
                  </Typography>
                ),
              )}
              <Typography level='body-sm' sx={{ mt: 1 }}>
                Stored data: {formatBytes(diagnostics.bytes)}
                {diagnostics.quota
                  ? ` of ${formatBytes(diagnostics.quota)} available`
                  : ''}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  size='sm'
                  variant='soft'
                  color={diagnostics.persisted ? 'success' : 'neutral'}
                >
                  {diagnostics.persisted
                    ? 'Storage is protected from eviction'
                    : 'Storage is not protected'}
                </Chip>
              </Box>
              {diagnostics.persisted === false && (
                <Button
                  size='sm'
                  variant='plain'
                  sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                  onClick={async () => {
                    await requestPersistentStorage()
                    refreshDiagnostics()
                  }}
                >
                  Ask the browser to protect it
                </Button>
              )}
            </Box>
          </Card>
        )}

        {diagnostics?.nearQuota && (
          <Alert
            color='warning'
            startDecorator={<Warning />}
            sx={{ maxWidth: 560 }}
          >
            This device is close to its storage limit. Export a backup now.
          </Alert>
        )}

        {status && (
          <Alert color={status.level} sx={{ maxWidth: 560 }}>
            {status.message}
          </Alert>
        )}
      </Box>

      <ConfirmationModal
        config={{
          isOpen: Boolean(pendingImport),
          title: 'Replace everything on this device?',
          message: `Restoring ${pendingImport?.name ?? 'this backup'} will remove the tasks, labels, projects and history currently stored here.`,
          confirmText: 'Restore',
          cancelText: 'Cancel',
          color: 'danger',
          onClose: confirmed => {
            if (confirmed) runImport()
            else setPendingImport(null)
          },
        }}
      />
    </SettingsLayout>
  )
}

export default BackupSettings
