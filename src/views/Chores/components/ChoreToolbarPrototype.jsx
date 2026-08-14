/**
 * PROTOTYPE – Unified Chore Toolbar
 *
 * Proposed design to replace the current 3-surface layout:
 *   OLD: [Search] [Sort+Group+AssigneeFilter+CreateFilter] [ProjectSelector] [View] [Multiselect]
 *        + FilterBar (Due Date / Priority / Labels chips row)
 *        + FilterSection (saved/pinned filter chips row)
 *
 *   NEW: [Search] [Filter(n)] [Group ▾] [View] [Multiselect]
 *        + active filter chips appear inline next to Filter button
 *        + Filter button opens ONE unified bottom sheet containing:
 *            Assignee · Created By · Status · Priority · Due Date · Labels · Projects · Points
 *            + Saved Filters section
 *
 * How to try it: in MyChores.jsx, replace the <Box sx={{display:'flex'...}}> toolbar block
 * and the two rows below it (FilterBar + FilterSection) with:
 *   <ChoreToolbar ... />
 */

import {
  ArrowDropDown,
  CalendarMonth,
  Check,
  CheckBox,
  CheckBoxOutlineBlank,
  FilterList,
  Save,
  Sort,
  Tune,
  ViewAgenda,
  ViewComfy,
  ViewModule,
} from '@mui/icons-material'
import {
  Badge,
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
import AppModal from '../../../components/common/AppModal'
import ActiveFilterChips from '../../../components/common/filter/ActiveFilterChips'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { FILTER_COLORS } from '../../../utils/Colors'
import Priorities from '../../../utils/Priorities'
import FilterBuilderContent, {
  CHORE_STATUSES,
  DUE_DATE_OPTIONS,
  POINTS_OPERATORS,
  conditionsToSelections,
  defaultSelections,
  selectionsToConditions,
} from './FilterBuilderContent'
import SearchBar from './SearchBar'
import ProjectSelector from '../../components/ProjectSelector'
import CustomFilterChips from './CustomFilterChips'
import { useTranslation } from 'react-i18next'

// ─── sub-components for the Display sheet ────────────────────────────────────

const SectionHeader = ({ icon, label, badge }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    {icon && (
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
    )}
    <Typography level='title-sm' fontWeight={600}>
      {label}
    </Typography>
    {badge != null && (
      <Chip
        size='sm'
        variant='solid'
        color='primary'
        sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
      >
        {badge}
      </Chip>
    )}
  </Box>
)

const OptionChips = ({ options, selected, multi, onToggle }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {options.map(opt => {
      const isSelected = multi
        ? (selected || []).includes(opt.value)
        : selected === opt.value
      return (
        <Chip
          key={opt.value}
          variant={isSelected ? 'solid' : 'soft'}
          color={isSelected ? (opt.color ?? 'primary') : 'neutral'}
          startDecorator={
            opt.icon != null ? (
              isSelected ? (
                <Check sx={{ fontSize: 14 }} />
              ) : (
                opt.icon
              )
            ) : undefined
          }
          onClick={() => onToggle(opt.value)}
          sx={{
            py: 0.64,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            userSelect: 'none',
            '&:hover': { opacity: 0.85 },
          }}
        >
          {opt.label}
        </Chip>
      )
    })}
  </Box>
)

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
  members = [],
  labels = [],
  projects = [],
  tempFilter,
  tempFilterMeta,
  applyTempFilter,
  clearTempFilter,
  saveFilter,
  updateFilter,
  onFilterSaved,
  // result counts
  resultCount,
  totalCount,
  // clear all
  onClearAllFilters,
  // project (for Display sheet)
  selectedProject,
  onProjectSelect,
  // assignee (for Display sheet)
  selectedAssigneeFilter = 'anyone',
  onAssigneeFilterChange,
  // saved / custom
  savedFilters = [],
  activeFilterId,
  onSavedFilterClick,
  onSavedFilterEdit,
  onSavedFilterDelete,
  onSavedFilterPin,
  // grouping
  selectedGroupBy = 'default',
  onGroupBySelect,
  // view + multiselect
  viewMode = 'default',
  onToggleViewMode,
  isMultiSelectMode,
  onToggleMultiSelect,
  // search
  searchTerm,
  onSearchChange,
  onSearchClose,
  searchInputRef,
  showKeyboardShortcuts,
}) => {
  const { t } = useTranslation('chores')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [displaySheetOpen, setDisplaySheetOpen] = useState(false)
  const [localSelections, setLocalSelections] = useState(defaultSelections())
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
      assignee: 'Assignee',
      createdBy: 'Created By',
      status: 'Status',
      priority: 'Priority',
      label: t('labels.label'),
      project: 'Project',
      dueDate: 'Due Date',
      points: 'Points',
    }

    const typeLabel = typeLabels[condition.type] || 'Filter'
    const prefix = condition.operator === 'isNot' ? 'Not ' : ''

    if (condition.type === 'dueDate') {
      const dueDateLabel =
        DUE_DATE_OPTIONS.find(o => o.value === condition.operator)?.label ||
        'Custom'
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
        const member = members.find(m => m.userId === value)
        return member?.displayName || member?.username || String(value)
      }
      if (condition.type === 'status') {
        return (
          CHORE_STATUSES.find(s => s.value === value)?.label || String(value)
        )
      }
      if (condition.type === 'priority') {
        return Priorities.find(p => p.value === value)?.name || String(value)
      }
      if (condition.type === 'label') {
        return labels.find(l => l.id === value)?.name || String(value)
      }
      if (condition.type === 'project') {
        if (value === 'default') return 'Default Project'
        return projects.find(p => p.id === value)?.name || String(value)
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

  const handleSaveFilter = () => {
    const name = saveFilterName.trim()
    if (!name) return
    const conditions = selectionsToConditions(localSelections)
    if (conditions.length === 0) return

    const usedColors = savedFilters.map(f => f.color)
    const color =
      FILTER_COLORS.find(c => !usedColors.includes(c.value))?.value ??
      FILTER_COLORS[0].value

    saveFilter?.({
      name,
      description: '',
      color,
      conditions,
      operator: 'AND',
    })?.then?.(() => {
      applyTempFilter?.({ conditions, operator: 'AND' }, { name })
      onFilterSaved?.(name)
    })

    setSavingFilter(false)
    setSaveFilterName('')
    setFilterSheetOpen(false)
  }

  const handleUpdateFilter = () => {
    if (!editingSavedFilter?.id || !updateFilter) return

    const conditions = selectionsToConditions(localSelections)
    if (conditions.length === 0) return

    updateFilter(editingSavedFilter.id, {
      name: editingSavedFilter.name,
      description: editingSavedFilter.description || '',
      color: editingSavedFilter.color,
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

  const groupByOptions = [
    { value: 'default', label: t('sort.smart') },
    { value: 'due_date', label: t('dueDate') },
    { value: 'priority', label: t('priority') },
    { value: 'labels', label: t('labels.label') },
  ]

  const assigneeOptions = [
    { value: 'anyone', label: t('toolbar.everyone') },
    { value: 'assigned_to_me', label: t('toolbar.mine') },
    { value: 'available_for_me', label: t('toolbar.availableToMe') },
    { value: 'assigned_to_others', label: t('toolbar.others') },
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

        {/* Filter button */}
        <Badge
          badgeContent={totalActiveCount || null}
          color='primary'
          size='sm'
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <IconButton
            variant={hasAnyActive ? 'solid' : 'outlined'}
            color={hasAnyActive ? 'primary' : 'neutral'}
            size='sm'
            sx={{ height: 32, width: 32, borderRadius: '50%' }}
            onClick={openFilterSheet}
            aria-label={t('toolbar.filters')}
            title={t('toolbar.filters')}
          >
            <FilterList />
          </IconButton>
        </Badge>

        {/* Project selector */}
        {!filterActive &&
          projects.filter(p => p.id !== 'default').length > 0 && (
            <ProjectSelector
              selectedProject={selectedProject?.name || 'Default Project'}
              onProjectSelect={onProjectSelect}
              showKeyboardShortcuts={showKeyboardShortcuts}
            />
          )}

        {/* Display button — View + Group combined */}
        <IconButton
          variant='outlined'
          color='neutral'
          size='sm'
          sx={{ height: 32, width: 32, borderRadius: '50%' }}
          onClick={() => setDisplaySheetOpen(true)}
          aria-label='View and group options'
          title={t('toolbar.viewGroup')}
        >
          {viewMode === 'calendar' ? (
            <CalendarMonth />
          ) : viewMode === 'compact' ? (
            <ViewModule />
          ) : (
            <ViewAgenda />
          )}
        </IconButton>

        {/* Multiselect */}
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            variant={isMultiSelectMode ? 'solid' : 'outlined'}
            color={isMultiSelectMode ? 'primary' : 'neutral'}
            size='sm'
            sx={{ height: 32, width: 32, borderRadius: '50%' }}
            onClick={onToggleMultiSelect}
            aria-label={
              isMultiSelectMode ? 'Exit multi-select' : 'Enter multi-select'
            }
            title={
              isMultiSelectMode
                ? 'Exit multi-select (Ctrl+S)'
                : 'Multi-select (Ctrl+S)'
            }
          >
            {isMultiSelectMode ? <CheckBox /> : <CheckBoxOutlineBlank />}
          </IconButton>
          <KeyboardShortcutHint
            shortcut='S'
            show={showKeyboardShortcuts}
            sx={{ position: 'absolute', top: -8, right: -8, zIndex: 1000 }}
          />
        </Box>
      </Box>

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
            Filters
            {hasAnyActive && (
              <Chip size='sm' variant='solid' color='primary' sx={{ ml: 0.5 }}>
                {totalActiveCount}
              </Chip>
            )}
          </Box>
        }
        footer={
          savingFilter ? (
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
                      {resultCount != null ? `Show ${resultCount}` : 'Done'}
                    </Button>
                    <MenuButton
                      slots={{ root: IconButton }}
                      aria-label='More save options'
                    >
                      <ArrowDropDown />
                    </MenuButton>
                  </ButtonGroup>

                  <Menu placement='top-end'>
                    <MenuItem
                      onClick={handleUpdateFilter}
                      disabled={!editingSavedFilter}
                    >
                      <Save sx={{ fontSize: 16, mr: 1 }} />
                      {t('toolbar.saveFilter')}
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setSaveMenuOpen(false)
                        setSaveFilterName(
                          editingSavedFilter
                            ? `${editingSavedFilter.name} Copy`
                            : '',
                        )
                        setSavingFilter(true)
                      }}
                    >
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
                Saved Filters
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

      {/* ── Display bottom sheet (View + Group + Assignee + Project) ──────────── */}
      <AppModal
        open={displaySheetOpen}
        isMobile
        onClose={() => setDisplaySheetOpen(false)}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewAgenda sx={{ fontSize: 20 }} />
            Display
          </Box>
        }
        footer={
          <Button
            onClick={() => setDisplaySheetOpen(false)}
            sx={{ minWidth: 140 }}
          >
            {t('activity.status.done')}
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* View section */}
          <SectionHeader label={t('actionMenu.view')} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {viewOptions.map(opt => (
              <Chip
                key={opt.value}
                variant={viewMode === opt.value ? 'solid' : 'soft'}
                color={viewMode === opt.value ? 'primary' : 'neutral'}
                startDecorator={
                  viewMode === opt.value ? (
                    <Check sx={{ fontSize: 14 }} />
                  ) : (
                    opt.icon
                  )
                }
                onClick={() => onToggleViewMode?.(opt.value)}
                sx={{
                  py: 0.64,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  '&:hover': { opacity: 0.85 },
                }}
              >
                {opt.label}
              </Chip>
            ))}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          {/* Group by section */}
          <SectionHeader
            icon={<Sort />}
            label={t('toolbar.groupBy')}
            badge={
              selectedGroupBy !== 'default'
                ? groupByOptions.find(o => o.value === selectedGroupBy)?.label
                : null
            }
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {groupByOptions.map(opt => (
              <Chip
                key={opt.value}
                variant={selectedGroupBy === opt.value ? 'solid' : 'soft'}
                color={selectedGroupBy === opt.value ? 'primary' : 'neutral'}
                onClick={() => onGroupBySelect?.(opt.value)}
                sx={{
                  py: 0.64,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  '&:hover': { opacity: 0.85 },
                }}
              >
                {opt.label}
              </Chip>
            ))}
          </Box>

          {/* Show tasks for section */}
          <Divider sx={{ my: 2.5 }} />
          <SectionHeader
            icon={<FilterList />}
            label={t('toolbar.showTasksFor')}
            badge={
              selectedAssigneeFilter !== 'anyone'
                ? assigneeOptions.find(o => o.value === selectedAssigneeFilter)
                    ?.label
                : null
            }
          />
          <OptionChips
            options={assigneeOptions}
            selected={selectedAssigneeFilter}
            multi={false}
            onToggle={v => onAssigneeFilterChange?.(v)}
          />
        </Box>
      </AppModal>
    </>
  )
}

export default ChoreToolbar
