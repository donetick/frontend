import { Save } from '@mui/icons-material'
import { Box, Button, Chip, Divider, Input, Typography } from '@mui/joy'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../../components/common/AppModal'
import ModalActions from '../../../components/common/ModalActions'
import { FILTER_COLORS } from '../../../utils/Colors'
import { applyFilter } from '../../../utils/FilterEngine'
import FilterBuilderContent, {
  conditionsToSelections,
  defaultSelections,
  selectionsToConditions,
} from '../../Chores/components/FilterBuilderContent'
import { useFilters } from '../../Filters/FilterQueries'

const EMPTY_FILTERS = []

const AdvancedFilterBuilder = ({
  allChores = [],
  editingFilter = null,
  isOpen,
  labels = [],
  members = [],
  onClose,
  onSave,
  projects = [],
  userProfile = null,
}) => {
  const { t } = useTranslation('filters')
  const [filterName, setFilterName] = useState('')
  const [filterColor, setFilterColor] = useState(FILTER_COLORS[0].value)
  const [selections, setSelections] = useState(defaultSelections())
  const [error, setError] = useState('')
  const { data: existedFilters = EMPTY_FILTERS } = useFilters()

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
  }, [editingFilter, existedFilters, isOpen])

  const conditions = useMemo(
    () => selectionsToConditions(selections),
    [selections],
  )

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
      setError(t('builder.errorName'))
      return
    }
    if (filterNameExists(filterName.trim(), editingFilter?.id)) {
      setError(t('nameExists'))
      return
    }
    if (conditions.length === 0) {
      setError(t('builder.errorConditions'))
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
    <AppModal
      open={isOpen}
      isMobile
      onClose={onClose}
      maxHeight='92vh'
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingFilter ? t('builder.editTitle') : t('builder.newTitle')}
          {activeConditionCount > 0 && (
            <Chip size='sm' variant='solid' color='primary'>
              {activeConditionCount} condition
              {activeConditionCount !== 1 ? 's' : ''}
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
                  {t('tasks', { count: previewCount })}
                </Chip>
                {previewOverdueCount > 0 && (
                  <Chip size='sm' variant='solid' color='danger'>
                    {t('overdue', { count: previewOverdueCount })}
                  </Chip>
                )}
              </>
            ) : (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('builder.addConditions')}
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <ModalActions>
            <Button variant='outlined' color='neutral' onClick={onClose}>
              {t('common:cancel')}
            </Button>
            <Button
              variant='solid'
              color='primary'
              startDecorator={<Save sx={{ fontSize: 16 }} />}
              onClick={handleSave}
            >
              {t('builder.save')}
            </Button>
          </ModalActions>
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
            {t('builder.name')}
          </Typography>
          <Input
            placeholder={t('builder.namePlaceholder')}
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
            {t('builder.color')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {FILTER_COLORS.map(c => (
              <Box
                key={c.value}
                title={t(`common:colors.${c.key}`)}
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
    </AppModal>
  )
}

export default AdvancedFilterBuilder
