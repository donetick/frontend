import { Add, Delete } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Input,
  List,
  ListItem,
  Option,
  Select,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { FILTER_COLORS } from '../../../utils/Colors'
import { applyFilter } from '../../../utils/FilterEngine'
import Priorities from '../../../utils/Priorities'
import { useFilters } from '../../Filters/FilterQueries'

const AdvancedFilterBuilder = ({
  isOpen,
  onClose,
  onSave,
  members = [],
  labels = [],
  projects = [],
  allChores = [],
  userProfile = null,
  editingFilter = null,
}) => {
  const { t } = useTranslation(['filters', 'common'])
  const { ResponsiveModal } = useResponsiveModal()
  const listContainerRef = useRef(null)
  const conditionRefs = useRef([])
  const [filterName, setFilterName] = useState('')
  const [filterDescription, setFilterDescription] = useState('')
  const [filterColor, setFilterColor] = useState(FILTER_COLORS[0].value)
  const [conditions, setConditions] = useState([
    { type: 'assignee', operator: 'is', value: [] },
  ])
  const [error, setError] = useState('')
  const { data: existedFilters = [] } = useFilters()

  const filterNameExists = (name, excludeId = null) => {
    return existedFilters.some(
      filter =>
        filter.name.toLowerCase() === name.toLowerCase() &&
        filter.id !== excludeId,
    )
  }

  // Initialize refs array when conditions change
  useEffect(() => {
    conditionRefs.current = conditionRefs.current.slice(0, conditions.length)
  }, [conditions.length])

  // Initialize state when editing a filter
  useEffect(() => {
    if (editingFilter) {
      setFilterName(editingFilter.name)
      setFilterDescription(editingFilter.description || '')
      setFilterColor(editingFilter.color || FILTER_COLORS[0].value)
      setConditions(editingFilter.conditions || [])
      setError('')
    } else {
      setFilterName('')
      setFilterDescription('')
      // find color no filter has it :
      const potentialColor = FILTER_COLORS.find(
        color => !existedFilters.some(filter => filter.color === color.value),
      )

      setFilterColor(
        potentialColor ? potentialColor.value : FILTER_COLORS[0].value,
      )
      setConditions([{ type: 'assignee', operator: 'is', value: [] }])
      setError('')
    }
  }, [editingFilter, isOpen])

  const previewChores = useMemo(() => {
    const validConditions = conditions.filter(c => {
      if (c.type === 'dueDate' || c.type === 'points') return true
      return c.value && (Array.isArray(c.value) ? c.value.length > 0 : true)
    })

    if (validConditions.length === 0) return []

    const result = applyFilter(
      allChores,
      { conditions: validConditions, operator: 'AND' },
      {
        userId: userProfile?.id,
        members,
        labels,
        projects,
      },
    )

    return result
  }, [conditions, allChores, userProfile, members, labels, projects])

  const previewCount = previewChores.length
  const previewOverdueCount = previewChores.filter(
    chore => chore.nextDueDate && new Date(chore.nextDueDate) < new Date(),
  ).length

  const addCondition = () => {
    setConditions([
      ...conditions,
      { type: 'assignee', operator: 'is', value: [] },
    ])

    // Scroll to the new condition after it's rendered
    setTimeout(() => {
      const newIndex = conditions.length
      const newConditionElement = conditionRefs.current[newIndex]
      if (newConditionElement && listContainerRef.current) {
        newConditionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }, 100)
  }

  const removeCondition = index => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index, field, value) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'type') {
      updated[index].value = []
      if (value === 'dueDate') {
        updated[index].operator = 'isOverdue'
        updated[index].value = null
      } else if (value === 'status') {
        updated[index].value = []
      } else if (value === 'points') {
        updated[index].operator = 'greaterThan'
        updated[index].value = 0
      }
    }

    setConditions(updated)
  }

  const handleSave = () => {
    if (!filterName.trim()) {
      setError(t('filters:advanced.enterFilterName'))
      return
    }

    // Check for duplicate name, excluding current filter if editing
    if (filterNameExists(filterName.trim(), editingFilter?.id)) {
      setError(t('filters:advanced.duplicateFilterName'))
      return
    }

    const validConditions = conditions.filter(c => {
      if (c.type === 'dueDate' || c.type === 'points') return true
      return c.value && (Array.isArray(c.value) ? c.value.length > 0 : true)
    })

    if (conditions.length === 0 || validConditions.length === 0) {
      setError(t('filters:advanced.addAtLeastOneCondition'))
      return
    }

    const filterData = {
      name: filterName.trim(),
      description: filterDescription.trim(),
      color: filterColor,
      conditions: validConditions,
      operator: 'AND',
    }

    // Include ID if editing
    if (editingFilter) {
      filterData.id = editingFilter.id
    }

    onSave(filterData)
    onClose()
  }

  const renderValueSelector = (condition, index) => {
    switch (condition.type) {
      case 'assignee':
        return (
          <Select
            multiple
            value={condition.value || []}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', newValue)
            }
            placeholder={t('filters:advanced.selectAssignees')}
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value
                  const member = members.find(
                    m => String(m.userId) === String(value),
                  )
                  return (
                    <Chip key={`${value}-${idx}`} size='sm'>
                      {member?.displayName ||
                        member?.username ||
                        t('filters:advanced.unknown')}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            {members.map((member, idx) => (
              <Option
                key={`member-${member.userId}-${idx}`}
                value={member.userId}
              >
                {member.displayName || member.username} ({member.userId})
              </Option>
            ))}
          </Select>
        )

      case 'createdBy':
        return (
          <Select
            multiple
            value={condition.value || []}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', newValue)
            }
            placeholder={t('filters:advanced.selectCreators')}
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value

                  const member = members.find(
                    m => String(m.userId) === String(value),
                  )
                  return (
                    <Chip key={`${value}-${idx}`} size='sm'>
                      {member?.displayName || member?.username || 'Unknown'}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            {members.map((member, idx) => (
              <Option
                key={`creator-${member.userId}-${idx}`}
                value={member.userId}
              >
                {member.displayName || member.username}
              </Option>
            ))}
          </Select>
        )

      case 'priority':
        return (
          <Select
            multiple
            value={condition.value || []}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', newValue)
            }
            placeholder={t('filters:advanced.selectPriorities')}
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value
                  const priority = Priorities.find(p => p.value === value)
                  return (
                    <Chip key={`priority-${value}-${idx}`} size='sm'>
                      {priority?.name || `Priority ${value}`}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            {Priorities.map((priority, idx) => (
              <Option
                key={`priority-opt-${priority.value}-${idx}`}
                value={priority.value}
              >
                {priority.name}
              </Option>
            ))}
          </Select>
        )

      case 'label':
        return (
          <Select
            multiple
            value={condition.value || []}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', newValue)
            }
            placeholder={t('filters:advanced.selectLabels')}
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value

                  const label = labels.find(l => String(l.id) === String(value))
                  return (
                    <Chip key={`label-chip-${value}-${idx}`} size='sm'>
                      {label?.name || t('filters:advanced.unknown')}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            {labels.map((label, idx) => (
              <Option key={`label-opt-${label.id}-${idx}`} value={label.id}>
                {label.name}
              </Option>
            ))}
          </Select>
        )

      case 'project':
        return (
          <Select
            multiple
            value={condition.value || []}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', newValue)
            }
            placeholder={t('filters:advanced.selectProjects')}
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((event, idx) => {
                  const value = event.value
                  if (value === 'default')
                    return (
                      <Chip key={`default-${idx}`} size='sm'>
                        {t('filters:advanced.defaultProject')}
                      </Chip>
                    )
                  const project = projects.find(
                    p => String(p.id) === String(value),
                  )
                  return (
                    <Chip key={`project-chip-${value}-${idx}`} size='sm'>
                      {project?.name || t('filters:advanced.unknown')}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            <Option value='default'>{t('filters:advanced.defaultProject')}</Option>
            {projects
              .filter(p => p.id !== 'default')
              .map((project, idx) => (
                <Option
                  key={`project-opt-${project.id}-${idx}`}
                  value={project.id}
                >
                  {project.name}
                </Option>
              ))}
          </Select>
        )

      case 'status':
        return (
          <Select
            multiple
            value={condition.value || []}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', newValue)
            }
            placeholder={t('filters:advanced.selectStatuses')}
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value
                  const statusLabels = {
                    0: t('filters:advanced.active'),
                    1: t('filters:advanced.started'),
                    2: t('filters:advanced.inProgress'),
                    3: t('filters:advanced.pendingApproval'),
                  }
                  return (
                    <Chip key={`status-chip-${value}-${idx}`} size='sm'>
                      {statusLabels[value] || t('filters:advanced.unknown')}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            <Option value={0}>{t('filters:advanced.active')}</Option>
            <Option value={1}>{t('filters:advanced.started')}</Option>
            <Option value={2}>{t('filters:advanced.inProgress')}</Option>
            <Option value={3}>{t('filters:advanced.pendingApproval')}</Option>
          </Select>
        )

      case 'dueDate':
        return (
          <Select
            value={condition.operator}
            onChange={(_, newValue) =>
              updateCondition(index, 'operator', newValue)
            }
            sx={{ width: '100%' }}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
          >
            <Option value='isOverdue'>{t('filters:advanced.isOverdue')}</Option>
            <Option value='isDueToday'>{t('filters:advanced.isDueToday')}</Option>
            <Option value='isDueTomorrow'>{t('filters:advanced.isDueTomorrow')}</Option>
            <Option value='isDueThisWeek'>{t('filters:advanced.isDueThisWeek')}</Option>
            <Option value='isDueThisMonth'>{t('filters:advanced.isDueThisMonth')}</Option>
            <Option value='hasNoDueDate'>{t('filters:advanced.hasNoDueDate')}</Option>
            <Option value='hasDueDate'>{t('filters:advanced.hasDueDate')}</Option>
          </Select>
        )

      case 'points':
        return (
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <Select
              value={condition.operator}
              onChange={(_, newValue) =>
                updateCondition(index, 'operator', newValue)
              }
              sx={{ flex: 1 }}
              slotProps={{
                listbox: {
                  placement: 'bottom-start',
                  disablePortal: false,
                },
              }}
            >
              <Option value='equals'>{t('filters:advanced.equals')}</Option>
              <Option value='greaterThan'>{t('filters:advanced.greaterThan')}</Option>
              <Option value='lessThan'>{t('filters:advanced.lessThan')}</Option>
              <Option value='greaterThanOrEqual'>
                {t('filters:advanced.greaterThanOrEqual')}
              </Option>
              <Option value='lessThanOrEqual'>
                {t('filters:advanced.lessThanOrEqual')}
              </Option>
            </Select>
            <Input
              type='number'
              value={condition.value ?? 0}
              onChange={e =>
                updateCondition(index, 'value', parseInt(e.target.value) || 0)
              }
              sx={{ flex: 1 }}
              slotProps={{
                input: {
                  min: 0,
                },
              }}
            />
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={
        editingFilter
          ? t('filters:advanced.editTitle')
          : t('filters:advanced.createTitle')
      }
      footer={
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant='outlined' color='neutral' onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant='solid' color='primary' onClick={handleSave}>
            {t('common:actions.save')}
          </Button>
        </Box>
      }
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          height: '100%',
        }}
      >
        <Box>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('filters:advanced.filterName')}
          </Typography>
          <Input
            placeholder={t('filters:advanced.filterNamePlaceholder')}
            value={filterName}
            onChange={e => {
              setFilterName(e.target.value)
              setError('')
            }}
            error={!!error}
            autoFocus
          />
          {error && (
            <Typography level='body-sm' color='danger' sx={{ mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </Box>

        <Box>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('filters:advanced.descriptionOptional')}
          </Typography>
          <Textarea
            placeholder={t('filters:advanced.descriptionPlaceholder')}
            value={filterDescription}
            onChange={e => setFilterDescription(e.target.value)}
            minRows={2}
            maxRows={3}
          />
        </Box>

        <Box>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('common:labels.color')}
          </Typography>
          <Select
            value={filterColor}
            onChange={(_, value) => value && setFilterColor(value)}
            slotProps={{
              listbox: {
                placement: 'bottom-start',
                disablePortal: false,
              },
            }}
            renderValue={selected => (
              <Typography
                startDecorator={
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: selected.value,
                    }}
                  />
                }
              >
                {selected.label}
              </Typography>
            )}
          >
            {FILTER_COLORS.map(color => (
              <Option key={color.value} value={color.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: color.value,
                    }}
                  />
                  <Typography>{color.name}</Typography>
                </Box>
              </Option>
            ))}
          </Select>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {t('filters:advanced.conditions')}
          </Typography>

          <List
            ref={listContainerRef}
            sx={{
              gap: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              maxHeight: { xs: '40vh', sm: '50vh' },
              pr: 0.5,
              position: 'relative',
            }}
          >
            {conditions.map((condition, index) => (
              <ListItem
                key={index}
                ref={el => (conditionRefs.current[index] = el)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'background.level1',
                  borderRadius: 'sm',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <Typography level='body-xs' color='neutral'>
                    {t('filters:advanced.conditionNumber', {
                      index: index + 1,
                    })}
                  </Typography>
                  <IconButton
                    size='sm'
                    color='danger'
                    variant='plain'
                    onClick={() => removeCondition(index)}
                    disabled={conditions.length === 1}
                  >
                    <Delete />
                  </IconButton>
                </Box>

                <Box sx={{ width: '100%' }}>
                  <Typography level='body-xs' sx={{ mb: 0.5 }}>
                    {t('common:labels.field')}
                  </Typography>
                  <Select
                    value={condition.type}
                    onChange={(_, newValue) =>
                      updateCondition(index, 'type', newValue)
                    }
                    sx={{ width: '100%' }}
                    slotProps={{
                      listbox: {
                        placement: 'bottom-start',
                        disablePortal: false,
                      },
                    }}
                  >
                    <Option value='assignee'>{t('filters:advanced.assignee')}</Option>
                    <Option value='createdBy'>{t('filters:advanced.createdBy')}</Option>
                    <Option value='priority'>{t('common:labels.priority')}</Option>
                    <Option value='label'>{t('filters:advanced.label')}</Option>
                    <Option value='project'>{t('common:labels.project')}</Option>
                    <Option value='status'>{t('filters:advanced.status')}</Option>
                    <Option value='dueDate'>{t('common:labels.dueDate')}</Option>
                    <Option value='points'>{t('filters:advanced.points')}</Option>
                  </Select>
                </Box>

                <Box sx={{ width: '100%' }}>
                  <Typography level='body-xs' sx={{ mb: 0.5 }}>
                    {condition.type === 'dueDate' || condition.type === 'points'
                      ? t('common:labels.condition')
                      : t('common:labels.value')}
                  </Typography>
                  {renderValueSelector(condition, index)}
                </Box>
              </ListItem>
            ))}
          </List>

          <Button
            size='sm'
            variant='outlined'
            startDecorator={<Add />}
            onClick={addCondition}
            sx={{ mt: 1 }}
          >
            {t('filters:advanced.addCondition')}
          </Button>
        </Box>

        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography level='body-sm'>{t('filters:advanced.preview')}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip size='sm' variant='soft' color='neutral'>
                {previewCount} {t('common:labels.tasks').toLowerCase()}
              </Chip>
              {previewOverdueCount > 0 && (
                <Chip size='sm' variant='solid' color='danger'>
                  {previewOverdueCount} {t('common:labels.overdue')}
                </Chip>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              maxHeight: 150,
              overflowY: 'auto',
              overflowX: 'hidden',
              bgcolor: 'background.level1',
              p: 1,
              borderRadius: 'sm',
              position: 'relative',
            }}
          >
            {previewCount === 0 ? (
              <Typography
                level='body-sm'
                color='neutral'
                sx={{ textAlign: 'center', py: 2 }}
              >
                {t('filters:advanced.noMatches')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {previewChores.slice(0, 3).map(chore => (
                  <Box
                    key={chore.id}
                    sx={{
                      bgcolor: 'background.surface',
                      p: 1,
                      borderRadius: 'sm',
                    }}
                  >
                    <Typography level='body-sm'>{chore.name}</Typography>
                  </Box>
                ))}
                {previewCount > 3 && (
                  <Typography
                    level='body-xs'
                    color='neutral'
                    sx={{ textAlign: 'center', mt: 0.5 }}
                  >
                    {t('filters:advanced.andMore', {
                      count: previewCount - 3,
                    })}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </ResponsiveModal>
  )
}

export default AdvancedFilterBuilder
