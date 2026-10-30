import { Check, PaletteOutlined, Save } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormLabel,
  Input,
  Typography,
} from '@mui/joy'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../../components/common/AppModal'
import ItemPrivacyField from '../../../components/common/ItemPrivacyField'
import ModalActions from '../../../components/common/ModalActions'
import { FILTER_COLORS } from '../../../utils/Colors'
import { customDueDateBounds } from '../../../utils/CustomDueDate'
import { applyFilter } from '../../../utils/FilterEngine'
import EditorSection from '../../ChoreEdit/EditorSection'
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
  const [isShared, setIsShared] = useState(false)
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
    setIsShared(editingFilter?.isShared ?? false)
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
    if (
      selections.dueDate.operators.includes('custom') &&
      !customDueDateBounds(selections.dueDate.custom)
    ) {
      setError(t('chores:filterBuilder.customDueDate.invalid'))
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
      isShared,
      isPinned: editingFilter?.isPinned ?? false,
      conditions,
      operator: 'AND',
      ...(editingFilter ? { id: editingFilter.id } : {}),
    })
    onClose()
  }

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      maxHeight='92vh'
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingFilter ? t('builder.editTitle') : t('builder.newTitle')}
          {activeConditionCount > 0 && (
            <Chip size='sm' variant='solid' color='primary'>
              {t('condition', { count: activeConditionCount })}
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
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          {/* Preview */}
          <Box
            aria-live='polite'
            sx={{ display: 'flex', gap: 1, flexShrink: 0 }}
          >
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl>
          <FormLabel>{t('builder.name')}</FormLabel>
          <Input
            placeholder={t('builder.namePlaceholder')}
            value={filterName}
            onChange={e => {
              setFilterName(e.target.value)
              setError('')
            }}
            autoFocus
            sx={{ minHeight: 48, borderRadius: 'md', fontSize: 'lg' }}
          />
        </FormControl>
        {error && (
          <Alert color='danger' size='sm'>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 'lg',
            overflow: 'hidden',
          }}
        >
          <EditorSection
            title={t('builder.color')}
            icon={PaletteOutlined}
            section='filter-color'
            collapsible
            summary={t(
              `common:colors.${FILTER_COLORS.find(c => c.value === filterColor)?.name ?? FILTER_COLORS[0].name}`,
            )}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {FILTER_COLORS.map(c => (
                <Box
                  key={c.value}
                  component='button'
                  type='button'
                  aria-label={t(`common:colors.${c.name}`)}
                  aria-pressed={filterColor === c.value}
                  title={t(`common:colors.${c.name}`)}
                  onClick={() => setFilterColor(c.value)}
                  sx={{
                    width: 36,
                    height: 36,
                    border: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:focus-visible': {
                      outline: '3px solid',
                      outlineColor: 'text.primary',
                    },
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
                >
                  {filterColor === c.value && (
                    <Check
                      sx={{
                        fontSize: 20,
                        color: 'white',
                        filter: 'drop-shadow(0 1px 2px #000)',
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </EditorSection>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 0.5 }}>
            <ItemPrivacyField
              isShared={isShared}
              onChange={setIsShared}
              kind='filter'
            />
          </Box>
        </Box>

        <Box>
          <Typography level='title-sm'>{t('builder.conditions')}</Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
            {t('builder.conditionsHint')}
          </Typography>
        </Box>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 'lg',
            overflow: 'hidden',
          }}
        >
          <FilterBuilderContent
            selections={selections}
            onSelectionsChange={next => {
              setSelections(next)
              setError('')
            }}
            members={members}
            labels={labels}
            projects={projects}
          />
        </Box>
      </Box>
    </AppModal>
  )
}

export default AdvancedFilterBuilder
