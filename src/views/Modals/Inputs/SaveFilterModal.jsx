import { Save, Star, StarBorder } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { filterNameExists } from '../../../utils/CustomFilterStorage'
import CompactChoreCard from '../../Chores/CompactChoreCard'

const SaveFilterModal = ({
  isOpen,
  onClose,
  onSave,
  filterData,
  previewChores = [],
  previewCount = 0,
  previewOverdueCount = 0,
}) => {
  const [filterName, setFilterName] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!filterName.trim()) {
      setError('Please enter a filter name')
      return
    }

    if (filterNameExists(filterName.trim())) {
      setError('A filter with this name already exists')
      return
    }

    const newFilter = {
      ...filterData,
      name: filterName.trim(),
      isPinned,
    }

    onSave(newFilter)
    onClose()
  }

  const getConditionLabel = condition => {
    switch (condition.type) {
      case 'assignee':
        if (condition.value === 'me') return 'Assigned to me'
        if (condition.value === 'others') return 'Assigned to others'
        return 'Specific assignee'

      case 'createdBy':
        if (condition.value === 'me') return 'Created by me'
        return 'Created by specific user'

      case 'priority':
        return `Priority ${condition.value}`

      case 'status':
        return condition.value === 3 ? 'Pending approval' : `Status ${condition.value}`

      case 'dueDate':
        if (condition.operator === 'isOverdue') return 'Overdue'
        if (condition.operator === 'isDueToday') return 'Due today'
        if (condition.operator === 'isDueThisWeek') return 'Due this week'
        if (condition.operator === 'hasNoDueDate') return 'No due date'
        return 'Due date condition'

      case 'label':
        return 'Has label'

      case 'project':
        if (condition.value === 'default') return 'Default project'
        return 'Specific project'

      default:
        return condition.type
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <ModalClose />
        <Typography level='h4' sx={{ mb: 2 }}>
          Save Filter
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography level='body-sm' sx={{ mb: 1 }}>
              Filter Name
            </Typography>
            <Input
              placeholder='e.g., My High Priority Tasks'
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
              Filter Conditions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {filterData.conditions.length === 0 ? (
                <Typography level='body-sm' color='neutral'>
                  No filters applied
                </Typography>
              ) : (
                filterData.conditions.map((condition, index) => (
                  <Chip
                    key={index}
                    variant='soft'
                    color='neutral'
                    size='sm'
                  >
                    {getConditionLabel(condition)}
                  </Chip>
                ))
              )}
            </Box>
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
                maxHeight: 200,
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

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              p: 1,
              borderRadius: 'sm',
              '&:hover': {
                bgcolor: 'background.level1',
              },
            }}
            onClick={() => setIsPinned(!isPinned)}
          >
            {isPinned ? (
              <Star color='warning' />
            ) : (
              <StarBorder color='neutral' />
            )}
            <Box>
              <Typography level='body-sm' fontWeight='md'>
                Pin this filter
              </Typography>
              <Typography level='body-xs' color='neutral'>
                Pinned filters appear first in the list
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant='outlined' color='neutral' onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              onClick={handleSave}
              startDecorator={<Save />}
              disabled={!filterName.trim() || filterData.conditions.length === 0}
            >
              Save Filter
            </Button>
          </Box>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default SaveFilterModal
