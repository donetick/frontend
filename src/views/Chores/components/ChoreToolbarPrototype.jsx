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
  Close,
  FilterList,
  FolderOpen,
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
  IconButton,
  Input,
  Menu,
  MenuItem,
  Typography,
} from '@mui/joy'
import { useRef, useState } from 'react'
import BottomSheetModal from '../../../components/common/BottomSheetModal'
import { Z_INDEX } from '../../../constants/zIndex'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { FILTER_COLORS } from '../../../utils/Colors'
import FilterBuilderContent, {
  conditionsToSelections,
  defaultSelections,
  selectionsToConditions,
} from './FilterBuilderContent'
import SearchBar from './SearchBar'

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
          color={isSelected ? opt.color ?? 'primary' : 'neutral'}
          startDecorator={
            opt.icon != null
              ? isSelected
                ? <Check sx={{ fontSize: 14 }} />
                : opt.icon
              : undefined
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
 *  applyTempFilter   – (filter) => void  — called immediately as selections change
 *  clearTempFilter   – () => void
 *  saveFilter        – (filterData) => Promise  — saves as a named filter
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
  applyTempFilter,
  clearTempFilter,
  saveFilter,
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [displaySheetOpen, setDisplaySheetOpen] = useState(false)
  const [localSelections, setLocalSelections] = useState(defaultSelections())
  const [savingFilter, setSavingFilter] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [saveMenuAnchorEl, setSaveMenuAnchorEl] = useState(null)
  const saveMenuRef = useRef(null)

  // ── badge counts ─────────────────────────────────────────────────────────────

  const tempConditionCount = tempFilter?.conditions?.length || 0
  const savedFilterActive = activeFilterId != null ? 1 : 0
  const totalActiveCount = tempConditionCount + savedFilterActive
  const hasAnyActive = totalActiveCount > 0

  // ── inline chip strip ────────────────────────────────────────────────────────

  const inlineChips = []

  if (savedFilterActive) {
    const sf = savedFilters.find(f => f.id === activeFilterId)
    if (sf) {
      inlineChips.push({
        key: '__saved',
        label: sf.name,
        onClear: () => onSavedFilterClick?.(activeFilterId),
      })
    }
  } else if (tempConditionCount > 0) {
    inlineChips.push({
      key: '__temp',
      label: `${tempConditionCount} condition${tempConditionCount !== 1 ? 's' : ''}`,
      onClear: () => {
        setLocalSelections(defaultSelections())
        clearTempFilter?.()
      },
    })
  }

  // ── open filter sheet ────────────────────────────────────────────────────────

  const openFilterSheet = () => {
    if (tempFilter?.conditions?.length > 0) {
      setLocalSelections(conditionsToSelections(tempFilter.conditions))
    } else if (activeFilterId) {
      const sf = savedFilters.find(f => f.id === activeFilterId)
      setLocalSelections(
        sf?.conditions
          ? conditionsToSelections(sf.conditions)
          : defaultSelections(),
      )
    } else {
      setLocalSelections(defaultSelections())
    }
    setSavingFilter(false)
    setSaveFilterName('')
    setFilterSheetOpen(true)
  }

  // ── selection changes → apply temp filter immediately ────────────────────────

  const handleSelectionsChange = updater => {
    setLocalSelections(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const conditions = selectionsToConditions(next)
      if (conditions.length > 0) {
        applyTempFilter?.({ conditions, operator: 'AND' })
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

    saveFilter?.({ name, description: '', color, conditions, operator: 'AND' })?.then?.(() => {
      applyTempFilter?.({ conditions, operator: 'AND' }, { name })
      onFilterSaved?.(name)
    })

    setSavingFilter(false)
    setSaveFilterName('')
    setFilterSheetOpen(false)
  }

  // ── display sheet helpers ────────────────────────────────────────────────────

  const filterActive = activeFilterId != null || tempConditionCount > 0
  const projectActive = selectedProject && selectedProject.id !== 'default' ? 1 : 0
  const assigneeActive = selectedAssigneeFilter !== 'anyone' ? 1 : 0
  const displayActive =
    selectedGroupBy !== 'default' ||
    viewMode !== 'default' ||
    projectActive > 0 ||
    assigneeActive > 0

  const groupByOptions = [
    { value: 'default', label: 'Smart' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'labels', label: 'Labels' },
  ]

  const assigneeOptions = [
    { value: 'anyone', label: 'Everyone' },
    { value: 'assigned_to_me', label: 'Mine' },
    { value: 'available_for_me', label: 'Available to me' },
    { value: 'assigned_to_others', label: 'Others' },
  ]

  const viewOptions = [
    { value: 'default', label: 'Cards', icon: <ViewAgenda sx={{ fontSize: 16 }} /> },
    { value: 'compact', label: 'Compact', icon: <ViewComfy sx={{ fontSize: 16 }} /> },
    { value: 'calendar', label: 'Calendar', icon: <CalendarMonth sx={{ fontSize: 16 }} /> },
  ]

  // Only show project in Display sheet when no advanced filter is active
  const showProjectInDisplay =
    !filterActive &&
    projects.filter(p => p.id !== 'default').length > 0

  const activeConditions = selectionsToConditions(localSelections)

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
            title='Filters'
          >
            <FilterList />
          </IconButton>
        </Badge>

        {/* Display button — View + Group combined */}
        <IconButton
          variant={displayActive ? 'solid' : 'outlined'}
          color={displayActive ? 'primary' : 'neutral'}
          size='sm'
          sx={{ height: 32, width: 32, borderRadius: '50%' }}
          onClick={() => setDisplaySheetOpen(true)}
          title='View & Group'
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

      {/* ── Row 2: active filter chips ──────────────────────────────────────── */}
      {hasAnyActive && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'nowrap',
            overflowX: 'auto',
            py: 0.5,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {inlineChips.map(({ key, label, onClear }) => (
            <Chip
              key={key}
              size='sm'
              variant='soft'
              color='primary'
              endDecorator={
                <Close
                  sx={{ fontSize: 12, cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    onClear()
                  }}
                />
              }
              onClick={openFilterSheet}
              sx={{ cursor: 'pointer', flexShrink: 0 }}
            >
              {label}
            </Chip>
          ))}

          {resultCount != null && totalCount != null && (
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', ml: 'auto', flexShrink: 0 }}
            >
              {resultCount} / {totalCount}
            </Typography>
          )}

          <Button
            size='sm'
            variant='plain'
            color='neutral'
            sx={{
              px: 0.5,
              fontSize: '0.72rem',
              color: 'text.tertiary',
              minHeight: 0,
              flexShrink: 0,
            }}
            onClick={() => {
              setLocalSelections(defaultSelections())
              onClearAllFilters?.()
            }}
          >
            Clear all
          </Button>
        </Box>
      )}

      {/* ── Unified Filter bottom sheet ─────────────────────────────────────── */}
      <BottomSheetModal
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
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
              sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}
            >
              <Input
                size='sm'
                placeholder='Filter name…'
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
                Save
              </Button>
              <Button
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => setSavingFilter(false)}
              >
                Cancel
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
                  onClearAllFilters?.()
                  setFilterSheetOpen(false)
                }}
              >
                Clear all
              </Button>

              {activeConditions.length > 0 ? (
                <>
                  <ButtonGroup variant='solid' color='primary'>
                    <Button
                      onClick={() => setFilterSheetOpen(false)}
                      sx={{ minWidth: 140 }}
                    >
                      {resultCount != null
                        ? `Show ${resultCount}`
                        : 'Done'}
                    </Button>
                    <IconButton
                      ref={saveMenuRef}
                      onClick={e => setSaveMenuAnchorEl(e.currentTarget)}
                    >
                      <ArrowDropDown />
                    </IconButton>
                  </ButtonGroup>

                  <Menu
                    anchorEl={saveMenuAnchorEl}
                    open={Boolean(saveMenuAnchorEl)}
                    onClose={() => setSaveMenuAnchorEl(null)}
                    placement='top-end'
                    sx={{ zIndex: Z_INDEX.MODAL_CONTENT + 10 }}
                  >
                    <MenuItem
                      onClick={() => {
                        setSaveMenuAnchorEl(null)
                        setSavingFilter(true)
                      }}
                    >
                      <Save sx={{ fontSize: 16, mr: 1 }} />
                      Save as Filter
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant='solid'
                  color='primary'
                  onClick={() => setFilterSheetOpen(false)}
                  sx={{ minWidth: 140 }}
                >
                  Done
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
      </BottomSheetModal>

      {/* ── Display bottom sheet (View + Group + Assignee + Project) ──────────── */}
      <BottomSheetModal
        open={displaySheetOpen}
        onClose={() => setDisplaySheetOpen(false)}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewAgenda sx={{ fontSize: 20 }} />
            Display
          </Box>
        }
        footer={
          <Button onClick={() => setDisplaySheetOpen(false)} sx={{ minWidth: 140 }}>
            Done
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* View section */}
          <SectionHeader label='View' />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {viewOptions.map(opt => (
              <Chip
                key={opt.value}
                variant={viewMode === opt.value ? 'solid' : 'soft'}
                color={viewMode === opt.value ? 'primary' : 'neutral'}
                startDecorator={
                  viewMode === opt.value
                    ? <Check sx={{ fontSize: 14 }} />
                    : opt.icon
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
            label='Group by'
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
            label='Show tasks for'
            badge={
              selectedAssigneeFilter !== 'anyone'
                ? assigneeOptions.find(o => o.value === selectedAssigneeFilter)?.label
                : null
            }
          />
          <OptionChips
            options={assigneeOptions}
            selected={selectedAssigneeFilter}
            multi={false}
            onToggle={v => onAssigneeFilterChange?.(v)}
          />

          {/* Project section — only when no advanced filter is active */}
          {showProjectInDisplay && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <SectionHeader
                icon={<FolderOpen />}
                label='Project'
                badge={projectActive ? selectedProject.name : null}
              />
              <OptionChips
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                selected={selectedProject?.id ?? 'default'}
                multi={false}
                onToggle={id => {
                  const p = projects.find(x => x.id === id)
                  if (p) onProjectSelect?.(p)
                }}
              />
            </>
          )}
        </Box>
      </BottomSheetModal>
    </>
  )
}

export default ChoreToolbar
