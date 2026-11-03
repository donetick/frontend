import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Option,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCreateChore } from '../../queries/ChoreQueries'
import { CreateLabel, GetLabels } from '../../utils/Fetcher'
import { buildImportPayload } from '../../utils/taskImport/buildImportPayload'
import { createImportTasks } from '../../utils/taskImport/createImportTasks'
import {
  MAX_IMPORT_BYTES,
  parseTaskImport,
  resolveImportLabels,
} from '../../utils/taskImport/parseTaskImport'

const EXAMPLE_TEMPLATE = `format: donetick
version: 1
labels: [Home]
tasks:
  - title: Clean kitchen
    description: Wipe counters and clean the sink.
    priority: P2
    subtasks:
      - Wipe counters
      - Clean sink
    repeat: every week
    labels: [Home, Cleaning]
  - title: Replace air filter
    repeat: every 3 months
    due: "2026-08-01"
    labels: [Maintenance]
  - title: Take out recycling
    repeat: every monday and thursday
    labels: [Home]
`

export default function BulkTaskImport({
  labels,
  onBusyChange,
  onChoreUpdate,
  onClose,
  projectId,
  sectionId,
  userProfile,
}) {
  const { t } = useTranslation('chores')
  const mutation = useCreateChore()
  const queryClient = useQueryClient()
  const [format, setFormat] = useState('template')
  const [text, setText] = useState('')
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [createMissing, setCreateMissing] = useState(false)
  const [results, setResults] = useState({})
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const fileInput = useRef(null)
  const successful = useRef(new Set())
  const [labelMap, setLabelMap] = useState({})
  const completed = Object.values(results).filter(result => result.ok).length
  let resolution = { missing: [], resolved: new Map() }
  let labelError = ''
  if (review) {
    try {
      resolution = resolveImportLabels(review.tasks, labels)
    } catch (cause) {
      labelError = cause.message
    }
  }

  const preview = () => {
    setReview(parseTaskImport(text, { format }))
    setResults({})
    setError('')
    setLabelMap({})
  }

  const readFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error(t('bulkImport.tooLarge'))
      setText(await file.text())
      setReview(null)
      setError('')
    } catch (cause) {
      setError(cause.message)
    }
    event.target.value = ''
  }

  const importTasks = async () => {
    if (running.current) return
    running.current = true
    setBusy(true)
    onBusyChange(true)
    setError('')
    // Snapshot the destination and draft list for this attempt.
    const context = { userId: userProfile?.id, projectId, sectionId }
    try {
      const readLabels = data => {
        if (Array.isArray(data?.res)) return data.res
        if (Array.isArray(data)) return data
        throw new Error(t('bulkImport.labelsUnavailable'))
      }
      let availableLabels = labels
      if (createMissing && resolution.missing.length) {
        // Re-read to avoid creating labels again after a partially failed run.
        const data = await GetLabels()
        availableLabels = readLabels(data)
        const { missing } = resolveImportLabels(review.tasks, availableLabels)
        for (const name of missing.filter(name => !labelMap[name])) {
          const response = await CreateLabel({ name, color: '#9CA3AF' })
          if (!response?.ok)
            throw new Error(t('bulkImport.labelFailed', { name }))
        }
        const refreshed = await GetLabels()
        availableLabels = readLabels(refreshed)
        await queryClient.invalidateQueries({ queryKey: ['labels'] })
      }
      const { missing, resolved } = resolveImportLabels(
        review.tasks,
        availableLabels,
      )
      for (const name of missing) {
        const target = labelMap[name]
        if (target === 'skip') resolved.set(name, null)
        else if (
          target &&
          availableLabels.some(label => String(label.id) === target)
        )
          resolved.set(
            name,
            availableLabels.find(label => String(label.id) === target).id,
          )
        else throw new Error(t('bulkImport.resolveLabels'))
      }
      await createImportTasks({
        tasks: review.tasks,
        successful: successful.current,
        buildPayload: task =>
          buildImportPayload(task, {
            ...context,
            labelIds: [
              ...new Set(
                task.labels
                  .map(name => resolved.get(name))
                  .filter(id => id !== null && id !== undefined),
              ),
            ],
          }),
        create: payload => mutation.mutateAsync(payload),
        onResult: (key, result) =>
          setResults(previous => ({ ...previous, [key]: result })),
        onCreated: onChoreUpdate,
      })
    } catch (cause) {
      setError(cause.message)
    } finally {
      running.current = false
      setBusy(false)
      onBusyChange(false)
    }
  }

  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Typography level='title-lg'>{t('bulkImport.title')}</Typography>
      <Typography level='body-sm'>{t('bulkImport.hint')}</Typography>
      {!review && (
        <>
          <Select
            value={format}
            onChange={(_, value) => setFormat(value)}
            aria-label={t('bulkImport.format')}
          >
            <Option value='template'>{t('bulkImport.template')}</Option>
            <Option value='lines'>{t('bulkImport.lines')}</Option>
          </Select>
          <Textarea
            minRows={10}
            maxRows={18}
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder={
              format === 'template'
                ? EXAMPLE_TEMPLATE
                : 'Clean kitchen\nTake out recycling'
            }
            slotProps={{ textarea: { 'aria-label': t('bulkImport.input') } }}
          />
          <input
            hidden
            ref={fileInput}
            type='file'
            accept='.yaml,.yml,.json,.txt,text/plain,application/json'
            onChange={readFile}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant='outlined'
              onClick={() => fileInput.current?.click()}
            >
              {t('bulkImport.upload')}
            </Button>
            <Button
              variant='plain'
              onClick={() => {
                setFormat('template')
                setText(EXAMPLE_TEMPLATE)
              }}
            >
              {t('bulkImport.example')}
            </Button>
            <Button onClick={preview} disabled={!text.trim()}>
              {t('bulkImport.preview')}
            </Button>
          </Box>
        </>
      )}
      {error && <Alert color='danger'>{error}</Alert>}
      {review && (
        <>
          {review.errors.map((issue, index) => (
            <Alert color='danger' key={index}>
              {issue.row
                ? t('bulkImport.rowError', {
                    row: issue.row,
                    message: issue.message,
                  })
                : issue.message}
            </Alert>
          ))}
          {labelError && <Alert color='danger'>{labelError}</Alert>}
          <Typography level='body-sm'>{t('bulkImport.defaults')}</Typography>
          {resolution.missing.length > 0 && (
            <>
              <Checkbox
                label={t('bulkImport.createLabels')}
                checked={createMissing}
                disabled={busy || completed > 0}
                onChange={event => setCreateMissing(event.target.checked)}
              />
              {resolution.missing.map(name => (
                <FormControl key={name}>
                  <FormLabel>{name}</FormLabel>
                  <Select
                    value={labelMap[name] || ''}
                    placeholder={
                      createMissing
                        ? t('bulkImport.willCreate')
                        : t('bulkImport.mapLabel')
                    }
                    disabled={busy || completed > 0}
                    onChange={(_, value) =>
                      setLabelMap(previous => ({ ...previous, [name]: value }))
                    }
                  >
                    <Option value=''>{t('bulkImport.unmapped')}</Option>
                    <Option value='skip'>{t('bulkImport.skipLabel')}</Option>
                    {labels.map(label => (
                      <Option key={label.id} value={String(label.id)}>
                        {label.name}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </>
          )}
          <Stack spacing={1} sx={{ maxHeight: 360, overflow: 'auto' }}>
            {review.tasks.map(task => (
              <Box
                key={task.key}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 'sm',
                  p: 1.5,
                }}
              >
                <Typography level='title-sm'>{task.title}</Typography>
                {task.description && (
                  <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap' }}>
                    {task.description}
                  </Typography>
                )}
                <Typography level='body-sm'>
                  {[
                    task.priority > 0 && `P${task.priority}`,
                    task.repeatName,
                    task.dueDate && new Date(task.dueDate).toLocaleString(),
                    task.labels.join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
                {task.subtasks.length > 0 && (
                  <Box component='ul' sx={{ my: 1, pl: 3 }}>
                    {task.subtasks.map((title, index) => (
                      <Typography component='li' level='body-sm' key={index}>
                        {title}
                      </Typography>
                    ))}
                  </Box>
                )}
                {results[task.key] && (
                  <Typography
                    level='body-sm'
                    color={results[task.key].ok ? 'success' : 'danger'}
                  >
                    {results[task.key].ok
                      ? t(
                          results[task.key].queued
                            ? 'bulkImport.queued'
                            : 'bulkImport.created',
                        )
                      : results[task.key].message}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
          {Object.values(results).some(result => !result.ok) && (
            <Alert color='warning'>{t('bulkImport.retryWarning')}</Alert>
          )}
          <Typography level='body-sm'>
            {t('bulkImport.progress', {
              completed,
              count: review.tasks.length,
            })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!completed && (
              <Button
                variant='outlined'
                disabled={busy}
                onClick={() => {
                  setReview(null)
                  successful.current.clear()
                }}
              >
                {t('bulkImport.edit')}
              </Button>
            )}
            <Button
              loading={busy}
              disabled={
                !userProfile?.id ||
                review.errors.length > 0 ||
                Boolean(labelError) ||
                !review.tasks.length ||
                completed === review.tasks.length ||
                (!createMissing &&
                  resolution.missing.some(name => !labelMap[name]))
              }
              onClick={importTasks}
            >
              {t(
                Object.keys(results).length
                  ? 'bulkImport.retry'
                  : 'bulkImport.import',
              )}
            </Button>
          </Box>
        </>
      )}
      <Button variant='plain' disabled={busy} onClick={onClose}>
        {t('common:close')}
      </Button>
    </Stack>
  )
}

BulkTaskImport.propTypes = {
  labels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  userProfile: PropTypes.shape({ id: PropTypes.number }),
  projectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  sectionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onBusyChange: PropTypes.func.isRequired,
  onChoreUpdate: PropTypes.func,
  onClose: PropTypes.func.isRequired,
}
