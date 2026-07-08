import { Save } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Divider,
  Input,
  Typography,
} from '@mui/joy'
import { useEffect, useMemo, useState } from 'react'
import BottomSheetModal from '../../../components/common/BottomSheetModal'
import FilterBuilderContent, {
  conditionsToSelections,
  defaultSelections,
  selectionsToConditions,
} from '../../Chores/components/FilterBuilderContent'
import { FILTER_COLORS } from '../../../utils/Colors'
import { applyFilter } from '../../../utils/FilterEngine'
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
  const [filterName, setFilterName] = useState('')
  const [filterColor, setFilterColor] = useState(FILTER_COLORS[0].value)
  const [selections, setSelections] = useState(defaultSelections())
  const [error, setError] = useState('')
  const { data: existedFilters = [] } = useFilters()

  const filterNameExists = (name, excludeId = null) =>
    existedFilters.some(
      f => f.name.toLowerCase() === name.toLowerCase() && f.id !== excludeId,
    )

  useEffect(() => {
    if (!isOpen) return
    if (editingFilter) {
      setFilterName(editingFilter.name)
      setFilterColor(editingFilter.color || FILTER_COLORS[0].value)
      setSelections(conditionsToSelections(editingFilter.conditions))
    } else {
      setFilterName('')
      const potentialColor = FILTER_COLORS.find(
        c => !existedFilters.some(f => f.color === c.value),
      )
      setFilterColor(potentialColor?.value ?? FILTER_COLORS[0].value)
      setSelections(defaultSelections())
    }
    setError('')
  }, [editingFilter, isOpen])

  const conditions = useMemo(() => selectionsToConditions(selections), [selections])

  const previewChores = useMemo(() => {
    if (conditions.length === 0) return []
    return applyFilter(
      allChores,
      { conditions, operator: 'AND' },
      { userId: userProfile?.id, members, labels, projects },
    )
  }, [conditions, allChores, userProfile, members, labels, projects])

  const previewCount = previewChores.length
  const previewOverdueCount = previewChores.filter(
    c => c.nextDueDate && new Date(c.nextDueDate) < new Date(),
  ).length

  const activeConditionCount = conditions.length

  const handleSave = () => {
    if (!filterName.trim()) {
      setError('Please enter a filter name')
      return
    }
    if (filterNameExists(filterName.trim(), editingFilter?.id)) {
      setError('A filter with this name already exists')
      return
    }
    if (conditions.length === 0) {
      setError('Please configure at least one filter condition')
      return
    }
    onSave({
      name: filterName.trim(),
      description: editingFilter?.description ?? '',
      color: filterColor,
      conditions,
      operator: 'AND',
      ...(editingFilter ? { id: editingFilter.id } : {}),
    })
    onClose()
  }

  return (
    <BottomSheetModal
      open={isOpen}
      onClose={onClose}
      maxHeight='92vh'
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingFilter ? 'Edit Filter' : 'New Filter'}
          {activeConditionCount > 0 && (
            <Chip size='sm' variant='solid' color='primary'>
              {activeConditionCount} condition{activeConditionCount !== 1 ? 's' : ''}
            </Chip>
          )}
        </Box>
      }
      footer={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          {/* Preview */}
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {conditions.length > 0 ? (
              <>
                <Chip size='sm' variant='soft' color='neutral'>
                  {previewCount} task{previewCount !== 1 ? 's' : ''}
                </Chip>
                {previewOverdueCount > 0 && (
                  <Chip size='sm' variant='solid' color='danger'>
                    {previewOverdueCount} overdue
                  </Chip>
                )}
              </>
            ) : (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                Add conditions to preview
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant='plain' color='neutral' size='sm' onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              size='sm'
              startDecorator={<Save sx={{ fontSize: 16 }} />}
              onClick={handleSave}
            >
              Save Filter
            </Button>
          </Box>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Name */}
        <Box sx={{ mb: 2 }}>
          <Typography
            level='body-xs'
            sx={{ mb: 0.75, color: 'text.secondary', fontWeight: 600 }}
          >
            Filter Name
          </Typography>
          <Input
            placeholder='e.g. Overdue tasks for Alice'
            value={filterName}
            onChange={e => {
              setFilterName(e.target.value)
              setError('')
            }}
            error={!!error}
            autoFocus
          />
          {error && (
            <Typography level='body-xs' color='danger' sx={{ mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </Box>

        {/* Color */}
        <Box sx={{ mb: 2 }}>
          <Typography
            level='body-xs'
            sx={{ mb: 0.75, color: 'text.secondary', fontWeight: 600 }}
          >
            Color
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {FILTER_COLORS.map(c => (
              <Box
                key={c.value}
                title={c.name}
                onClick={() => setFilterColor(c.value)}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: c.value,
                  cursor: 'pointer',
                  outline:
                    filterColor === c.value
                      ? '3px solid var(--joy-palette-primary-500)'
                      : '2px solid transparent',
                  outlineOffset: '2px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  '&:hover': { transform: 'scale(1.2)' },
                }}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        <FilterBuilderContent
          selections={selections}
          onSelectionsChange={setSelections}
          members={members}
          labels={labels}
          projects={projects}
        />
      </Box>
    </BottomSheetModal>
  )
}

export default AdvancedFilterBuilder
