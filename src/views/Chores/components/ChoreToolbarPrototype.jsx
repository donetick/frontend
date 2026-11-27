/**
 * PROTOTYPE – Unified Chore Toolbar
 *
 * Proposed design to replace the current 3-surface layout:
 *   OLD: [Search] [Sort+Group+AssigneeFilter+CreateFilter] [ProjectSelector] [View] [Multiselect]
 *        + FilterBar (Due Date / Priority / Labels chips row)
 *        + FilterSection (saved/pinned filter chips row)
 *
 *   NEW: [Search] [Project] [Filter(n)] [Sort + Group] [Display] [Multiselect]
 *        + active filter chips appear below the toolbar
 *        + Filter button opens ONE unified bottom sheet containing:
 *            Assignee · Created By · Status · Priority · Due Date · Labels · Projects · Points
 *            + Saved Filters section
 *        + Sort and Group share a focused menu; Display handles presentation
 *
 * How to try it: in MyChores.jsx, replace the <Box sx={{display:'flex'...}}> toolbar block
 * and the two rows below it (FilterBar + FilterSection) with:
 *   <ChoreToolbar ... />
 */

import {
  ArrowDownward,
  ArrowDropDown,
  ArrowUpward,
  AutoAwesome,
  CalendarMonth,
  Category,
  Check,
  CheckBox,
  CheckBoxOutlineBlank,
  DisplaySettings,
  Edit,
  EventAvailable,
  Flag,
  FormatListBulleted,
  Groups,
  Label,
  People,
  Person,
  Save,
  Schedule,
  Settings,
  Sort,
  Tune,
  Update,
  ViewAgenda,
  ViewComfy,
  ViewKanban,
} from '@mui/icons-material'
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Dropdown,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../../components/common/AppModal'
import ActiveFilterChips from '../../../components/common/filter/ActiveFilterChips'
import ItemPrivacyField from '../../../components/common/ItemPrivacyField'
import PageActions from '../../../components/PageActions'
import { PAYWALL_REASON, usePaywall } from '../../../contexts/PaywallContext'
import { useUserProfile } from '../../../queries/UserQueries'
import { FILTER_COLORS } from '../../../utils/Colors'
import { canCreateQuickFilter } from '../../../utils/entitlements'
import Priorities from '../../../utils/Priorities'
import ProjectModal from '../../Modals/Inputs/ProjectModal'
import CustomFilterChips from './CustomFilterChips'
import FilterBuilderContent, {
  CHORE_STATUSES,
  conditionsToSelections,
  defaultSelections,
  DUE_DATE_OPTIONS,
  POINTS_OPERATORS,
  selectionsToConditions,
} from './FilterBuilderContent'
import SearchBar from './SearchBar'

// ─── main component ───────────────────────────────────────────────────────────

/**
 * Props:
 *  -- Advanced filter (filter sheet) --
 *  members           – circle members for Assignee / Created By sections
 *  labels            – user labels for Labels section
 *  projects          – projects list (projectsWithDefault) for Projects section + Display sheet
 *  tempFilter        – current temp filter object { conditions, operator } or null
 *  tempFilterMeta    – metadata for temp filter, including saved-filter edit source when applicable
 *  applyTempFilter   – (filter) => void  — called immediately as selections change
 *  clearTempFilter   – () => void
 *  saveFilter        – (filterData) => Promise  — saves as a named filter
 *  updateFilter      – (filterId, filterData) => Promise  — updates an existing saved filter
 *  onFilterSaved     – (name) => void  — called after successful save (for notifications)
 *
 *  -- Result counts --
 *  resultCount / totalCount
 *
 *  -- Clear all --
 *  onClearAllFilters – () => void
 *
 *  -- Saved filters --
 *  savedFilters      – [{ id, name, color, count, isPinned }]
 *  activeFilterId    – number | null
 *  onSavedFilterClick – (id) => void
 *  onSavedFilterEdit  – (filter) => void
 *  onSavedFilterDelete– (id) => void
 *  onSavedFilterPin   – (id) => void
 *
 *  -- Display sheet --
 *  selectedProject   – current project object (for Display sheet section)
 *  onProjectSelect   – (project) => void
 *  selectedAssigneeFilter – 'anyone' | 'assigned_to_me' | 'available_for_me' | 'assigned_to_others'
 *  onAssigneeFilterChange – (key) => void
 *  selectedGroupBy   – 'default' | 'due_date' | 'priority' | 'labels'
 *  onGroupBySelect   – (value) => void
 *  selectedSort      – 'smart' | 'due_date' | 'priority' | 'created_date' | 'updated_date'
 *  onSortChange      – (value) => void
 *  sortDirection     – 'asc' | 'desc'
 *  onSortDirectionChange – (value) => void
 *  viewMode          – 'default' | 'compact' | 'calendar'
 *  onToggleViewMode  – (value?) => void
 *
 *  -- Multi-select --
 *  isMultiSelectMode – bool
 *  onToggleMultiSelect – () => void
 *
 *  -- Search --
 *  searchTerm / onSearchChange / onSearchClose / searchInputRef
 *  showKeyboardShortcuts
 */
const ChoreToolbar = ({
  // advanced filter
  activeFilterId,
  applyTempFilter,
  clearTempFilter,
  enableBoard = false,
  isMultiSelectMode,
  labels = [],
  members = [],
  onAssigneeFilterChange,
  onClearAllFilters,
  onFilterSaved,
  onGroupBySelect,
  // result counts
  onProjectSelect,
  onSavedFilterClick,
  // clear all
  onSavedFilterDelete,
  // project (for Display sheet)
  onSavedFilterEdit,
  onSavedFilterPin,
  // assignee (for Display sheet)
  onSearchChange,
  onSearchClose,
  onSortChange,
  onSortDirectionChange,
  // saved / custom
  onToggleMultiSelect,
  onToggleViewMode,
  projects = [],
  resultCount,
  saveFilter,
  savedFilters = [],
  // grouping
  searchInputRef,
  searchTerm,
  // view + multiselect
  selectedAssigneeFilter = 'anyone',
  selectedGroupBy = 'default',
  selectedProject,
  selectedSort = 'smart',
  showKeyboardShortcuts,
  sortDirection = 'asc',
  // search
  tempFilter,
  tempFilterMeta,
  totalCount,
  updateFilter,
  viewMode = 'default',
}) => {
  const { t } = useTranslation('chores')
  const { isPlus, showPaywall } = usePaywall()
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [localSelections, setLocalSelections] = useState(defaultSelections())
  const { data: userProfile } = useUserProfile()
  const [saveFilterShared, setSaveFilterShared] = useState(false)
  const [savingFilter, setSavingFilter] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [editingSavedFilter, setEditingSavedFilter] = useState(null)
  const activeConditions = selectionsToConditions(localSelections)

  // ── badge counts ─────────────────────────────────────────────────────────────

  const tempConditionCount = tempFilter?.conditions?.length || 0
  const savedFilterActive = activeFilterId != null ? 1 : 0
  const totalActiveCount = tempConditionCount + savedFilterActive
  const hasAnyActive = totalActiveCount > 0

  // ── inline chip strip ────────────────────────────────────────────────────────

  const inlineChips = []

  const getConditionChipLabel = condition => {
    if (!condition?.type) return 'Filter'

    const typeLabels = {
      assignee: t('filterBuilder.assignee'),
      createdBy: t('filterBuilder.createdBy'),
      status: t('filterBuilder.statusHeading'),
      priority: t('filterBuilder.priority'),
      label: t('labels.label'),
      project: t('filterBuilder.project'),
      dueDate: t('filterBuilder.dueDate'),
      points: t('filterBuilder.points'),
    }

    const typeLabel =
      typeLabels[condition.type] || t('filterBuilder.filterFallback')
    const prefix =
      condition.operator === 'isNot' ? t('filterBuilder.notPrefix') : ''

    if (condition.type === 'dueDate') {
      const describeDueDate = op =>
        DUE_DATE_OPTIONS.some(o => o.value === op)
          ? t(`filterBuilder.dueDateOption.${op}`)
          : t('filterBuilder.customDueDate.label')
      const dueDateLabel =
        condition.operator === 'anyOf'
          ? (Array.isArray(condition.value) ? condition.value : [])
              .map(describeDueDate)
              .join(' / ')
          : describeDueDate(condition.operator)
      return `${typeLabel}: ${dueDateLabel}`
    }

    if (condition.type === 'points') {
      const pointsOp =
        POINTS_OPERATORS.find(o => o.value === condition.operator)?.label ||
        condition.operator ||
        ''
      return `${typeLabel} ${pointsOp} ${condition.value ?? 0}`
    }

    const rawValues = Array.isArray(condition.value)
      ? condition.value
      : condition.value != null
        ? [condition.value]
        : []

    const resolveLabel = value => {
      if (condition.type === 'assignee' || condition.type === 'createdBy') {
        // Sentinel scope values (not real member ids) FilterEngine's
        // evaluateAssignee special-cases — must be translated here rather
        // than falling through to the raw member lookup below.
        const assigneeSentinelLabels = {
          me: t('toolbar.mine'),
          others: t('toolbar.others'),
          anyone: t('toolbar.everyone'),
          available_for_me: t('toolbar.availableToMe'),
        }
        if (condition.type === 'assignee' && value in assigneeSentinelLabels) {
          return assigneeSentinelLabels[value]
        }
        const member = members.find(m => m.userId === value)
        return member?.displayName || member?.username || String(value)
      }
      if (condition.type === 'status') {
        return CHORE_STATUSES.some(s => s.value === value)
          ? t(`filterBuilder.status.${value}`)
          : String(value)
      }
      if (condition.type === 'priority') {
        return Priorities.find(p => p.value === value)?.name || String(value)
      }
      if (condition.type === 'label') {
        return labels.find(l => l.id === value)?.name || String(value)
      }
      if (condition.type === 'project') {
        if (value === 'default') return 'Default Project'
        const project = projects.find(p => p.id === value)
        if (!project) return String(value)
        return project.isPrivate ? `🔒 ${project.name}` : project.name
      }
      return String(value)
    }

    if (rawValues.length === 0) {
      return `${prefix}${typeLabel}`
    }

    if (rawValues.length === 1) {
      return `${prefix}${typeLabel}: ${resolveLabel(rawValues[0])}`
    }

    return `${prefix}${typeLabel} (${rawValues.length})`
  }

  const activeSavedFilter = savedFilterActive
    ? savedFilters.find(f => f.id === activeFilterId)
    : null

  const activeChipConditions = savedFilterActive
    ? activeSavedFilter?.conditions || []
    : tempFilter?.conditions || []

  const savedFilterEditMeta = activeSavedFilter
    ? {
        name: activeSavedFilter.name,
        description: activeSavedFilter.description,
        sourceFilterId: activeSavedFilter.id,
        sourceFilterName: activeSavedFilter.name,
        sourceFilterDescription: activeSavedFilter.description,
        sourceFilterColor: activeSavedFilter.color,
        isEditingSavedFilter: true,
      }
    : null

  const clearConditionAtIndex = index => {
    const nextConditions = activeChipConditions.filter(
      (_condition, conditionIndex) => conditionIndex !== index,
    )

    if (nextConditions.length === 0) {
      setLocalSelections(defaultSelections())
      clearTempFilter?.()
      // A saved filter still owns the view until it's toggled back off.
      if (savedFilterActive) onSavedFilterClick?.(activeFilterId)
      return
    }

    setLocalSelections(conditionsToSelections(nextConditions))

    // Dropping a condition from a saved filter detaches it into a temp filter
    // that remembers its source, rather than editing the saved filter itself.
    if (savedFilterActive) {
      applyTempFilter?.(
        {
          conditions: nextConditions,
          operator: activeSavedFilter?.operator || 'AND',
        },
        savedFilterEditMeta,
      )
      return
    }

    applyTempFilter?.(
      {
        ...tempFilter,
        operator: tempFilter?.operator || 'AND',
        conditions: nextConditions,
      },
      tempFilterMeta,
    )
  }

  activeChipConditions.forEach((condition, index) => {
    inlineChips.push({
      key: `${savedFilterActive ? '__saved' : '__temp'}_${index}`,
      label: getConditionChipLabel(condition),
      onClear: () => clearConditionAtIndex(index),
    })
  })

  // ── open filter sheet ────────────────────────────────────────────────────────

  const openFilterSheet = () => {
    if (tempFilter?.conditions?.length > 0) {
      setLocalSelections(conditionsToSelections(tempFilter.conditions))
      if (tempFilterMeta?.sourceFilterId) {
        const sourceFilter =
          savedFilters.find(f => f.id === tempFilterMeta.sourceFilterId) || null
        setEditingSavedFilter(
          sourceFilter ||
            (tempFilterMeta.sourceFilterId
              ? {
                  id: tempFilterMeta.sourceFilterId,
                  name: tempFilterMeta.sourceFilterName,
                  description: tempFilterMeta.sourceFilterDescription,
                  color: tempFilterMeta.sourceFilterColor,
                }
              : null),
        )
      } else {
        setEditingSavedFilter(null)
      }
    } else if (activeFilterId) {
      const sf = savedFilters.find(f => f.id === activeFilterId)
      setEditingSavedFilter(sf || null)
      setLocalSelections(
        sf?.conditions
          ? conditionsToSelections(sf.conditions)
          : defaultSelections(),
      )
    } else {
      setEditingSavedFilter(null)
      setLocalSelections(defaultSelections())
    }
    setSavingFilter(false)
    setSaveFilterName('')
    setSaveMenuOpen(false)
    setFilterSheetOpen(true)
  }

  useEffect(() => {
    if (!filterSheetOpen || savingFilter || activeConditions.length === 0) {
      setSaveMenuOpen(false)
    }
  }, [filterSheetOpen, savingFilter, activeConditions.length])

  // ── selection changes → apply temp filter immediately ────────────────────────

  const handleSelectionsChange = updater => {
    setLocalSelections(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const conditions = selectionsToConditions(next)
      if (conditions.length > 0) {
        applyTempFilter?.(
          { conditions, operator: 'AND' },
          editingSavedFilter
            ? {
                name: editingSavedFilter.name,
                description: editingSavedFilter.description,
                sourceFilterId: editingSavedFilter.id,
                sourceFilterName: editingSavedFilter.name,
                sourceFilterDescription: editingSavedFilter.description,
                sourceFilterColor: editingSavedFilter.color,
                isEditingSavedFilter: true,
              }
            : null,
        )
      } else {
        clearTempFilter?.()
      }
      return next
    })
  }

  // ── save filter ───────────────────────────────────────────────────────────────

  // Saving the current selections as a new named filter counts against the
  // free allowance; updating one that already exists doesn't.
  const canSaveNewFilter = canCreateQuickFilter(savedFilters.length, isPlus)

  const startSavingNewFilter = () => {
    setSaveMenuOpen(false)
    if (!canSaveNewFilter) {
      showPaywall(PAYWALL_REASON.QUICK_FILTER_LIMIT)
      return
    }
    setSaveFilterName(
      editingSavedFilter ? `${editingSavedFilter.name} Copy` : '',
    )
    setSaveFilterShared(editingSavedFilter?.isShared ?? false)
    setSavingFilter(true)
  }

  const handleSaveFilter = () => {
    const name = saveFilterName.trim()
    if (!name) return
    if (!canSaveNewFilter) {
      showPaywall(PAYWALL_REASON.QUICK_FILTER_LIMIT)
      setSavingFilter(false)
      return
    }
    const conditions = selectionsToConditions(localSelections)
    if (conditions.length === 0) return

    const usedColors = savedFilters.map(f => f.color)
    const color =
      FILTER_COLORS.find(c => !usedColors.includes(c.value))?.value ??
      FILTER_COLORS[0].value

    saveFilter?.({
      name,
      isShared: saveFilterShared,
      description: '',
      color,
      conditions,
      operator: 'AND',
    })
      ?.then?.(() => {
        applyTempFilter?.({ conditions, operator: 'AND' }, { name })
        onFilterSaved?.(name)
      })
      ?.catch?.(() => {})

    setSavingFilter(false)
    setSaveFilterName('')
    setFilterSheetOpen(false)
  }

  const handleUpdateFilter = () => {
    if (
      !editingSavedFilter?.id ||
      !updateFilter ||
      editingSavedFilter.createdBy !== userProfile?.id
    )
      return

    const conditions = selectionsToConditions(localSelections)
    if (conditions.length === 0) return

    updateFilter(editingSavedFilter.id, {
      name: editingSavedFilter.name,
      description: editingSavedFilter.description || '',
      color: editingSavedFilter.color,
      isShared: editingSavedFilter.isShared ?? false,
      isPinned: editingSavedFilter.isPinned ?? false,
      conditions,
      operator: 'AND',
    })?.then?.(() => {
      clearTempFilter?.()
      onSavedFilterClick?.(editingSavedFilter.id)
      onFilterSaved?.(editingSavedFilter.name)
    })

    setSaveMenuOpen(false)
    setFilterSheetOpen(false)
  }

  // ── display sheet helpers ────────────────────────────────────────────────────

  const filterActive = activeFilterId != null || tempConditionCount > 0

  const fieldIconSx = { fontSize: 18 }

  const sortOptions = [
    {
      value: 'smart',
      name: t('sort.smart'),
      icon: <AutoAwesome sx={fieldIconSx} />,
    },
    {
      value: 'due_date',
      name: t('dueDate'),
      icon: <CalendarMonth sx={fieldIconSx} />,
    },
    { value: 'priority', name: t('priority'), icon: <Flag sx={fieldIconSx} /> },
    {
      value: 'created_date',
      name: t('sort.createdDate'),
      icon: <Schedule sx={fieldIconSx} />,
    },
    {
      value: 'updated_date',
      name: t('sort.updatedDate'),
      icon: <Update sx={fieldIconSx} />,
    },
  ]

  const groupByOptions = [
    {
      value: 'default',
      name: t('sort.smart'),
      icon: <AutoAwesome sx={fieldIconSx} />,
    },
    {
      value: 'due_date',
      name: t('dueDate'),
      icon: <CalendarMonth sx={fieldIconSx} />,
    },
    { value: 'priority', name: t('priority'), icon: <Flag sx={fieldIconSx} /> },
    {
      value: 'labels',
      name: t('labels.label'),
      icon: <Label sx={fieldIconSx} />,
    },
    {
      value: 'created_date',
      name: t('sort.createdDate'),
      icon: <Schedule sx={fieldIconSx} />,
    },
    {
      value: 'updated_date',
      name: t('sort.updatedDate'),
      icon: <Update sx={fieldIconSx} />,
    },
  ]

  const directionOptions = [
    {
      value: 'asc',
      label: t('common:sortAndFilter.ascending'),
      icon: <ArrowUpward sx={fieldIconSx} />,
    },
    {
      value: 'desc',
      label: t('common:sortAndFilter.descending'),
      icon: <ArrowDownward sx={fieldIconSx} />,
    },
  ]

  const assigneeOptions = [
    {
      value: 'anyone',
      label: t('toolbar.everyone'),
      icon: <Groups sx={fieldIconSx} />,
    },
    {
      value: 'assigned_to_me',
      label: t('toolbar.mine'),
      icon: <Person sx={fieldIconSx} />,
    },
    {
      value: 'available_for_me',
      label: t('toolbar.availableToMe'),
      icon: <EventAvailable sx={fieldIconSx} />,
    },
    {
      value: 'assigned_to_others',
      label: t('toolbar.others'),
      icon: <People sx={fieldIconSx} />,
    },
  ]

  const viewOptions = [
    {
      value: 'default',
      label: t('toolbar.cards'),
      icon: <ViewAgenda sx={{ fontSize: 16 }} />,
    },
    {
      value: 'compact',
      label: t('toolbar.compact'),
      icon: <ViewComfy sx={{ fontSize: 16 }} />,
    },
    {
      value: 'calendar',
      label: t('toolbar.calendar'),
      icon: <CalendarMonth sx={{ fontSize: 16 }} />,
    },
    ...(enableBoard
      ? [
          {
            value: 'project-list',
            label: t('toolbar.list'),
            icon: <FormatListBulleted sx={{ fontSize: 16 }} />,
          },
          {
            value: 'board',
            label: t('toolbar.board'),
            icon: <ViewKanban sx={{ fontSize: 16 }} />,
          },
        ]
      : []),
  ]

  // ── action-menu panels ───────────────────────────────────────────────────────
  // Sort, order, and group each get their own dedicated panel now, so picking
  // an option is a complete action — the whole menu closes rather than
  // staying open for a second pick the way a combined sort+direction panel
  // would need to.

  // Each option here carries its own identifying icon (a calendar for due
  // date, a flag for priority, …), so selection is shown via the row's
  // `selected` highlight rather than displacing that icon with a check mark —
  // same convention as viewOptions below.
  const sortByPanelItems = sortOptions.map(option => ({
    key: `sort-${option.value}`,
    label: option.name,
    icon: option.icon,
    onClick: () => onSortChange(option.value),
    selected: selectedSort === option.value,
  }))

  const orderByPanelItems = directionOptions.map(option => ({
    key: `order-${option.value}`,
    label: option.label,
    icon: option.icon,
    onClick: () => onSortDirectionChange(option.value),
    selected: sortDirection === option.value,
  }))

  const groupByPanelItems = groupByOptions.map(option => ({
    key: `group-${option.value}`,
    label: option.name,
    icon: option.icon,
    onClick: () => onGroupBySelect(option.value),
    selected: selectedGroupBy === option.value,
  }))

  const displayPanelItems = [
    { key: 'view', type: 'header', label: t('actionMenu.view') },
    ...viewOptions.map(option => ({
      key: `view-${option.value}`,
      label: option.label,
      keepOpen: true,
      onClick: () => onToggleViewMode?.(option.value),
      // The view's own icon is what identifies it; a check would displace it.
      selected: viewMode === option.value,
      icon: option.icon,
    })),
    { key: 'assignee-divider', type: 'divider' },
    { key: 'assignee', type: 'header', label: t('toolbar.showTasksFor') },
    ...assigneeOptions.map(option => ({
      key: `assignee-${option.value}`,
      label: option.label,
      icon: option.icon,
      keepOpen: true,
      onClick: () => onAssigneeFilterChange?.(option.value),
      selected: selectedAssigneeFilter === option.value,
    })),
  ]

  return (
    <>
      {/* ── Row 1: main toolbar ─────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          justifyContent: 'space-between',
        }}
      >
        {/* Search takes available space */}
        <SearchBar
          value={searchTerm}
          onChange={onSearchChange}
          onClose={onSearchClose}
          showKeyboardShortcuts={showKeyboardShortcuts}
          inputRef={searchInputRef}
        />

        {/* Switching project is not an overflow action — the page header's
            resource switcher owns it on both breakpoints. */}
        <PageActions
          count={totalActiveCount}
          panels={{
            sortBy: { title: t('sort.sortBy'), items: sortByPanelItems },
            orderBy: { title: t('sort.orderBy'), items: orderByPanelItems },
            groupBy: { title: t('sort.groupBy'), items: groupByPanelItems },
            display: {
              title: t('toolbar.displayOptions'),
              items: displayPanelItems,
            },
          }}
          actions={[
            {
              key: 'filters',
              icon: <Tune />,
              label: t('toolbar.filters'),
              endDecorator: hasAnyActive ? (
                <Chip size='sm' color='primary'>
                  {totalActiveCount}
                </Chip>
              ) : null,
              onClick: openFilterSheet,
            },
            {
              key: 'sortBy',
              icon: <Sort />,
              label: t('sort.sortBy'),
              panel: 'sortBy',
            },
            {
              key: 'orderBy',
              icon:
                sortDirection === 'desc' ? <ArrowDownward /> : <ArrowUpward />,
              label: t('sort.orderBy'),
              panel: 'orderBy',
            },
            {
              key: 'groupBy',
              icon: <Category />,
              label: t('sort.groupBy'),
              panel: 'groupBy',
            },
            {
              key: 'display',
              icon: <DisplaySettings />,
              label: t('toolbar.displayOptions'),
              panel: 'display',
            },
            { key: 'divider-select', type: 'divider' },
            {
              key: 'multiSelect',
              icon: isMultiSelectMode ? <CheckBox /> : <CheckBoxOutlineBlank />,
              label: isMultiSelectMode
                ? t('archived.exitMultiSelect')
                : t('archived.enableMultiSelect'),
              onClick: onToggleMultiSelect,
            },
            { key: 'divider-context', type: 'divider' },
            activeFilterId && {
              key: 'editFilter',
              icon: <Edit />,
              label: t('filterChip.edit'),
              onClick: () =>
                onSavedFilterEdit?.(
                  savedFilters.find(filter => filter.id === activeFilterId),
                ),
            },
            !filterActive &&
              selectedProject?.id &&
              selectedProject.id !== 'default' && {
                key: 'projectSettings',
                icon: <Settings />,
                label: t('projects:modal.editTitle'),
                onClick: () => setProjectSettingsOpen(true),
              },
          ]}
        />
      </Box>
      {projectSettingsOpen && (
        <ProjectModal
          isOpen
          project={selectedProject}
          onClose={() => setProjectSettingsOpen(false)}
          onSave={project => {
            onProjectSelect?.(project)
            setProjectSettingsOpen(false)
          }}
        />
      )}

      {/* ── Row 2: pinned filters quick access ──────────────────────────────── */}
      {/* Stays visible even while a saved filter is active (it self-highlights)
          so switching between pinned filters never requires clearing first.
          Only steps aside for an ad-hoc/temp condition set, which has no
          matching pinned identity to show. */}
      {tempConditionCount === 0 && (
        <CustomFilterChips
          filters={savedFilters}
          activeFilterId={activeFilterId}
          onFilterClick={onSavedFilterClick}
          onFilterDelete={onSavedFilterDelete}
          onFilterPin={onSavedFilterPin}
          onFilterEdit={onSavedFilterEdit}
        />
      )}

      {/* ── Row 3: active (temp/ad-hoc) filter chips ──────────────────────────── */}
      {tempConditionCount > 0 && (
        <ActiveFilterChips
          chips={inlineChips}
          onOpen={openFilterSheet}
          showAddChip
          onAdd={openFilterSheet}
          onClearAll={() => {
            setLocalSelections(defaultSelections())
            onClearAllFilters?.()
          }}
          resultCount={resultCount}
          totalCount={totalCount}
          maxVisible={2}
          chipSize='md'
          clearButtonSize='sm'
          clearButtonSx={{ color: 'text.secondary' }}
        />
      )}

      {/* ── Unified Filter bottom sheet ─────────────────────────────────────── */}
      <AppModal
        open={filterSheetOpen}
        isMobile
        onClose={() => {
          setSaveMenuOpen(false)
          setFilterSheetOpen(false)
        }}
        maxHeight='92vh'
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tune sx={{ fontSize: 20 }} />
            {t('toolbar.filters')}
            {hasAnyActive && (
              <Chip size='sm' variant='solid' color='primary' sx={{ ml: 0.5 }}>
                {totalActiveCount}
              </Chip>
            )}
          </Box>
        }
        footer={
          savingFilter ? (
            <Box sx={{ width: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Input
                  size='sm'
                  placeholder={t('toolbar.filterNamePlaceholder')}
                  value={saveFilterName}
                  onChange={e => setSaveFilterName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
                  autoFocus
                  sx={{ flex: 1 }}
                />
                <Button
                  size='sm'
                  onClick={handleSaveFilter}
                  disabled={!saveFilterName.trim()}
                >
                  {t('common:save')}
                </Button>
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={() => setSavingFilter(false)}
                >
                  {t('choreView.cancel')}
                </Button>
              </Box>
              <ItemPrivacyField
                isShared={saveFilterShared}
                onChange={setSaveFilterShared}
              />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Button
                variant='plain'
                color='danger'
                size='sm'
                disabled={!hasAnyActive && activeConditions.length === 0}
                onClick={() => {
                  setLocalSelections(defaultSelections())
                  setSaveMenuOpen(false)
                  onClearAllFilters?.()
                  setFilterSheetOpen(false)
                }}
              >
                {t('toolbar.clearAll')}
              </Button>

              {activeConditions.length > 0 ? (
                <Dropdown
                  open={saveMenuOpen}
                  onOpenChange={(_event, isOpen) => setSaveMenuOpen(isOpen)}
                >
                  <ButtonGroup variant='solid' color='primary'>
                    <Button
                      onClick={() => {
                        setSaveMenuOpen(false)
                        setFilterSheetOpen(false)
                      }}
                      sx={{ minWidth: 140 }}
                    >
                      {resultCount != null
                        ? t('toolbar.showCount', { count: resultCount })
                        : t('toolbar.done')}
                    </Button>
                    <MenuButton
                      slots={{ root: IconButton }}
                      aria-label={t('toolbar.moreSaveOptions')}
                    >
                      <ArrowDropDown />
                    </MenuButton>
                  </ButtonGroup>

                  <Menu placement='top-end'>
                    <MenuItem
                      onClick={handleUpdateFilter}
                      disabled={
                        !editingSavedFilter ||
                        editingSavedFilter.createdBy !== userProfile?.id
                      }
                    >
                      <Save sx={{ fontSize: 16, mr: 1 }} />
                      {t('toolbar.saveFilter')}
                    </MenuItem>
                    <MenuItem onClick={startSavingNewFilter}>
                      <Save sx={{ fontSize: 16, mr: 1 }} />
                      {t('toolbar.saveAsNew')}
                    </MenuItem>
                  </Menu>
                </Dropdown>
              ) : (
                <Button
                  variant='solid'
                  color='primary'
                  onClick={() => {
                    setSaveMenuOpen(false)
                    setFilterSheetOpen(false)
                  }}
                  sx={{ minWidth: 140 }}
                >
                  {t('activity.status.done')}
                </Button>
              )}
            </Box>
          )
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Full advanced filter content */}
          <FilterBuilderContent
            selections={localSelections}
            onSelectionsChange={handleSelectionsChange}
            members={members}
            labels={labels}
            projects={projects}
          />

          {/* Saved filters section */}
          {savedFilters.length > 0 && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Typography level='title-sm' fontWeight={600} sx={{ mb: 1.5 }}>
                {t('toolbar.savedFilters')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {savedFilters.map(filter => {
                  const isActive = activeFilterId === filter.id
                  return (
                    <Chip
                      key={filter.id}
                      variant={isActive ? 'solid' : 'soft'}
                      color='neutral'
                      startDecorator={
                        isActive ? (
                          <Check sx={{ fontSize: 14 }} />
                        ) : (
                          <Chip size='sm' variant='plain' color='neutral'>
                            {filter.count ?? 0}
                          </Chip>
                        )
                      }
                      onClick={() => {
                        onSavedFilterClick?.(filter.id)
                        if (!isActive) setFilterSheetOpen(false)
                      }}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                        '&:hover': { opacity: 0.85 },
                        ...(filter.color && !isActive
                          ? { borderColor: filter.color }
                          : {}),
                      }}
                    >
                      {filter.name}
                    </Chip>
                  )
                })}
              </Box>
            </>
          )}
        </Box>
      </AppModal>
    </>
  )
}

export default ChoreToolbar
