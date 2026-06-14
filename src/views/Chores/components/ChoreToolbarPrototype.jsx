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
 *            Project · Assignee · Due Date · Priority · Labels · Saved Filters
 *
 * How to try it: in MyChores.jsx, replace the <Box sx={{display:'flex'...}}> toolbar block
 * and the two rows below it (FilterBar + FilterSection) with:
 *   <ChoreToolbar ... />
 */

import {
  Add,
  CalendarMonth,
  Check,
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  FilterList,
  FolderOpen,
  PriorityHigh,
  Settings,
  Sort,
  Style,
  Tune,
  ViewAgenda,
  ViewComfy,
  ViewModule,
} from '@mui/icons-material'
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import BottomSheetModal from '../../../components/common/BottomSheetModal'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import SearchBar from './SearchBar'

// ─── helpers ─────────────────────────────────────────────────────────────────

const chipLabel = (def, value) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  if (def.type === 'single-select')
    return def.options?.find(o => o.value === value)?.label ?? null
  if (def.type === 'multi-select' && Array.isArray(value)) {
    if (value.length === 1)
      return def.options?.find(o => o.value === value[0])?.label ?? def.label
    return `${def.label} (${value.length})`
  }
  return null
}

// ─── sub-components ──────────────────────────────────────────────────────────

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
 *  filterDefs        – same shape as FilterBar: [{ id, label, type, icon, options, filterFn }]
 *                      PLUS two new built-in sections handled here: 'project' and 'assignee'
 *  activeFilters     – { [id]: value }
 *  onSetFilter       – (id, value | null) => void
 *  onClearAllFilters – () => void
 *  resultCount / totalCount
 *
 *  projects          – [{ id, name }] — drives the Project section
 *  selectedProject   – current project object
 *  onProjectSelect   – (project) => void
 *
 *  selectedAssigneeFilter – 'anyone' | 'assigned_to_me' | 'available_for_me' | 'assigned_to_others'
 *  onAssigneeFilterChange – (key) => void
 *
 *  savedFilters      – [{ id, name, color, count, isPinned }]
 *  activeFilterId    – number | null
 *  onSavedFilterClick – (id) => void
 *  onSavedFilterEdit  – (filter) => void
 *  onSavedFilterDelete– (id) => void
 *  onSavedFilterPin   – (id) => void
 *  onCreateAdvancedFilter – () => void
 *
 *  selectedGroupBy   – 'default' | 'due_date' | 'priority' | 'labels'
 *  onGroupBySelect   – (value) => void
 *
 *  viewMode          – 'default' | 'compact' | 'calendar'
 *  onToggleViewMode  – () => void
 *
 *  isMultiSelectMode – bool
 *  onToggleMultiSelect – () => void
 *
 *  searchTerm / onSearchChange / onSearchClose / searchInputRef
 *  showKeyboardShortcuts
 */
const ChoreToolbar = ({
  // quick filters
  filterDefs = [],
  activeFilters = {},
  onSetFilter,
  onClearAllFilters,
  resultCount,
  totalCount,
  // project
  projects = [],
  selectedProject,
  onProjectSelect,
  // assignee
  selectedAssigneeFilter = 'anyone',
  onAssigneeFilterChange,
  // saved / custom
  savedFilters = [],
  activeFilterId,
  onSavedFilterClick,
  onSavedFilterEdit,
  onSavedFilterDelete,
  onSavedFilterPin,
  onCreateAdvancedFilter,
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

  // ── count active filters for badge ──────────────────────────────────────────

  const quickFilterCount = filterDefs.filter(def => {
    const v = activeFilters[def.id]
    return v != null && !(Array.isArray(v) && v.length === 0)
  }).length

  const projectActive =
    selectedProject && selectedProject.id !== 'default' ? 1 : 0
  const assigneeActive = selectedAssigneeFilter !== 'anyone' ? 1 : 0
  const savedFilterActive = activeFilterId != null ? 1 : 0

  const totalActiveCount = quickFilterCount + savedFilterActive
  const hasAnyActive = totalActiveCount > 0

  // ── inline chip strip (max 2 visible + overflow) ─────────────────────────────

  const inlineChips = []

  if (savedFilterActive) {
    const sf = savedFilters.find(f => f.id === activeFilterId)
    if (sf)
      inlineChips.push({
        key: '__saved',
        label: sf.name,
        onClear: () => onSavedFilterClick?.(activeFilterId),
      })
  }

  filterDefs.forEach(def => {
    const label = chipLabel(def, activeFilters[def.id])
    if (label) inlineChips.push({ key: def.id, label, onClear: () => onSetFilter(def.id, null) })
  })

  const MAX_CHIPS = 2
  const visibleChips = inlineChips.slice(0, MAX_CHIPS)
  const overflow = inlineChips.length - MAX_CHIPS

  // ── groupby options ──────────────────────────────────────────────────────────

  const groupByOptions = [
    { value: 'default', label: 'Smart' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'labels', label: 'Labels' },
  ]

  // ── assignee options ─────────────────────────────────────────────────────────

  const assigneeOptions = [
    { value: 'anyone', label: 'Everyone' },
    { value: 'assigned_to_me', label: 'Mine' },
    { value: 'available_for_me', label: 'Available to me' },
    { value: 'assigned_to_others', label: 'Others' },
  ]

  // ── project options (show only if more than just Default) ───────────────────

  const showProjectSection = projects.filter(p => p.id !== 'default').length > 0

  // ── pinned saved filters ─────────────────────────────────────────────────────

  const pinnedFilters = savedFilters.filter(f => f.isPinned)

  // ── display active state (highlight button when non-default) ─────────────────

  const displayActive =
    selectedGroupBy !== 'default' ||
    viewMode !== 'default' ||
    projectActive > 0 ||
    assigneeActive > 0

  const viewOptions = [
    { value: 'default', label: 'Cards', icon: <ViewAgenda sx={{ fontSize: 16 }} /> },
    { value: 'compact', label: 'Compact', icon: <ViewComfy sx={{ fontSize: 16 }} /> },
    { value: 'calendar', label: 'Calendar', icon: <CalendarMonth sx={{ fontSize: 16 }} /> },
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
            onClick={() => setFilterSheetOpen(true)}
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
            title={isMultiSelectMode ? 'Exit multi-select (Ctrl+S)' : 'Multi-select (Ctrl+S)'}
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

      {/* ── Row 2: active filter chips (only when something is active) ─────── */}
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
          {visibleChips.map(({ key, label, onClear }) => (
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
              onClick={() => setFilterSheetOpen(true)}
              sx={{ cursor: 'pointer', flexShrink: 0 }}
            >
              {label}
            </Chip>
          ))}

          {overflow > 0 && (
            <Chip
              size='sm'
              variant='soft'
              color='neutral'
              onClick={() => setFilterSheetOpen(true)}
              sx={{ cursor: 'pointer', flexShrink: 0 }}
            >
              +{overflow} more
            </Chip>
          )}

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
            onClick={onClearAllFilters}
          >
            Clear all
          </Button>
        </Box>
      )}

      {/* ── Unified Filter bottom sheet ─────────────────────────────────────── */}
      <BottomSheetModal
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
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
              disabled={!hasAnyActive}
              onClick={onClearAllFilters}
            >
              Clear all
            </Button>
            <Button
              onClick={() => setFilterSheetOpen(false)}
              sx={{ minWidth: 140 }}
            >
              {resultCount != null
                ? `Show ${resultCount} result${resultCount !== 1 ? 's' : ''}`
                : 'Done'}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── Quick filter sections (Due Date / Priority / Labels etc.) ────── */}
          {filterDefs.map(def => (
            <Box key={def.id}>
              <Divider sx={{ my: 2.5 }} />
              <SectionHeader
                icon={def.icon}
                label={def.label}
                badge={chipLabel(def, activeFilters[def.id])}
              />
              <OptionChips
                options={def.options ?? []}
                selected={activeFilters[def.id]}
                multi={def.type === 'multi-select'}
                onToggle={val => {
                  if (def.type === 'multi-select') {
                    const curr = activeFilters[def.id] || []
                    const next = curr.includes(val)
                      ? curr.filter(v => v !== val)
                      : [...curr, val]
                    onSetFilter(def.id, next.length > 0 ? next : null)
                  } else {
                    onSetFilter(def.id, activeFilters[def.id] === val ? null : val)
                  }
                }}
              />
            </Box>
          ))}

          {/* ── Saved / custom filters ──────────────────────────────────────── */}
          {(pinnedFilters.length > 0 || savedFilters.length > 0) && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1.5,
                }}
              >
                <Typography level='title-sm' fontWeight={600}>
                  Saved Filters
                </Typography>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={() => {
                    setFilterSheetOpen(false)
                    // navigate to /filters or open settings
                  }}
                >
                  <Settings sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
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
                        setFilterSheetOpen(false)
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

              <Button
                variant='plain'
                color='primary'
                size='sm'
                startDecorator={<Add sx={{ fontSize: 16 }} />}
                onClick={() => {
                  setFilterSheetOpen(false)
                  onCreateAdvancedFilter?.()
                }}
                sx={{ mt: 1.5, alignSelf: 'flex-start', px: 0 }}
              >
                Create advanced filter
              </Button>
            </>
          )}

          {/* Edge case: no saved filters yet → still show "Create" CTA */}
          {savedFilters.length === 0 && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Button
                variant='plain'
                color='primary'
                size='sm'
                startDecorator={<Add sx={{ fontSize: 16 }} />}
                onClick={() => {
                  setFilterSheetOpen(false)
                  onCreateAdvancedFilter?.()
                }}
                sx={{ alignSelf: 'flex-start', px: 0 }}
              >
                Create advanced filter
              </Button>
            </>
          )}
        </Box>
      </BottomSheetModal>

      {/* ── Display bottom sheet (View + Group combined) ───────────────────── */}
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
                startDecorator={viewMode === opt.value ? <Check sx={{ fontSize: 14 }} /> : opt.icon}
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

          {/* Project section */}
          {showProjectSection && (
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
