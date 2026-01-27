import { Add, Delete, Save } from '@mui/icons-material'
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
import { useEffect, useMemo, useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { FILTER_COLORS } from '../../../utils/Colors'
import { filterNameExists } from '../../../utils/CustomFilterStorage'
import { applyFilter } from '../../../utils/FilterEngine'
import Priorities from '../../../utils/Priorities'

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
  const { ResponsiveModal } = useResponsiveModal()
  const [filterName, setFilterName] = useState('')
  const [filterDescription, setFilterDescription] = useState('')
  const [filterColor, setFilterColor] = useState(FILTER_COLORS[0].value)
  const [conditions, setConditions] = useState([
    { type: 'assignee', operator: 'is', value: [] },
  ])
  const [error, setError] = useState('')
  const [existedFilters] = useState(() => {
    const storedFilters = localStorage.getItem('customFilters')
    return storedFilters ? JSON.parse(storedFilters) : []
  })

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
      if (c.type === 'dueDate') return true
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
        updated[index].value = [3]
      }
    }

    setConditions(updated)
  }

  const handleSave = () => {
    if (!filterName.trim()) {
      setError('Please enter a filter name')
      return
    }

    // Check for duplicate name, excluding current filter if editing
    if (filterNameExists(filterName.trim(), editingFilter?.id)) {
      setError('A filter with this name already exists')
      return
    }

    const validConditions = conditions.filter(c => {
      if (c.type === 'dueDate') return true
      return c.value && (Array.isArray(c.value) ? c.value.length > 0 : true)
    })

    if (conditions.length === 0 || validConditions.length === 0) {
      setError('Please add at least one filter condition')
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
            placeholder='Select assignees'
            sx={{ width: '100%' }}
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
            placeholder='Select creators'
            sx={{ width: '100%' }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value

                  if (value === 'me')
                    return (
                      <Chip key={`${value}-${idx}`} size='sm'>
                        Me
                      </Chip>
                    )
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
            <Option value='me'>Me</Option>
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
            placeholder='Select priorities'
            sx={{ width: '100%' }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((value, idx) => (
                  <Chip key={`priority-${value}-${idx}`} size='sm'>
                    Priority {value}
                  </Chip>
                ))}
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
            placeholder='Select labels'
            sx={{ width: '100%' }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((selectedElement, idx) => {
                  const value = selectedElement.value

                  const label = labels.find(l => String(l.id) === String(value))
                  return (
                    <Chip key={`label-chip-${value}-${idx}`} size='sm'>
                      {label?.name || 'Unknown'}
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
            placeholder='Select projects'
            sx={{ width: '100%' }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.map((event, idx) => {
                  const value = event.value
                  if (value === 'default')
                    return (
                      <Chip key={`default-${idx}`} size='sm'>
                        Default
                      </Chip>
                    )
                  const project = projects.find(
                    p => String(p.id) === String(value),
                  )
                  return (
                    <Chip key={`project-chip-${value}-${idx}`} size='sm'>
                      {project?.name || 'Unknown'}
                    </Chip>
                  )
                })}
              </Box>
            )}
          >
            <Option value='default'>Default Project</Option>
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
            value={condition.value?.[0] || 3}
            onChange={(_, newValue) =>
              updateCondition(index, 'value', [newValue])
            }
            sx={{ width: '100%' }}
          >
            <Option value={0}>Active</Option>
            <Option value={1}>Started</Option>
            <Option value={2}>In Progress</Option>
            <Option value={3}>Pending Approval</Option>
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
          >
            <Option value='isOverdue'>Is Overdue</Option>
            <Option value='isDueToday'>Is Due Today</Option>
            <Option value='isDueTomorrow'>Is Due Tomorrow</Option>
            <Option value='isDueThisWeek'>Is Due This Week</Option>
            <Option value='isDueThisMonth'>Is Due This Month</Option>
            <Option value='hasNoDueDate'>Has No Due Date</Option>
            <Option value='hasDueDate'>Has Due Date</Option>
          </Select>
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
      title={editingFilter ? 'Edit Filter' : 'Create Advanced Filter'}
      footer={
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant='outlined' color='neutral' onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant='solid'
            color='primary'
            onClick={handleSave}
            startDecorator={<Save />}
          >
            {editingFilter ? 'Update Filter' : 'Save Filter'}
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
            Filter Name
          </Typography>
          <Input
            placeholder='e.g., High Priority Tasks for Team'
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
            Description (Optional)
          </Typography>
          <Textarea
            placeholder='Optional description for this filter...'
            value={filterDescription}
            onChange={e => setFilterDescription(e.target.value)}
            minRows={2}
            maxRows={3}
          />
        </Box>

        <Box>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            Color
          </Typography>
          <Select
            value={filterColor}
            onChange={(_, value) => value && setFilterColor(value)}
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
            Filter Conditions (All must match)
          </Typography>

          <List
            sx={{
              gap: 1,
              overflowY: 'auto',
              maxHeight: { xs: '40vh', sm: '50vh' },
              pr: 0.5,
            }}
          >
            {conditions.map((condition, index) => (
              <ListItem
                key={index}
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
                    Condition {index + 1}
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
                    Field
                  </Typography>
                  <Select
                    value={condition.type}
                    onChange={(_, newValue) =>
                      updateCondition(index, 'type', newValue)
                    }
                    sx={{ width: '100%' }}
                  >
                    <Option value='assignee'>Assignee</Option>
                    <Option value='createdBy'>Created By</Option>
                    <Option value='priority'>Priority</Option>
                    <Option value='label'>Label</Option>
                    <Option value='project'>Project</Option>
                    <Option value='status'>Status</Option>
                    <Option value='dueDate'>Due Date</Option>
                  </Select>
                </Box>

                <Box sx={{ width: '100%' }}>
                  <Typography level='body-xs' sx={{ mb: 0.5 }}>
                    {condition.type === 'dueDate' ? 'Condition' : 'Value'}
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
            Add Condition
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
            <Typography level='body-sm'>Preview</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip size='sm' variant='soft' color='neutral'>
                {previewCount} tasks
              </Chip>
              {previewOverdueCount > 0 && (
                <Chip size='sm' variant='solid' color='danger'>
                  {previewOverdueCount} overdue
                </Chip>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              maxHeight: 150,
              overflowY: 'auto',
              bgcolor: 'background.level1',
              p: 1,
              borderRadius: 'sm',
            }}
          >
            {previewCount === 0 ? (
              <Typography
                level='body-sm'
                color='neutral'
                sx={{ textAlign: 'center', py: 2 }}
              >
                No tasks match these filters
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
                    ...and {previewCount - 3} more
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
