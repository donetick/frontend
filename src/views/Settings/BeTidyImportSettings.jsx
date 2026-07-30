import { CloudUpload } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Link,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from '../../service/NotificationProvider'
import { ImportBeTidy } from '../../utils/Fetcher'
import SettingsLayout from './SettingsLayout'

const guessTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const BeTidyImportSettings = () => {
  const { t } = useTranslation('settings')
  const { showNotification } = useNotification()

  const [bundle, setBundle] = useState(null)
  const [fileName, setFileName] = useState('')
  const [taskCount, setTaskCount] = useState(0)
  const [timezone, setTimezone] = useState(guessTimezone())
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFile = event => {
    const file = event.target.files?.[0]
    if (!file) return
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result)
        if (!parsed || !Array.isArray(parsed.tasks)) {
          throw new Error('missing tasks')
        }
        setBundle(parsed)
        setFileName(file.name)
        setTaskCount(parsed.tasks.length)
      } catch {
        setBundle(null)
        setFileName('')
        setTaskCount(0)
        showNotification({
          type: 'error',
          title: t('betidyImport.invalidFile'),
          message: t('betidyImport.invalidFileHint'),
        })
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!bundle) return
    setLoading(true)
    setResult(null)
    try {
      const response = await ImportBeTidy({
        ...bundle,
        timezone,
        includeInactive,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      const res = data.res || data
      setResult(res)
      showNotification({
        type: 'success',
        title: t('betidyImport.successTitle'),
        message: t('betidyImport.successMessage', { count: res.imported }),
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: t('betidyImport.errorTitle'),
        message: String(error?.message || error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsLayout title={t('betidyImport.title')}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('betidyImport.description')}{' '}
          <Link
            href='https://github.com/mschabhuettl/betidy-export'
            target='_blank'
            rel='noreferrer'
          >
            betidy-export
          </Link>
          .
        </Typography>

        <Card variant='outlined' sx={{ gap: 2 }}>
          <FormControl>
            <FormLabel>{t('betidyImport.fileLabel')}</FormLabel>
            <Button
              component='label'
              variant='outlined'
              color='neutral'
              startDecorator={<CloudUpload />}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('betidyImport.chooseFile')}
              <input
                type='file'
                accept='application/json,.json'
                hidden
                onChange={handleFile}
              />
            </Button>
            {fileName && (
              <Typography level='body-sm' sx={{ mt: 1 }}>
                {fileName}{' '}
                <Chip size='sm' color='primary' variant='soft'>
                  {t('betidyImport.taskCount', { count: taskCount })}
                </Chip>
              </Typography>
            )}
          </FormControl>

          <Divider />

          <FormControl>
            <FormLabel>{t('betidyImport.timezone')}</FormLabel>
            <Input
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              placeholder='UTC'
              sx={{ maxWidth: 320 }}
            />
          </FormControl>

          <Checkbox
            label={t('betidyImport.includeInactive')}
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
          />

          <Button
            onClick={handleImport}
            loading={loading}
            disabled={!bundle || loading}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('betidyImport.import')}
          </Button>
        </Card>

        {result && (
          <Alert color='success' variant='soft'>
            <Box>
              <Typography level='title-sm'>
                {t('betidyImport.resultTitle')}
              </Typography>
              <Typography level='body-sm'>
                {t('betidyImport.resultSummary', {
                  imported: result.imported,
                  skipped: result.skipped,
                  labels: result.labelsCreated,
                })}
              </Typography>
              {Array.isArray(result.errors) && result.errors.length > 0 && (
                <Typography
                  level='body-xs'
                  sx={{ mt: 1, color: 'warning.plainColor' }}
                >
                  {result.errors.length} {t('betidyImport.errorsSuffix')}
                </Typography>
              )}
            </Box>
          </Alert>
        )}
      </Box>
    </SettingsLayout>
  )
}

export default BeTidyImportSettings
