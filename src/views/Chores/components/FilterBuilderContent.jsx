import {
  CalendarMonth,
  Check,
  FolderOpen,
  Label,
  Person,
  PriorityHigh,
  Stars,
  TaskAlt,
} from '@mui/icons-material'
import { Avatar, Box, Chip, Divider, Input, Typography } from '@mui/joy'

import Priorities from '../../../utils/Priorities'

export const DUE_DATE_OPTIONS = [
  { value: 'isOverdue', label: 'Overdue', color: 'danger' },
  { value: 'isDueToday', label: 'Today', color: 'warning' },
  { value: 'isDueTomorrow', label: 'Tomorrow', color: 'primary' },
  { value: 'isDueThisWeek', label: 'This Week', color: 'primary' },
  { value: 'isDueThisMonth', label: 'This Month', color: 'neutral' },
  { value: 'hasNoDueDate', label: 'No Due Date', color: 'neutral' },
  { value: 'hasDueDate', label: 'Has Due Date', color: 'neutral' },
]

export const POINTS_OPERATORS = [
  { value: 'greaterThan', label: '>' },
  { value: 'greaterThanOrEqual', label: '>=' },
  { value: 'equals', label: '=' },
  { value: 'lessThanOrEqual', label: '<=' },
  { value: 'lessThan', label: '<' },
]

export const CHORE_STATUSES = [
  { value: 0, label: 'Active' },
  { value: 1, label: 'Started' },
  { value: 2, label: 'In Progress' },
  { value: 3, label: 'Pending Approval' },
]

export const defaultSelections = () => ({
  assignee: { operator: 'is', values: [] },
  createdBy: { operator: 'is', values: [] },
  status: { operator: 'is', values: [] },
  priority: { operator: 'is', values: [] },
  label: { operator: 'is', values: [] },
  project: { operator: 'is', values: [] },
  dueDate: { operator: null },
  points: { operator: 'greaterThan', value: 0, active: false },
})

export const conditionsToSelections = conditions => {
  const sel = defaultSelections()
  if (!conditions) return sel
  conditions.forEach(c => {
    if (c.type === 'dueDate') {
      sel.dueDate = { operator: c.operator }
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
  if (selections.dueDate.operator) {
    conditions.push({
      type: 'dueDate',
      operator: selections.dueDate.operator,
      value: null,
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

const SectionHeader = ({ children, icon, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Box
      sx={{
        color: 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        '& svg': { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
    <Typography level='title-sm' sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    {children}
  </Box>
)

const IncludeExcludeToggle = ({
  labels = ['Include', 'Exclude'],
  onChange,
  value,
}) => (
  <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
    {[
      { op: 'is', label: labels[0] },
      { op: 'isNot', label: labels[1] },
    ].map(o => (
      <Chip
        key={o.op}
        size='sm'
        variant={value === o.op ? 'solid' : 'soft'}
        color={
          value === o.op ? (o.op === 'isNot' ? 'danger' : 'primary') : 'neutral'
        }
        onClick={() => onChange(o.op)}
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {o.label}
      </Chip>
    ))}
  </Box>
)

/**
 * Reusable filter conditions UI used by both the filter sheet in ChoreToolbar
 * and the AdvancedFilterBuilder save modal.
 *
 * `onSelectionsChange` must accept either a new selections object or a
 * functional updater `prev => next` (same contract as React's setState setter).
 */
const FilterBuilderContent = ({
  labels = [],
  members = [],
  onSelectionsChange,
  projects = [],
  selections,
}) => {
  const toggleValue = (type, value) =>
    onSelectionsChange(prev => {
      const cur = prev[type].values || []
      const next = cur.includes(value)
        ? cur.filter(v => v !== value)
        : [...cur, value]
      return { ...prev, [type]: { ...prev[type], values: next } }
    })

  const setOperator = (type, op) =>
    onSelectionsChange(prev => ({
      ...prev,
      [type]: { ...prev[type], operator: op },
    }))

  const toggleDueDate = op =>
    onSelectionsChange(prev => ({
      ...prev,
      dueDate: { operator: prev.dueDate.operator === op ? null : op },
    }))

  const setPointsOperator = op =>
    onSelectionsChange(prev => ({
      ...prev,
      points: { ...prev.points, operator: op, active: true },
    }))

  const setPointsValue = val =>
    onSelectionsChange(prev => ({
      ...prev,
      points: { ...prev.points, value: val, active: val > 0 },
    }))

  const chipRow = (type, options, getChipProps) => {
    const selected = selections[type].values || []
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map(opt => {
          const isSelected = selected.includes(opt.value)
          const extra = getChipProps ? getChipProps(opt, isSelected) : {}
          return (
            <Chip
              key={opt.value}
              variant={isSelected ? 'solid' : 'soft'}
              color={isSelected ? (extra.color ?? 'primary') : 'neutral'}
              startDecorator={
                isSelected ? (
                  <Check sx={{ fontSize: 14 }} />
                ) : (
                  (extra.startDecorator ?? null)
                )
              }
              onClick={() => toggleValue(type, opt.value)}
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </Chip>
          )
        })}
      </Box>
    )
  }

  const personChipRow = type => {
    const selected = selections[type].values || []
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {members.map(m => {
          const isSelected = selected.includes(m.userId)
          return (
            <Chip
              key={m.userId}
              variant={isSelected ? 'solid' : 'soft'}
              color={isSelected ? 'primary' : 'neutral'}
              startDecorator={
                isSelected ? (
                  <Check sx={{ fontSize: 14 }} />
                ) : (
                  <Avatar
                    src={m.image}
                    alt={m.displayName}
                    sx={{ '--Avatar-size': '20px' }}
                  />
                )
              }
              onClick={() => toggleValue(type, m.userId)}
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {m.displayName || m.username}
            </Chip>
          )
        })}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Assignee */}
      {members.length > 0 && (
        <>
          <SectionHeader icon={<Person />} label='Assignee'>
            <IncludeExcludeToggle
              value={selections.assignee.operator}
              onChange={op => setOperator('assignee', op)}
            />
          </SectionHeader>
          {personChipRow('assignee')}
          <Divider sx={{ my: 2.5 }} />
        </>
      )}

      {/* Created By */}
      {members.length > 0 && (
        <>
          <SectionHeader icon={<Person />} label='Created By'>
            <IncludeExcludeToggle
              value={selections.createdBy.operator}
              onChange={op => setOperator('createdBy', op)}
            />
          </SectionHeader>
          {personChipRow('createdBy')}
          <Divider sx={{ my: 2.5 }} />
        </>
      )}

      {/* Status */}
      <SectionHeader icon={<TaskAlt />} label='Status'>
        <IncludeExcludeToggle
          value={selections.status.operator}
          onChange={op => setOperator('status', op)}
        />
      </SectionHeader>
      {chipRow('status', CHORE_STATUSES)}
      <Divider sx={{ my: 2.5 }} />

      {/* Priority */}
      <SectionHeader icon={<PriorityHigh />} label='Priority'>
        <IncludeExcludeToggle
          value={selections.priority.operator}
          onChange={op => setOperator('priority', op)}
        />
      </SectionHeader>
      {chipRow(
        'priority',
        Priorities.map(p => ({ value: p.value, label: p.name })),
        (opt, isSelected) => ({
          color: isSelected
            ? Priorities.find(p => p.value === opt.value)?.color || 'primary'
            : 'neutral',
          startDecorator: !isSelected
            ? Priorities.find(p => p.value === opt.value)?.icon
            : null,
        }),
      )}
      <Divider sx={{ my: 2.5 }} />

      {/* Due Date */}
      <SectionHeader icon={<CalendarMonth />} label='Due Date' />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {DUE_DATE_OPTIONS.map(opt => {
          const isSelected = selections.dueDate.operator === opt.value
          return (
            <Chip
              key={opt.value}
              variant={isSelected ? 'solid' : 'soft'}
              color={isSelected ? (opt.color ?? 'primary') : 'neutral'}
              startDecorator={
                isSelected ? <Check sx={{ fontSize: 14 }} /> : null
              }
              onClick={() => toggleDueDate(opt.value)}
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </Chip>
          )
        })}
      </Box>
      <Divider sx={{ my: 2.5 }} />

      {/* Labels */}
      {labels.length > 0 && (
        <>
          <SectionHeader icon={<Label />} label='Labels'>
            <IncludeExcludeToggle
              value={selections.label.operator}
              onChange={op => setOperator('label', op)}
              labels={['Has', "Doesn't Have"]}
            />
          </SectionHeader>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {labels.map(lbl => {
              const isSelected = selections.label.values.includes(lbl.id)
              return (
                <Chip
                  key={lbl.id}
                  variant={isSelected ? 'solid' : 'soft'}
                  color='neutral'
                  startDecorator={
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: lbl.color || '#90a4ae',
                        flexShrink: 0,
                      }}
                    />
                  }
                  endDecorator={
                    isSelected ? <Check sx={{ fontSize: 12 }} /> : null
                  }
                  onClick={() => toggleValue('label', lbl.id)}
                  sx={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    ...(isSelected && {
                      outline: '2px solid',
                      outlineColor: 'primary.400',
                    }),
                  }}
                >
                  {lbl.name}
                </Chip>
              )
            })}
          </Box>
          <Divider sx={{ my: 2.5 }} />
        </>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <>
          <SectionHeader icon={<FolderOpen />} label='Projects'>
            <IncludeExcludeToggle
              value={selections.project.operator}
              onChange={op => setOperator('project', op)}
            />
          </SectionHeader>
          {chipRow('project', [
            { value: 'default', label: 'Default Project' },
            ...projects
              .filter(p => p.id !== 'default')
              .map(p => ({ value: p.id, label: p.name })),
          ])}
          <Divider sx={{ my: 2.5 }} />
        </>
      )}

      {/* Points */}
      <SectionHeader icon={<Stars />} label='Points' />
      <Box
        sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
      >
        {POINTS_OPERATORS.map(op => (
          <Chip
            key={op.value}
            size='sm'
            variant={
              selections.points.operator === op.value &&
              selections.points.active
                ? 'solid'
                : 'soft'
            }
            color={
              selections.points.operator === op.value &&
              selections.points.active
                ? 'primary'
                : 'neutral'
            }
            onClick={() => setPointsOperator(op.value)}
            sx={{
              cursor: 'pointer',
              userSelect: 'none',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}
          >
            {op.label}
          </Chip>
        ))}
        <Input
          type='number'
          size='sm'
          value={selections.points.value}
          onChange={e => setPointsValue(parseInt(e.target.value) || 0)}
          sx={{ width: 80 }}
          slotProps={{ input: { min: 0 } }}
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
            sx={{ cursor: 'pointer' }}
          >
            Clear
          </Chip>
        )}
      </Box>
    </Box>
  )
}

export default FilterBuilderContent
