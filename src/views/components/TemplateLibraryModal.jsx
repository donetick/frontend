import {
  Add,
  ArrowBack,
  ArrowForward,
  BadgeOutlined,
  CategoryOutlined,
  Check,
  CleaningServicesOutlined,
  Clear,
  DevicesOutlined,
  DirectionsCarOutlined,
  HomeOutlined,
  KitchenOutlined,
  LocalLaundryServiceOutlined,
  ParkOutlined,
  Search,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  IconButton,
  Input,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { track } from '../../analytics'
import NumberInput from '../../components/common/NumberInput'
import {
  capabilityTaskIndexes,
  filterTaskTemplates,
  isTemplateCategory,
  templateCapabilities,
  templateCategories as categories,
  templateImportText,
  visibleTaskIndexes,
} from '../../data/taskTemplates'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import BulkTaskImportModal from './BulkTaskImportModal'
import TemplateFlowSteps from './TemplateFlowSteps'

const repeatUnits = ['day', 'week', 'month', 'year']

const categoryIcons = {
  cleaning: CleaningServicesOutlined,
  kitchen: KitchenOutlined,
  homeAppliances: LocalLaundryServiceOutlined,
  homeSystems: HomeOutlined,
  vehicles: DirectionsCarOutlined,
  technology: DevicesOutlined,
  outdoors: ParkOutlined,
  personal: BadgeOutlined,
}
// A template whose category has no icon still has to render.
const categoryIcon = category => categoryIcons[category] ?? CategoryOutlined

// Collapsed to a single button by default; opening it reveals and focuses the
// title field. Custom tasks are this-session-only: they ride along to the
// next step but never touch the template data, so a fresh key per template
// resets this form instead of carrying state across templates.
function AddCustomTaskForm({ onAdd }) {
  const { t } = useTranslation('chores')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [count, setCount] = useState(1)
  const [unit, setUnit] = useState('month')
  const titleRef = useRef(null)

  const close = () => {
    setOpen(false)
    setTitle('')
    setCount(1)
    setUnit('month')
  }
  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({
      title: trimmed,
      repeat: `every ${count} ${unit}${count === 1 ? '' : 's'}`,
    })
    setTitle('')
    setCount(1)
    setUnit('month')
    titleRef.current?.focus()
  }

  if (!open) {
    return (
      <Button
        size='sm'
        variant='plain'
        startDecorator={<Add />}
        sx={{ alignSelf: 'flex-start' }}
        onClick={() => setOpen(true)}
      >
        {t('templateLibrary.addCustomTask')}
      </Button>
    )
  }

  return (
    <Stack spacing={1}>
      <Input
        slotProps={{
          input: {
            ref: titleRef,
            'aria-label': t('templateLibrary.customTaskPlaceholder'),
          },
        }}
        value={title}
        onChange={event => setTitle(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          } else if (event.key === 'Escape') {
            close()
          }
        }}
        placeholder={t('templateLibrary.customTaskPlaceholder')}
        size='sm'
        autoFocus
      />
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography level='body-sm' sx={{ flexShrink: 0 }}>
          {t('templateLibrary.every')}
        </Typography>
        <NumberInput
          value={count}
          min={1}
          onValueChange={value => {
            if (Number.isSafeInteger(value) && value >= 1) setCount(value)
          }}
          slotProps={{
            input: {
              'aria-label': t('templateLibrary.intervalFor', {
                name: title || t('templateLibrary.addCustomTask'),
              }),
            },
          }}
          size='sm'
          sx={{ width: 80, flexShrink: 0 }}
        />
        <Select
          size='sm'
          aria-label={t('templateLibrary.unitFor', {
            name: title || t('templateLibrary.addCustomTask'),
          })}
          value={unit}
          onChange={(_, value) => {
            if (value) setUnit(value)
          }}
          sx={{ flex: 1, minWidth: 0 }}
        >
          {repeatUnits.map(value => (
            <Option key={value} value={value}>
              {t(`templateLibrary.units.${value}`, { count })}
            </Option>
          ))}
        </Select>
      </Stack>
      <Stack direction='row' spacing={1}>
        <Button
          size='sm'
          variant='solid'
          startDecorator={<Add />}
          disabled={!title.trim()}
          onClick={submit}
        >
          {t('templateLibrary.confirmAddCustomTask')}
        </Button>
        <Button size='sm' variant='plain' color='neutral' onClick={close}>
          {t('templateLibrary.cancel')}
        </Button>
      </Stack>
    </Stack>
  )
}
AddCustomTaskForm.propTypes = { onAdd: PropTypes.func.isRequired }

export default function TemplateLibraryModal({
  entryPoint = 'unknown',
  initialCategory = 'all',
  initialQuery = '',
  onClose,
}) {
  const { t } = useTranslation('chores')
  const { ResponsiveModal } = useResponsiveModal()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(
    isTemplateCategory(initialCategory) ? initialCategory : 'all',
  )
  const [selected, setSelected] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [enabled, setEnabled] = useState([])
  const [customTasks, setCustomTasks] = useState([])
  const [importText, setImportText] = useState(null)
  const contentRef = useRef(null)
  const selectionId = selected?.id
  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true })
    contentRef.current?.scrollIntoView({ block: 'start' })
  }, [selectionId, importText])
  // Which surface sent people here is the whole question behind the library's
  // placement, so it is recorded once per opening and carried onto the
  // selection and hand-off events for a per-entry-point funnel.
  useEffect(() => {
    track('template_library_opened', { entry_point: entryPoint })
  }, [entryPoint])
  const templates = filterTaskTemplates(query, category)
  const capabilities = selected ? templateCapabilities(selected) : []
  const visible = selected ? visibleTaskIndexes(selected, enabled) : []
  const allSelected =
    visible.length > 0 && visible.every(index => selectedTasks.includes(index))
  const openTemplate = template => {
    setSelected(template)
    setEnabled([])
    setSelectedTasks(visibleTaskIndexes(template))
    setCustomTasks([])
    track('template_selected', {
      entry_point: entryPoint,
      template_id: template.id,
      category: template.category,
    })
  }
  const addCustomTask = task => {
    setCustomTasks(previous => [...previous, task])
  }
  const removeCustomTask = index => {
    setCustomTasks(previous => previous.filter((_, i) => i !== index))
  }
  // Enabling a capability adds its tasks pre-checked; disabling withdraws them
  // so a hidden task can never be carried into the import.
  const toggleCapability = capability => {
    const indexes = capabilityTaskIndexes(selected, capability)
    const on = !enabled.includes(capability)
    setEnabled(
      on ? [...enabled, capability] : enabled.filter(id => id !== capability),
    )
    setSelectedTasks(previous =>
      on
        ? [...previous, ...indexes.filter(index => !previous.includes(index))]
        : previous.filter(index => !indexes.includes(index)),
    )
  }
  const clearFilters = () => {
    setQuery('')
    setCategory('all')
  }

  if (importText) {
    return (
      <BulkTaskImportModal
        initialTemplate={importText}
        templateTitle={selected.name}
        onBack={() => setImportText(null)}
        onClose={onClose}
      />
    )
  }

  return (
    <ResponsiveModal
      open
      onClose={onClose}
      size={selected ? 'lg' : 'xl'}
      fullWidth
      mobilePresentation='fullscreen'
      title={selected?.name ?? t('templateLibrary.title')}
      description={selected ? undefined : t('templateLibrary.intro')}
      footer={
        selected ? (
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Button
              variant='outlined'
              color='neutral'
              startDecorator={<ArrowBack />}
              onClick={() => setSelected(null)}
            >
              {t('templateLibrary.back')}
            </Button>
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center', minWidth: 0 }}
            >
              <Typography level='body-sm' aria-live='polite' noWrap>
                {t('templateLibrary.selectedCount', {
                  count: selectedTasks.length + customTasks.length,
                })}
              </Typography>
              <Button
                disabled={!selectedTasks.length && !customTasks.length}
                endDecorator={<ArrowForward />}
                onClick={() => {
                  track('template_import_started', {
                    entry_point: entryPoint,
                    template_id: selected.id,
                    task_count: selectedTasks.length + customTasks.length,
                    custom_task_count: customTasks.length,
                  })
                  setImportText(
                    templateImportText(selected, selectedTasks, customTasks),
                  )
                }}
              >
                {t('templateLibrary.continue')}
              </Button>
            </Stack>
          </Stack>
        ) : undefined
      }
    >
      <Stack
        ref={contentRef}
        tabIndex={-1}
        spacing={2.5}
        sx={{ outline: 'none' }}
      >
        {selected ? (
          <>
            <TemplateFlowSteps active={0} />
            <Box>
              <Typography level='h3'>
                {t('templateLibrary.chooseTasks')}
              </Typography>
              <Typography
                level='body-sm'
                textColor='text.tertiary'
                sx={{ mt: 0.5 }}
              >
                {selected.description}
              </Typography>
            </Box>
            {capabilities.length > 0 && (
              <Box>
                <Typography level='title-sm'>
                  {t('templateLibrary.capabilities')}
                </Typography>
                <Typography
                  level='body-xs'
                  textColor='text.tertiary'
                  sx={{ mb: 1 }}
                >
                  {t('templateLibrary.capabilitiesHint')}
                </Typography>
                <Box
                  role='group'
                  aria-label={t('templateLibrary.capabilities')}
                  sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}
                >
                  {capabilities.map(capability => (
                    <Chip
                      key={capability.id}
                      variant={
                        enabled.includes(capability.id) ? 'soft' : 'outlined'
                      }
                      color={
                        enabled.includes(capability.id) ? 'primary' : 'neutral'
                      }
                      startDecorator={
                        enabled.includes(capability.id) ? <Check /> : <Add />
                      }
                      title={capability.description}
                      onClick={() => toggleCapability(capability.id)}
                      slotProps={{
                        action: {
                          'aria-pressed': enabled.includes(capability.id),
                        },
                      }}
                    >
                      {capability.label}
                    </Chip>
                  ))}
                </Box>
              </Box>
            )}
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography level='body-sm'>
                {t('templateLibrary.taskCount', { count: visible.length })}
              </Typography>
              <Button
                size='sm'
                variant='plain'
                onClick={() => setSelectedTasks(allSelected ? [] : visible)}
              >
                {t(
                  allSelected
                    ? 'templateLibrary.deselectAll'
                    : 'templateLibrary.selectAll',
                )}
              </Button>
            </Stack>
            <Stack spacing={0.75}>
              {visible.map(index => {
                const task = selected.document.tasks[index]
                return (
                  <Card
                    key={index}
                    variant='outlined'
                    sx={{
                      position: 'relative',
                      p: 1.25,
                      gap: 0.25,
                      borderColor: selectedTasks.includes(index)
                        ? 'primary.outlinedBorder'
                        : 'divider',
                      bgcolor: selectedTasks.includes(index)
                        ? 'primary.softBg'
                        : 'background.surface',
                      transition: 'background-color 120ms',
                    }}
                  >
                    {/* The cadence stays outside the label so the checkbox's
                        accessible name is just the task title. */}
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Checkbox
                        overlay
                        size='sm'
                        label={task.title.replace(' — {{ item }}', '')}
                        checked={selectedTasks.includes(index)}
                        onChange={event =>
                          setSelectedTasks(previous =>
                            event.target.checked
                              ? [...previous, index]
                              : previous.filter(value => value !== index),
                          )
                        }
                        sx={{ fontWeight: 500, minWidth: 0 }}
                      />
                      <Typography
                        level='body-xs'
                        textColor='text.tertiary'
                        noWrap
                      >
                        {task.repeat}
                      </Typography>
                    </Stack>
                    {task.subtasks && (
                      <Box component='ul' sx={{ my: 0, pl: 4 }}>
                        {task.subtasks.map(title => (
                          <Typography
                            component='li'
                            level='body-xs'
                            textColor='text.tertiary'
                            key={title}
                          >
                            {title}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Card>
                )
              })}
              {customTasks.map((task, index) => (
                <Card
                  key={`custom-${index}`}
                  variant='outlined'
                  sx={{
                    p: 1.25,
                    gap: 0.25,
                    borderColor: 'primary.outlinedBorder',
                    bgcolor: 'primary.softBg',
                  }}
                >
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                      {task.title}
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ alignItems: 'center', flexShrink: 0 }}
                    >
                      <Typography level='body-xs' textColor='text.tertiary'>
                        {task.repeat}
                      </Typography>
                      <IconButton
                        size='sm'
                        variant='plain'
                        color='neutral'
                        aria-label={t('templateLibrary.removeCustomTask', {
                          title: task.title,
                        })}
                        onClick={() => removeCustomTask(index)}
                      >
                        <Clear />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
            <AddCustomTaskForm key={selected.id} onAdd={addCustomTask} />
            <Typography level='body-xs' textColor='text.tertiary'>
              {t('templateLibrary.scheduleNote')}
            </Typography>
          </>
        ) : (
          <>
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t('templateLibrary.search')}
              startDecorator={<Search />}
              size='lg'
              slotProps={{
                input: { 'aria-label': t('templateLibrary.search') },
              }}
              endDecorator={
                query ? (
                  <IconButton
                    size='sm'
                    variant='plain'
                    aria-label={t('templateLibrary.clearSearch')}
                    onClick={() => setQuery('')}
                  >
                    <Clear />
                  </IconButton>
                ) : null
              }
            />
            <Box
              role='group'
              aria-label={t('templateLibrary.category')}
              sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}
            >
              {categories.map(value => (
                <Button
                  key={value}
                  size='sm'
                  variant={category === value ? 'soft' : 'plain'}
                  color={category === value ? 'primary' : 'neutral'}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  sx={{ borderRadius: 'xl' }}
                >
                  {t(`templateLibrary.categories.${value}`)}
                </Button>
              ))}
            </Box>
            <Typography
              level='body-sm'
              textColor='text.tertiary'
              aria-live='polite'
            >
              {t('templateLibrary.results', { count: templates.length })}
            </Typography>
            {!templates.length && (
              <Stack
                spacing={2}
                sx={{ alignItems: 'center', py: 5, textAlign: 'center' }}
              >
                <Search sx={{ fontSize: 40, color: 'text.tertiary' }} />
                <Typography level='title-md'>
                  {t('templateLibrary.empty')}
                </Typography>
                <Button
                  variant='outlined'
                  color='neutral'
                  onClick={clearFilters}
                >
                  {t('templateLibrary.clear')}
                </Button>
              </Stack>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {templates.map(template => {
                const Icon = categoryIcon(template.category)
                return (
                  <Card
                    key={template.id}
                    component='button'
                    type='button'
                    onClick={() => openTemplate(template)}
                    variant='outlined'
                    aria-label={t('templateLibrary.previewName', {
                      name: template.name,
                    })}
                    sx={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      p: 2.5,
                      gap: 1.5,
                      transition: 'border-color 150ms, box-shadow 150ms',
                      '&:hover': {
                        borderColor: 'primary.outlinedBorder',
                        boxShadow: 'sm',
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.500',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Stack
                      direction='row'
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: 'md',
                          bgcolor: 'background.level1',
                          color: 'primary.500',
                        }}
                      >
                        <Icon />
                      </Box>
                      <Chip size='sm' variant='plain'>
                        {t(`templateLibrary.categories.${template.category}`)}
                      </Chip>
                    </Stack>
                    <Typography level='title-md'>{template.name}</Typography>
                    <Typography
                      level='body-sm'
                      textColor='text.tertiary'
                      sx={{ flex: 1 }}
                    >
                      {template.description}
                    </Typography>
                    <Stack
                      direction='row'
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        mt: 0.5,
                      }}
                    >
                      <Typography level='body-xs'>
                        {t('templateLibrary.taskCount', {
                          count: template.document.tasks.length,
                        })}
                      </Typography>
                      <ArrowForward
                        sx={{ fontSize: 18, color: 'primary.500' }}
                      />
                    </Stack>
                  </Card>
                )
              })}
            </Box>
          </>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

TemplateLibraryModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  entryPoint: PropTypes.string,
  initialQuery: PropTypes.string,
  initialCategory: PropTypes.string,
}
