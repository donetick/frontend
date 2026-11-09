import { ArrowBack, CheckCircleOutline } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  FormControl,
  FormLabel,
  LinearProgress,
  Option,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { useCreateChore } from '../../queries/ChoreQueries'
import { CreateLabel, GetLabels } from '../../utils/Fetcher'
import { buildImportPayload } from '../../utils/taskImport/buildImportPayload'
import { createImportTasks } from '../../utils/taskImport/createImportTasks'
import {
  applyItemAsLabel,
  canUseItemAsLabel,
} from '../../utils/taskImport/itemAsLabel'
import {
  MAX_IMPORT_BYTES,
  parseTaskImportDocument,
  resolveImportLabels,
  resolveTaskImport,
} from '../../utils/taskImport/parseTaskImport'
import LabelModal from '../Modals/Inputs/LabelModal'
import ImportAssignmentFields from './ImportAssignmentFields'
import ImportLabelFields from './ImportLabelFields'
import TemplateFlowSteps from './TemplateFlowSteps'
import TemplatePersonalization from './TemplatePersonalization'

const EXAMPLE_TEMPLATE = `format: donetick
version: 2
title: Robot vacuum maintenance
inputs:
  - name: vacuum
    label: Which vacuum?
labels: ["{{ vacuum }}", Maintenance]
tasks:
  - title: Clean the air filter of {{ vacuum }}
    description: Rinse the filter and let it dry fully.
    priority: P2
    subtasks:
      - Rinse the filter
      - Dry for 24 hours
    repeat: every month
  - title: Change the air filter of {{ vacuum }}
    repeat: every 6 months
  - title: Remove the dust bag of {{ vacuum }}
    repeat: every 2 weeks
`

const defaultValues = inputs =>
  Object.fromEntries(inputs.map(input => [input.name, input.default]))

export default function BulkTaskImport({
  configurationPending = false,
  destination,
  destinationSummary,
  footerContainer,
  initialTemplate,
  labels,
  members,
  onBack,
  onBusyChange,
  onChoreUpdate,
  onClose,
  onConfigurationLock,
  projectId,
  sectionId,
  userProfile,
}) {
  const { t } = useTranslation('chores')
  const mutation = useCreateChore()
  const queryClient = useQueryClient()
  const [format, setFormat] = useState('template')
  const [text, setText] = useState(initialTemplate ?? '')
  const [initialDocument] = useState(() =>
    initialTemplate ? parseTaskImportDocument(initialTemplate) : null,
  )
  const [template, setTemplate] = useState(initialDocument)
  const [instances, setInstances] = useState(() =>
    initialDocument?.inputs.length
      ? [defaultValues(initialDocument.inputs)]
      : [{}],
  )
  const [review, setReview] = useState(() =>
    initialDocument &&
    (initialDocument.errors.length || !initialDocument.inputs.length)
      ? resolveTaskImport(initialDocument)
      : null,
  )
  const [error, setError] = useState('')
  const [createMissing, setCreateMissing] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState(null)
  const [anyone, setAnyone] = useState(false)
  const [strategy, setStrategy] = useState('keep_last_assigned')
  const [initialAssignee, setInitialAssignee] = useState(null)
  const eligibleIds = members?.map(member => member.userId) ?? [userProfile?.id]
  const userIds = (selectedUserIds ?? [userProfile?.id]).filter(id =>
    eligibleIds.includes(id),
  )
  const assignedTo = userIds.includes(initialAssignee)
    ? initialAssignee
    : userIds[0]
  const assignmentInvalid = !anyone && !userIds.length
  const guided = Boolean(initialTemplate)
  const footer = content =>
    footerContainer ? createPortal(content, footerContainer) : content
  const [results, setResults] = useState({})
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const stageRef = useRef(null)
  const fileInput = useRef(null)
  const successful = useRef(new Set())
  const [labelMap, setLabelMap] = useState({})
  const [itemAsLabel, setItemAsLabel] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState([])
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false)
  const canLabelItem = guided && canUseItemAsLabel(template)
  const completed = Object.values(results).filter(result => result.ok).length
  const inputs = template?.inputs ?? []
  // Instances only exist for templates that declare inputs; everything else
  // resolves as a single unparameterised set.
  const collecting = Boolean(template) && !review && inputs.length > 0
  const grouped = inputs.length > 0 && instances.length > 1
  let resolution = { missing: [], resolved: new Map() }
  let labelError = ''
  if (review) {
    try {
      resolution = resolveImportLabels(review.tasks, labels)
    } catch (cause) {
      labelError = cause.message
    }
  }

  const setName = instance => {
    const value = String(instances[instance]?.[inputs[0]?.name] ?? '').trim()
    return value || t('bulkImport.set', { number: instance + 1 })
  }

  const readTemplate = () => {
    const parsed = parseTaskImportDocument(text, { format })
    setTemplate(parsed)
    setResults({})
    setError('')
    setLabelMap({})
    if (parsed.errors.length || !parsed.inputs.length) {
      setInstances([{}])
      setReview(resolveTaskImport(parsed))
      return
    }
    setInstances([defaultValues(parsed.inputs)])
    setReview(null)
  }

  const missingInputs = inputs.some(
    input =>
      input.required &&
      instances.some(values => !String(values[input.name] ?? '').trim()),
  )

  const preview = () => {
    if (missingInputs || assignmentInvalid || configurationPending) return
    const resolved = resolveTaskImport(template, { instances })
    setReview({
      ...resolved,
      tasks:
        canLabelItem && itemAsLabel
          ? applyItemAsLabel(resolved.tasks, instances)
          : resolved.tasks,
    })
    setResults({})
    setError('')
    setLabelMap({})
  }

  const setValue = (instance, name, value) =>
    setInstances(previous =>
      previous.map((values, index) =>
        index === instance ? { ...values, [name]: value } : values,
      ),
    )

  const readFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error(t('bulkImport.tooLarge'))
      setText(await file.text())
      setTemplate(null)
      setReview(null)
      setError('')
    } catch (cause) {
      setError(cause.message)
    }
    event.target.value = ''
  }

  const importTasks = async () => {
    if (running.current || assignmentInvalid || configurationPending) return
    running.current = true
    setBusy(true)
    onBusyChange(true)
    setError('')
    // Snapshot the destination and draft list for this attempt.
    const context = {
      userId: userProfile?.id,
      projectId,
      sectionId,
      assignment: { anyone, userIds, assignedTo, strategy },
    }
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
              ...new Set([
                ...task.labels
                  .map(name => resolved.get(name))
                  .filter(id => id !== null && id !== undefined),
                ...selectedLabels.map(label => label.id),
              ]),
            ],
          }),
        create: payload => mutation.mutateAsync(payload),
        onResult: (key, result) => {
          if (result.ok) onConfigurationLock?.(true)
          setResults(previous => ({ ...previous, [key]: result }))
        },
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

  const issueText = issue => {
    // Only name the set when more than one exists; a plain import reads better
    // without it.
    const set =
      grouped && issue.instance !== null ? setName(issue.instance) : null
    if (set && issue.row)
      return t('bulkImport.setRowError', {
        set,
        row: issue.row,
        message: issue.message,
      })
    if (set) return t('bulkImport.setError', { set, message: issue.message })
    if (issue.row)
      return t('bulkImport.rowError', {
        row: issue.row,
        message: issue.message,
      })
    return issue.message
  }

  const allDone =
    review?.tasks.length > 0 && completed === review.tasks.length && !busy
  const stage = allDone
    ? 'done'
    : review
      ? 'review'
      : template
        ? 'personalize'
        : 'source'
  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true })
    stageRef.current?.scrollIntoView({ block: 'start' })
  }, [stage])
  const queued = Object.values(results).some(result => result.queued)
  const assignmentSummary = anyone
    ? t('assignee.anyone')
    : userIds
        .map(
          id =>
            members?.find(member => member.userId === id)?.displayName ||
            members?.find(member => member.userId === id)?.username ||
            t('assignee.unknown'),
        )
        .join(', ')

  if (allDone) {
    return (
      <Stack
        spacing={2}
        ref={stageRef}
        tabIndex={-1}
        sx={{
          py: 4,
          textAlign: 'center',
          alignItems: 'center',
          outline: 'none',
        }}
        role='status'
      >
        <CheckCircleOutline color='success' sx={{ fontSize: 56 }} />
        <Typography level='h3'>
          {t(
            queued
              ? 'templateLibrary.queuedTitle'
              : 'templateLibrary.successTitle',
          )}
        </Typography>
        <Typography>
          {t(
            queued
              ? 'templateLibrary.queuedBody'
              : 'templateLibrary.successBody',
            { count: completed },
          )}
        </Typography>
        {destinationSummary && (
          <Typography level='body-sm' textColor='text.tertiary'>
            {destinationSummary}
          </Typography>
        )}
        {footer(
          <Button fullWidth onClick={onClose}>
            {t('templateLibrary.done')}
          </Button>,
        )}
      </Stack>
    )
  }

  return (
    <>
      <Stack
        ref={stageRef}
        tabIndex={-1}
        spacing={2.5}
        sx={{ outline: 'none' }}
      >
        {guided ? (
          <>
            <TemplateFlowSteps active={review ? 2 : 1} />
            <Box>
              <Typography level='h3'>
                {t(
                  review
                    ? 'templateLibrary.reviewTitle'
                    : 'templateLibrary.personalizeTitle',
                )}
              </Typography>
              <Typography level='body-sm' textColor='text.tertiary'>
                {t(
                  review
                    ? 'templateLibrary.reviewHint'
                    : 'templateLibrary.personalizeHint',
                )}
              </Typography>
            </Box>
          </>
        ) : (
          <Typography level='body-sm'>{t('bulkImport.hint')}</Typography>
        )}
        {!template && (
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
              <Button onClick={readTemplate} disabled={!text.trim()}>
                {t('bulkImport.continue')}
              </Button>
            </Box>
          </>
        )}
        {error && <Alert color='danger'>{error}</Alert>}
        {collecting && (
          <>
            <TemplatePersonalization
              guided={guided}
              instances={instances}
              template={template}
              onInstancesChange={setInstances}
              onValueChange={setValue}
              onScheduleChange={(index, repeat) =>
                setTemplate(previous => ({
                  ...previous,
                  rows: previous.rows.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, repeat } : row,
                  ),
                }))
              }
            >
              {destination}
              {members && (
                <ImportAssignmentFields
                  anyone={anyone}
                  assignedTo={assignedTo}
                  disabled={busy || completed > 0}
                  members={members}
                  userIds={userIds}
                  strategy={strategy}
                  onAnyoneChange={setAnyone}
                  onAssignedToChange={setInitialAssignee}
                  onUserIdsChange={setSelectedUserIds}
                  onStrategyChange={setStrategy}
                />
              )}
              <ImportLabelFields
                disabled={busy || completed > 0}
                itemAsLabel={itemAsLabel}
                showItemAsLabel={canLabelItem}
                onItemAsLabelChange={setItemAsLabel}
                labels={labels}
                selected={selectedLabels}
                onChange={setSelectedLabels}
                onAddNew={() => setAddLabelModalOpen(true)}
              />
            </TemplatePersonalization>
            {!guided && (
              <Button
                variant='plain'
                onClick={() => {
                  setTemplate(null)
                  setReview(null)
                }}
              >
                {t('bulkImport.edit')}
              </Button>
            )}
            {footer(
              <Stack
                direction='row'
                spacing={1}
                sx={{ justifyContent: 'space-between' }}
              >
                <Button
                  variant='outlined'
                  color='neutral'
                  startDecorator={<ArrowBack />}
                  onClick={guided && onBack ? onBack : onClose}
                >
                  {t(
                    guided && onBack
                      ? 'templateLibrary.backToTasks'
                      : 'common:cancel',
                  )}
                </Button>
                <Button
                  onClick={preview}
                  disabled={
                    missingInputs || assignmentInvalid || configurationPending
                  }
                >
                  {t('bulkImport.preview')}
                </Button>
              </Stack>,
            )}
          </>
        )}
        {review && (
          <>
            {review.errors.map((issue, index) => (
              <Alert color='danger' key={index}>
                {issueText(issue)}
              </Alert>
            ))}
            {labelError && <Alert color='danger'>{labelError}</Alert>}
            {!inputs.length && !completed && (
              <>
                {destination}
                {members && (
                  <ImportAssignmentFields
                    anyone={anyone}
                    assignedTo={assignedTo}
                    disabled={busy}
                    members={members}
                    userIds={userIds}
                    strategy={strategy}
                    onAnyoneChange={setAnyone}
                    onAssignedToChange={setInitialAssignee}
                    onUserIdsChange={setSelectedUserIds}
                    onStrategyChange={setStrategy}
                  />
                )}
                <ImportLabelFields
                  disabled={busy}
                  labels={labels}
                  selected={selectedLabels}
                  onChange={setSelectedLabels}
                  onAddNew={() => setAddLabelModalOpen(true)}
                />
              </>
            )}
            <Card variant='soft' sx={{ gap: 1 }}>
              {destinationSummary && (
                <Box>
                  <Typography level='body-xs'>
                    {t('templateLibrary.destination')}
                  </Typography>
                  <Typography level='title-sm'>{destinationSummary}</Typography>
                </Box>
              )}
              <Box>
                <Typography level='body-xs'>
                  {t('bulkImport.assignmentTitle')}
                </Typography>
                <Typography level='title-sm'>{assignmentSummary}</Typography>
                {!anyone && userIds.length > 1 && (
                  <Typography level='body-sm'>
                    {t(`advancedOptions.strategy.${strategy}`)} ·{' '}
                    {t('templateLibrary.startsWith', {
                      name:
                        members?.find(member => member.userId === assignedTo)
                          ?.displayName ||
                        members?.find(member => member.userId === assignedTo)
                          ?.username,
                    })}
                  </Typography>
                )}
              </Box>
              {selectedLabels.length > 0 && (
                <Box>
                  <Typography level='body-xs'>
                    {t('bulkImport.labelsTitle')}
                  </Typography>
                  <Typography level='title-sm'>
                    {selectedLabels.map(label => label.name).join(', ')}
                  </Typography>
                </Box>
              )}
            </Card>
            <Typography level='title-md'>
              {t('templateLibrary.reviewCount', { count: review.tasks.length })}
            </Typography>
            <Typography level='body-xs' textColor='text.tertiary'>
              {t(
                guided
                  ? 'templateLibrary.reviewDefaults'
                  : 'bulkImport.defaults',
              )}
            </Typography>
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
                        setLabelMap(previous => ({
                          ...previous,
                          [name]: value,
                        }))
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
            <Stack spacing={1}>
              {review.tasks.map((task, index) => (
                <Box key={task.key}>
                  {grouped &&
                    review.tasks[index - 1]?.instance !== task.instance && (
                      <Typography level='title-sm' sx={{ mt: 1, mb: 0.5 }}>
                        {setName(task.instance)}
                      </Typography>
                    )}
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 'sm',
                      p: 1.5,
                    }}
                  >
                    <Typography level='title-sm'>{task.title}</Typography>
                    {task.description && (
                      <Typography
                        level='body-sm'
                        sx={{ whiteSpace: 'pre-wrap' }}
                      >
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
                        {task.subtasks.map((title, position) => (
                          <Typography
                            component='li'
                            level='body-sm'
                            key={position}
                          >
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
                </Box>
              ))}
            </Stack>
            {Object.values(results).some(result => !result.ok) && (
              <Alert color='warning'>{t('bulkImport.retryWarning')}</Alert>
            )}
            {(busy || Object.keys(results).length > 0) && (
              <Stack spacing={1} role='status'>
                <LinearProgress
                  determinate
                  value={
                    review.tasks.length
                      ? (completed / review.tasks.length) * 100
                      : 0
                  }
                />
                <Typography level='body-sm'>
                  {t('bulkImport.progress', {
                    completed,
                    count: review.tasks.length,
                  })}
                </Typography>
              </Stack>
            )}
            {footer(
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  justifyContent: 'space-between',
                }}
              >
                {!completed && (
                  <Button
                    variant='outlined'
                    disabled={busy}
                    onClick={() => {
                      setReview(null)
                      if (!inputs.length) setTemplate(null)
                      successful.current.clear()
                    }}
                  >
                    {t(
                      guided
                        ? 'templateLibrary.editSetup'
                        : inputs.length
                          ? 'bulkImport.editValues'
                          : 'bulkImport.edit',
                    )}
                  </Button>
                )}
                <Button
                  loading={busy}
                  disabled={
                    !userProfile?.id ||
                    assignmentInvalid ||
                    configurationPending ||
                    review.errors.length > 0 ||
                    Boolean(labelError) ||
                    !review.tasks.length ||
                    completed === review.tasks.length ||
                    (!createMissing &&
                      resolution.missing.some(name => !labelMap[name]))
                  }
                  onClick={importTasks}
                >
                  {Object.keys(results).length
                    ? t('bulkImport.retry')
                    : t('templateLibrary.createTasks', {
                        count: review.tasks.length,
                      })}
                </Button>
              </Box>,
            )}
          </>
        )}
        {!template && (
          <Button variant='plain' disabled={busy} onClick={onClose}>
            {t('common:close')}
          </Button>
        )}
      </Stack>
      {addLabelModalOpen && (
        <LabelModal
          isOpen={addLabelModalOpen}
          onClose={() => setAddLabelModalOpen(false)}
        />
      )}
    </>
  )
}

BulkTaskImport.propTypes = {
  configurationPending: PropTypes.bool,
  destination: PropTypes.node,
  destinationSummary: PropTypes.string,
  footerContainer: PropTypes.object,
  onBack: PropTypes.func,
  initialTemplate: PropTypes.string,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.number.isRequired,
      displayName: PropTypes.string,
      username: PropTypes.string,
    }),
  ),
  onConfigurationLock: PropTypes.func,
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
