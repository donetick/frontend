import {
  CalendarMonth,
  Check,
  FolderOpen,
  HowToReg,
  Label,
  Person,
  PriorityHigh,
  Stars,
  TaskAlt,
} from '@mui/icons-material'
import { Avatar, Box, Button, Chip } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import NumberInput from '../../../components/common/NumberInput'
import Priorities from '../../../utils/Priorities'
import { ProjectAccessIcon } from '../../Projects/ProjectVisibilityField'
import CustomDueDateFields from './CustomDueDateFields'
import FilterConditionSection from './FilterConditionSection'

// Also used by the toolbar to translate due-date options.
export const DUE_DATE_OPTIONS = [
  { value: 'isOverdue', color: 'danger' },
  { value: 'isDueToday', color: 'warning' },
  { value: 'isDueTomorrow', color: 'primary' },
  { value: 'isDueThisWeek', color: 'primary' },
  { value: 'isDueThisMonth', color: 'neutral' },
  { value: 'hasNoDueDate', color: 'neutral' },
  { value: 'hasDueDate', color: 'neutral' },
]

export const POINTS_OPERATORS = [
  { value: 'greaterThan', label: '>' },
  { value: 'greaterThanOrEqual', label: '>=' },
  { value: 'equals', label: '=' },
  { value: 'lessThanOrEqual', label: '<=' },
  { value: 'lessThan', label: '<' },
]

export const CHORE_STATUSES = [
  { value: 0 },
  { value: 1 },
  { value: 2 },
  { value: 3 },
]

export const defaultSelections = () => ({
  assignee: { operator: 'is', values: [] },
  createdBy: { operator: 'is', values: [] },
  status: { operator: 'is', values: [] },
  priority: { operator: 'is', values: [] },
  label: { operator: 'is', values: [] },
  project: { operator: 'is', values: [] },
  dueDate: { operators: [], custom: { mode: 'relative', start: 0, end: 14 } },
  points: { operator: 'greaterThan', value: 0, active: false },
})

export const conditionsToSelections = conditions => {
  const sel = defaultSelections()
  if (!conditions) return sel
  conditions.forEach(c => {
    if (c.type === 'dueDate') {
      // Filters saved before multi-select carry a single operator.
      const entries =
        c.operator === 'anyOf'
          ? (Array.isArray(c.value) ? c.value : [c.value]).filter(Boolean)
          : [{ operator: c.operator, value: c.value }]
      sel.dueDate = {
        ...sel.dueDate,
        operators: entries
          .map(entry => (typeof entry === 'string' ? entry : entry.operator))
          .filter(Boolean),
        custom:
          entries.find(entry => entry?.operator === 'custom')?.value ??
          sel.dueDate.custom,
      }
    } else if (c.type === 'points') {
      sel.points = { operator: c.operator, value: c.value ?? 0, active: true }
    } else if (c.type in sel) {
      sel[c.type] = {
        operator: c.operator ?? 'is',
        values: Array.isArray(c.value)
          ? c.value
          : c.value != null
            ? [c.value]
            : [],
      }
    }
  })
  return sel
}

export const selectionsToConditions = selections => {
  const conditions = []
  ;['assignee', 'createdBy', 'status', 'priority', 'label', 'project'].forEach(
    type => {
      if (selections[type].values?.length > 0) {
        conditions.push({
          type,
          operator: selections[type].operator,
          value: selections[type].values,
        })
      }
    },
  )
  const dueDateOperators = (selections.dueDate.operators || []).map(operator =>
    operator === 'custom'
      ? { operator, value: selections.dueDate.custom }
      : operator,
  )
  if (dueDateOperators.length === 1) {
    // Preserve compatibility with filters predating `anyOf`.
    conditions.push({
      type: 'dueDate',
      operator: dueDateOperators[0].operator ?? dueDateOperators[0],
      value: dueDateOperators[0].value ?? null,
    })
  } else if (dueDateOperators.length > 1) {
    conditions.push({
      type: 'dueDate',
      operator: 'anyOf',
      value: dueDateOperators,
    })
  }
  if (selections.points.active) {
    conditions.push({
      type: 'points',
      operator: selections.points.operator,
      value: selections.points.value,
    })
  }
  return conditions
}

/** Shared by the toolbar filter sheet and saved-filter editor.
 * onSelectionsChange follows React's setState contract, including updaters.
 */
const FilterBuilderContent = ({
  labels = [],
  members = [],
  onSelectionsChange,
  projects = [],
  selections,
}) => {
  const { t } = useTranslation('chores')
  const toggleValue = (type, value) =>
    onSelectionsChange(prev => {
      const current = prev[type].values || []
      const values = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [type]: { ...prev[type], values } }
    })

  const setOperator = (type, operator) =>
    onSelectionsChange(prev => ({
      ...prev,
      [type]: { ...prev[type], operator },
    }))

  const personOptions = members.map(member => ({
    value: member.userId,
    label: member.displayName || member.username,
    startDecorator: (
      <Avatar
        src={member.image}
        alt={member.displayName}
        sx={{ '--Avatar-size': '20px' }}
      />
    ),
  }))
  const sections = [
    {
      type: 'assignee',
      icon: Person,
      label: t('filterBuilder.assignee'),
      visible: members.length > 0,
      options: [
        {
          value: 'available_for_me',
          label: t('toolbar.availableToMe'),
          startDecorator: <HowToReg sx={{ fontSize: 16 }} />,
          color: 'success',
        },
        ...personOptions,
      ],
    },
    {
      type: 'createdBy',
      icon: Person,
      label: t('filterBuilder.createdBy'),
      visible: members.length > 0,
      options: personOptions,
    },
    {
      type: 'status',
      icon: TaskAlt,
      label: t('filterBuilder.statusHeading'),
      options: CHORE_STATUSES.map(status => ({
        value: status.value,
        label: t(`filterBuilder.status.${status.value}`),
      })),
    },
    {
      type: 'priority',
      icon: PriorityHigh,
      label: t('filterBuilder.priority'),
      options: Priorities.map(priority => ({
        value: priority.value,
        label: priority.name,
        color: priority.color,
        startDecorator: priority.icon,
      })),
    },
    {
      type: 'dueDate',
      icon: CalendarMonth,
      label: t('filterBuilder.dueDate'),
      options: [...DUE_DATE_OPTIONS, { value: 'custom' }].map(option => ({
        ...option,
        label: t(`filterBuilder.dueDateOption.${option.value}`),
      })),
    },
    {
      type: 'label',
      icon: Label,
      label: t('filterBuilder.labels'),
      visible: labels.length > 0,
      operatorLabels: ['has', 'doesntHave'],
      options: labels.map(label => ({
        value: label.id,
        label: label.name,
        startDecorator: (
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: label.color || '#90a4ae',
              flexShrink: 0,
            }}
          />
        ),
      })),
    },
    {
      type: 'project',
      icon: FolderOpen,
      label: t('filterBuilder.projects'),
      visible: projects.length > 0,
      options: [
        { value: 'default', label: t('filterBuilder.defaultProject') },
        ...projects
          .filter(project => project.id !== 'default')
          .map(project => ({
            value: project.id,
            label: project.name,
            startDecorator: (
              <ProjectAccessIcon project={project} sx={{ fontSize: 14 }} />
            ),
          })),
      ],
    },
  ]

  const toggleDueDate = operator =>
    onSelectionsChange(prev => {
      const current = prev.dueDate.operators || []
      return {
        ...prev,
        dueDate: {
          ...prev.dueDate,
          operators: current.includes(operator)
            ? current.filter(value => value !== operator)
            : [...current, operator],
        },
      }
    })

  return (
    <Box sx={{ minWidth: 0 }}>
      {sections
        .filter(section => section.visible !== false)
        .map(section => {
          const { options, type } = section
          const isDueDate = type === 'dueDate'
          const selection = selections[type]
          const selected =
            (isDueDate ? selection.operators : selection.values) || []
          const summary = selected
            .map(
              value =>
                options.find(option => String(option.value) === String(value))
                  ?.label ?? String(value),
            )
            .join(', ')
          return (
            <FilterConditionSection
              key={type}
              type={type}
              icon={section.icon}
              label={section.label}
              selection={selection}
              summary={
                isDueDate && selected.length > 1
                  ? `${t('filterBuilder.anyOf')} · ${summary}`
                  : summary
              }
              operatorLabels={section.operatorLabels}
              onOperatorChange={
                isDueDate ? undefined : operator => setOperator(type, operator)
              }
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {options.map(option => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <Chip
                      key={option.value}
                      variant={isSelected ? 'solid' : 'soft'}
                      color={
                        isSelected ? (option.color ?? 'primary') : 'neutral'
                      }
                      startDecorator={
                        isSelected ? (
                          <Check sx={{ fontSize: 14 }} />
                        ) : (
                          option.startDecorator
                        )
                      }
                      onClick={() =>
                        isDueDate
                          ? toggleDueDate(option.value)
                          : toggleValue(type, option.value)
                      }
                      slotProps={{ action: { 'aria-pressed': isSelected } }}
                      sx={{ userSelect: 'none', transition: 'all 0.15s ease' }}
                    >
                      {option.label}
                    </Chip>
                  )
                })}
              </Box>
              {isDueDate && selected.includes('custom') && (
                <CustomDueDateFields
                  value={selection.custom}
                  onChange={custom =>
                    onSelectionsChange(prev => ({
                      ...prev,
                      dueDate: { ...prev.dueDate, custom },
                    }))
                  }
                />
              )}
              {selected.length > 0 && (
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  sx={{ mt: 1.5 }}
                  onClick={() =>
                    onSelectionsChange(prev => ({
                      ...prev,
                      [type]: isDueDate
                        ? { ...prev[type], operators: [] }
                        : { ...prev[type], values: [] },
                    }))
                  }
                >
                  {t('filterBuilder.clear')}
                </Button>
              )}
            </FilterConditionSection>
          )
        })}
      <FilterConditionSection
        type='points'
        icon={Stars}
        label={t('filterBuilder.points')}
        selection={selections.points}
        summary={
          selections.points.active
            ? `${POINTS_OPERATORS.find(operator => operator.value === selections.points.operator)?.label ?? selections.points.operator} ${selections.points.value}`
            : ''
        }
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {POINTS_OPERATORS.map(operator => {
            const selected =
              selections.points.operator === operator.value &&
              selections.points.active
            return (
              <Chip
                key={operator.value}
                size='sm'
                variant={selected ? 'solid' : 'soft'}
                color={selected ? 'primary' : 'neutral'}
                onClick={() =>
                  onSelectionsChange(prev => ({
                    ...prev,
                    points: {
                      ...prev.points,
                      operator: operator.value,
                      active: true,
                    },
                  }))
                }
                slotProps={{ action: { 'aria-pressed': selected } }}
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
              >
                {operator.label}
              </Chip>
            )
          })}
          <NumberInput
            size='sm'
            aria-label={t('filterBuilder.points')}
            value={selections.points.value}
            min={0}
            onValueChange={value =>
              onSelectionsChange(prev => ({
                ...prev,
                points: { ...prev.points, value, active: true },
              }))
            }
            sx={{ width: 80 }}
          />
          {selections.points.active && (
            <Chip
              size='sm'
              variant='soft'
              color='danger'
              onClick={() =>
                onSelectionsChange(prev => ({
                  ...prev,
                  points: { ...prev.points, active: false, value: 0 },
                }))
              }
            >
              {t('filterBuilder.clear')}
            </Chip>
          )}
        </Box>
      </FilterConditionSection>
    </Box>
  )
}

export default FilterBuilderContent
