import {
  Add,
  Bolt,
  CalendarMonth,
  CloudOff,
  EditCalendar,
  SearchOff,
  ExpandCircleDown,
  PriorityHigh,
  Style,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useChores } from '../../queries/ChoreQueries'
import { useNotification } from '../../service/NotificationProvider'
import Priorities from '../../utils/Priorities'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import IconButtonWithMenu from './IconButtonWithMenu'

import { useMediaQuery } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import EmptyState from '../../components/common/EmptyState'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import { useFilter } from '../../hooks/useFilter'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import {
  ChoreFilters,
  ChoresGrouper,
  ChoreSorter,
  filterByProject,
} from '../../utils/Chores'
import { getSafeBottom } from '../../utils/SafeAreaUtils.js'
import TaskInput from '../components/AddTaskModal'
import CalendarDual from '../components/CalendarDual'
import CalendarMonthly from '../components/CalendarMonthly.jsx'
import FeedbackPrompt from '../components/FeedbackPrompt.jsx'
import AdvancedFilterBuilder from '../Modals/Inputs/AdvancedFilterBuilder'
import { useProjects } from '../Projects/ProjectQueries.js'
import ChoreListView from './ChoreListView.jsx'
import ChoreToolbar from './components/ChoreToolbarPrototype'
import {
  conditionsToSelections,
  selectionsToConditions,
} from './components/FilterBuilderContent'
import ChoreModals from './components/ChoreModals'
import MultiSelectToolbar from './components/MultiSelectToolbar'
import MyChoreHeader from './components/MyChoreHeader'
import { useChoreActions } from './hooks/useChoreActions'
import { useChoreFilters } from './hooks/useChoreFilters'
import { useChoreModals } from './hooks/useChoreModals'
import { useCustomFilters } from './hooks/useCustomFilters'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMultiSelect } from './hooks/useMultiSelect'
import { useProjectFilter } from './hooks/useProjectFilter'
import {
  canScheduleNotification,
  scheduleChoreNotification,
} from './LocalNotificationScheduler'
import NotificationAccessSnackbar from './NotificationAccessSnackbar'
import Sidepanel from './Sidepanel'
import { INSIGHT_FILTER_DEFS } from './SmartInsightsCard'

const MyChores = () => {
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile()
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('md'))
  const { showSuccess, showError, showWarning, showUndo } = useNotification()
  const queryClient = useQueryClient()
  const { impersonatedUser } = useImpersonateUser()
  const Navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const {
    data: choresData,
    isLoading: choresLoading,
    isError: choresError,
    error: choresErrorDetails,
    refetch: refetchChores,
  } = useChores(false)
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useCircleMembers()

  const [chores, setChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [choreSections, setChoreSections] = useState([])
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  // 'voice' | 'scan' | null — set by the quick-capture widget deep links
  const [addTaskInitialMode, setAddTaskInitialMode] = useState(null)
  const [taskInputFocus, setTaskInputFocus] = useState(0)
  const searchInputRef = useRef(null)
  const [searchInputFocus, setSearchInputFocus] = useState(0)
  const [selectedChoreSection, setSelectedChoreSection] = useState(
    localStorage.getItem('selectedChoreSection') || 'default',
  )
  const [openChoreSections, setOpenChoreSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('openChoreSections')) || {}
    } catch {
      return {}
    }
  })
  const [anchorEl, setAnchorEl] = useState(null)
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('choreCardViewMode') || 'default',
  )
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date())
  const menuRef = useRef(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})

  const { selectedProject, projectsWithDefault, setSelectedProjectWithCache } =
    useProjectFilter(projects, !projectsLoading)

  const {
    searchTerm,
    selectedChoreFilter,
    projectFilteredChores,
    searchFilteredChores,
    nonProjectFilteredChores,
    setSearchTerm,
    setSelectedChoreFilterWithCache,
  } = useChoreFilters({
    chores,
    selectedProject,
    impersonatedUser,
    userProfile,
  })

  const {
    isMultiSelectMode,
    selectedChores,
    toggleMultiSelectMode,
    toggleChoreSelection,
    enterMultiSelectWithChore,
    selectAllVisibleChores,
    clearSelection,
    getSelectedChoresData,
  } = useMultiSelect()

  const { activeModal, modalChore, modalData, openModal, closeModal } =
    useChoreModals()

  const {
    savedFilters,
    activeFilter,
    activeFilterId,
    tempFilter,
    tempFilterMeta,
    filteredChores: customFilteredChores,
    applyCustomFilter,
    clearActiveFilter,
    applyTempFilter,
    clearTempFilter,
    saveFilter,
    updateFilter,
    deleteFilter,
    pinFilter,
    createFilterFromCurrentState,
    hasProjectConditions,
    hasFilterApplied,
  } = useCustomFilters(
    nonProjectFilteredChores,
    membersData?.res,
    userLabels,
    projectsWithDefault,
  )

  const [showAdvancedFilterBuilder, setShowAdvancedFilterBuilder] =
    useState(false)
  const [editingFilter, setEditingFilter] = useState(null)

  const quickFilterDefs = useMemo(
    () => [
      {
        id: 'status',
        label: 'Due Date',
        type: 'single-select',
        icon: <CalendarMonth />,
        options: [
          { value: 'Overdue', label: 'Overdue', color: 'danger' },
          { value: 'Due today', label: 'Due Today', color: 'warning' },
          { value: 'Due in week', label: 'Due This Week' },
          { value: 'Due Later', label: 'Due Later' },
          { value: 'No Due Date', label: 'No Due Date' },
          { value: 'Pending Approval', label: 'Pending Approval' },
        ],
        filterFn: (item, value) => {
          const now = new Date()
          const d = item.nextDueDate ? new Date(item.nextDueDate) : null
          switch (value) {
            case 'Overdue':
              return d !== null && d < now
            case 'Due today':
              return d !== null && d.toDateString() === now.toDateString()
            case 'Due in week':
              return (
                d !== null &&
                d < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) &&
                d > now
              )
            case 'Due Later':
              return (
                d !== null && d > new Date(now.getTime() + 24 * 60 * 60 * 1000)
              )
            case 'No Due Date':
              return item.nextDueDate === null
            case 'Pending Approval':
              return item.status === 3
            default:
              return true
          }
        },
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'multi-select',
        icon: <PriorityHigh />,
        options: Priorities.map(p => ({
          value: p.value,
          label: p.name,
          color: p.color || 'neutral',
          icon: p.icon,
        })),
        filterFn: (item, values) => values.includes(item.priority ?? 0),
      },
      ...(userLabels?.length > 0
        ? [
            {
              id: 'label',
              label: 'Labels',
              type: 'multi-select',
              icon: <Style />,
              options: userLabels.map(l => ({
                value: l.id,
                label: l.name,
                icon: (
                  <Box
                    component='span'
                    sx={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: l.color || '#90a4ae',
                      flexShrink: 0,
                    }}
                  />
                ),
              })),
              filterFn: (item, values) =>
                item.labelsV2?.some(l => values.includes(l.id)) ?? false,
            },
          ]
        : []),
    ],
    [userLabels],
  )

  const {
    filteredData: quickFilteredChores,
    setFilter: setQuickFilter,
    clearAll: clearQuickFilters,
    hasActiveFilters: hasQuickFilters,
  } = useFilter(projectFilteredChores, quickFilterDefs)

  const processedChores = useMemo(() => {
    if (!choresData?.res) {
      return []
    }

    let sortedChores = [...choresData.res].sort(ChoreSorter)

    if (impersonatedUser) {
      sortedChores = sortedChores.filter(
        chore =>
          chore.assignedTo === impersonatedUser.userId ||
          chore.assignees?.some(a => a.userId === impersonatedUser.userId) ||
          chore.isPrivate === false,
      )
    }

    return sortedChores
  }, [choresData?.res, impersonatedUser])

  const processedSections = useMemo(() => {
    if (!chores.length || !userProfile?.id) {
      return []
    }

    // Determine which chores to group based on active filter type
    let choresToGroup = chores
    if (tempFilter || activeFilterId) {
      // Advanced/custom filter active
      choresToGroup = customFilteredChores
    } else if (hasQuickFilters) {
      // Quick filter active (Due date, Priority, Labels)
      choresToGroup = quickFilteredChores
    } else if (!selectedProject || selectedProject.id === 'default') {
      // No project selected or default project: only show tasks without a projectId
      choresToGroup = chores.filter(chore => !chore.projectId)
    } else {
      // Specific project: use the existing filter function
      choresToGroup = filterByProject(chores, selectedProject.id)
    }

    const sections = ChoresGrouper(
      selectedChoreSection,
      choresToGroup,
      ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
        selectedChoreFilter
      ],
    )

    return sections
  }, [
    chores,
    quickFilteredChores,
    customFilteredChores,
    tempFilter,
    activeFilterId,
    hasQuickFilters,
    selectedChoreSection,
    selectedChoreFilter,
    selectedProject,
    impersonatedUser?.userId,
    userProfile?.id,
  ])

  useEffect(() => {
    if (
      !choresLoading &&
      !membersLoading &&
      userProfile?.id &&
      membersData?.res &&
      choresData?.res
    ) {
      const processEffectAsync = async () => {
        // Sync local state with query data to ensure updates are reflected
        setChores(processedChores)
        setFilteredChores(processedChores)

        // Don't set choreSections here - let the dedicated effect handle it
        // This prevents caching issues when switching between projects

        if (await canScheduleNotification()) {
          console.log('Scheduling chore notifications...')
          scheduleChoreNotification(
            choresData.res,
            userProfile,
            membersData.res,
          )
        }
      }

      processEffectAsync()
      // throw new Error('Fake Error to test posthog')
    }
  }, [
    membersLoading,
    choresLoading,
    isUserProfileLoading,
    choresData?.res,
    membersData?.res,
    processedChores, // Added to ensure local state syncs when query data updates
    userProfile,
    impersonatedUser?.userId,
  ])

  // Auto-update sections when processedSections changes
  useEffect(() => {
    // Always update choreSections to match processedSections, even if empty
    setChoreSections(processedSections)

    // Auto-open sections if needed - only check localStorage once
    if (processedSections.length > 0) {
      const storedSections = localStorage.getItem('openChoreSections')
      if (storedSections === null) {
        const openSections = processedSections.reduce(
          (acc, _section, index) => {
            acc[index] = true
            return acc
          },
          {},
        )
        setOpenChoreSections(openSections)
      }
    }
  }, [processedSections])

  useEffect(() => {
    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])

  useEffect(() => {
    if (searchInputFocus > 0 && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.selectionStart =
        searchInputRef.current.value?.length
      searchInputRef.current.selectionEnd = searchInputRef.current.value?.length
    }
  }, [searchInputFocus])

  // Read and apply project from URL parameters
  useEffect(() => {
    if (!projects.length) return

    const projectIdFromUrl = searchParams.get('project')

    if (projectIdFromUrl && projectIdFromUrl !== selectedProject?.id) {
      const project = projectsWithDefault.find(p => p.id === projectIdFromUrl)
      if (project) {
        setSelectedProjectWithCache(project)
      }
    }
  }, [
    searchParams,
    projects,
    projectsWithDefault,
    selectedProject,
    setSelectedProjectWithCache,

    searchParams,
    projects,
    projectsWithDefault,
    selectedProject,
    setSelectedProjectWithCache,
  ])

  // Widget deep links (donetick://chores/add[?mode=scan|voice] →
  // /chores?add_task=1[&mode=…]): open the quick-add modal once, in the
  // requested capture mode, and strip the params so back/refresh doesn't
  // re-trigger it.
  useEffect(() => {
    if (searchParams.get('add_task') === '1') {
      const mode = searchParams.get('mode')
      setAddTaskInitialMode(mode === 'voice' || mode === 'scan' ? mode : null)
      setAddTaskModalOpen(true)
      const params = new URLSearchParams(searchParams)
      params.delete('add_task')
      params.delete('mode')
      setSearchParams(params, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Read and apply filters from URL parameters
  useEffect(() => {
    // Check for filterId (camelCase) or filter_id (snake_case) for advanced filters
    const rawFilterId =
      searchParams.get('filterId') || searchParams.get('filter_id')
    // Parse as number since filter IDs from the API are numeric
    const filterId = rawFilterId ? Number(rawFilterId) || rawFilterId : null

    const oldFilter = searchParams.get('filter')

    // Restore smart insight temp filter from URL (e.g. on page reload)
    // Insight IDs are strings (e.g. 'overdue'), saved filter IDs are numeric
    if (
      filterId &&
      INSIGHT_FILTER_DEFS[filterId] &&
      tempFilterMeta?.id !== filterId
    ) {
      const def = INSIGHT_FILTER_DEFS[filterId]
      applyTempFilter(def.filter, { id: filterId, name: def.name })
      return
    }

    // If filterId is no longer in URL but filter is still active in state, clear it
    if (!filterId && !oldFilter && activeFilterId) {
      clearActiveFilter()
      return
    }

    if (!chores.length || !savedFilters.length) return

    // Handle advanced filter parameter
    if (filterId && !activeFilterId) {
      const filter = savedFilters.find(f => f.id === filterId)
      if (filter) {
        applyCustomFilter(filterId)
        return
      }
    }

    // Handle legacy filter parameter (e.g., filter=unplanned)
    if (oldFilter && !hasQuickFilters && !activeFilterId) {
      const filterMap = {
        unplanned: 'No Due Date',
        overdue: 'Overdue',
        today: 'Due today',
        week: 'Due in week',
        later: 'Due Later',
        pending: 'Pending Approval',
      }

      const filterName = filterMap[oldFilter.toLowerCase()]
      if (filterName) {
        setQuickFilter('status', filterName)
        setViewMode('default')
        setSelectedCalendarDate(null)
      }
    }
  }, [
    searchParams,
    chores,
    hasQuickFilters,
    activeFilterId,
    savedFilters,
    applyCustomFilter,
    applyTempFilter,
    clearActiveFilter,
    selectedProject,
    projectFilteredChores,
    setQuickFilter,
    setViewMode,
    setSelectedCalendarDate,
  ])

  // Sync tempFilterMeta (smart insight) → URL using filterId param
  // Insight IDs are strings (e.g. 'overdue') so they don't conflict with numeric saved filter IDs
  useEffect(() => {
    const insightId = tempFilterMeta?.id
    const params = new URLSearchParams(searchParams)
    const currentFilterId = params.get('filterId')

    if (insightId && currentFilterId !== insightId) {
      params.delete('filter_id')
      params.delete('filter')
      params.set('filterId', insightId)
      Navigate(
        { pathname: '/chores', search: params.toString() },
        { replace: true },
      )
    } else if (
      !insightId &&
      currentFilterId &&
      INSIGHT_FILTER_DEFS[currentFilterId]
    ) {
      // Only clear filterId if it was set by an insight (not a numeric saved filter)
      params.delete('filterId')
      Navigate(
        { pathname: '/chores', search: params.toString() },
        { replace: true },
      )
    }
  }, [tempFilterMeta?.id, searchParams])

  const {
    handleChoreAction,
    handleChangeDueDate,
    handleCompleteWithPastDate,
    handleAssigneeChange,
    handleCompleteWithNote,
    handleNudge,
    handleBulkComplete,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkSkip,
    handleBulkMoveToProject,
  } = useChoreActions({
    chores,
    filteredChores,
    setChores,
    setFilteredChores,
    userProfile,
    impersonatedUser,
    showSuccess,
    showError,
    showWarning,
    showUndo,
    refetchChores,
    setConfirmModelConfig,
    openModal,
    closeModal,
    modalChore,
    getSelectedChoresData,
    clearSelection,
  })

  const getFilteredChores = useMemo(() => {
    if (activeFilterId || tempFilter) {
      return customFilteredChores
    }

    const baseChores = hasQuickFilters
      ? quickFilteredChores
      : projectFilteredChores

    if (searchTerm?.length > 0) {
      const searchableChores = baseChores.map(c => ({
        ...c,
        raw_label: c.labelsV2?.map(l => l.name).join(' '),
      }))
      const fuse = new Fuse(searchableChores, {
        keys: ['name', 'raw_label'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      })
      return fuse.search(searchTerm).map(result => result.item)
    }

    return baseChores
  }, [
    activeFilterId,
    tempFilter,
    customFilteredChores,
    hasQuickFilters,
    quickFilteredChores,
    projectFilteredChores,
    searchTerm,
  ])

  const { showKeyboardShortcuts } = useKeyboardShortcuts({
    isMultiSelectMode,
    selectedChores,
    addTaskModalOpen,
    searchTerm,
    searchFilter:
      hasQuickFilters || searchTerm?.length > 0 ? 'filtered' : 'All',
    filteredChores: getFilteredChores,
    choreSections,
    openChoreSections,
    handlers: {
      onOpenTaskModal: () => setAddTaskModalOpen(true),
      onNavigateToCreate: () => Navigate('/chores/create'),
      onFocusSearch: () => searchInputRef.current?.focus(),
      onCloseSearch: () => {
        setSearchTerm('')
        setFilteredChores(chores)
        setSearchInputFocus(0)
      },
      onToggleMultiSelect: toggleMultiSelectMode,
      onEnableMultiSelectAndSelectAll: () => {
        toggleMultiSelectMode()
        setTimeout(() => {
          selectAllVisibleChores(null, choreSections, openChoreSections)
        }, 0)
      },
      onSelectAll: () =>
        selectAllVisibleChores(null, choreSections, openChoreSections),
      onClearSelection: clearSelection,
      onBulkComplete: handleBulkComplete,
      onBulkSkip: handleBulkSkip,
      onBulkArchive: handleBulkArchive,
      onBulkDelete: handleBulkDelete,
      onNavigateToArchived: () => Navigate('/archived'),
      onShowMessage: showSuccess,
    },
  })

  const handleMenuOutsideClick = event => {
    if (
      anchorEl &&
      !anchorEl.contains(event.target) &&
      !menuRef.current.contains(event.target)
    ) {
      handleFilterMenuClose()
    }
  }
  const handleFilterMenuOpen = event => {
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const handleFilterMenuClose = () => {
    setAnchorEl(null)
  }

  // Clicking a label / priority chip on a task card feeds the advanced filter
  // (as a temp filter) rather than the legacy quick filters. Clicking the same
  // chip again removes that value, so chips toggle.
  const handleLabelFiltering = chipClicked => {
    const type = chipClicked.label ? 'label' : 'priority'
    const value = chipClicked.label
      ? chipClicked.label.id
      : chipClicked.priority
    if (value === undefined || value === null) return

    const selections = conditionsToSelections(tempFilter?.conditions)
    const currentValues = selections[type].values || []
    const isActive = currentValues.some(v => String(v) === String(value))
    selections[type] = {
      operator: selections[type].operator || 'is',
      values: isActive
        ? currentValues.filter(v => String(v) !== String(value))
        : [...currentValues, value],
    }

    const conditions = selectionsToConditions(selections)

    clearQuickFilters()
    setSelectedCalendarDate(null)

    if (conditions.length === 0) {
      clearTempFilter()
      clearActiveFilter()
      return
    }

    const chipName = chipClicked.label
      ? chipClicked.label.name
      : `P${chipClicked.priority}`
    applyTempFilter(
      { conditions, operator: 'AND' },
      // Keep whatever the temp filter was already labelled as (e.g. an
      // in-progress saved-filter edit); only name it when starting fresh.
      tempFilterMeta ?? { name: chipName },
    )
  }

  // Helper to update URL with filter parameters
  const updateFilterUrl = (filterType, filterValue) => {
    const params = new URLSearchParams(searchParams)

    // Clear existing filter params
    params.delete('filter')
    params.delete('filterId')
    params.delete('filter_id')

    // Set new filter param (use filterId for advanced filters)
    if (filterType && filterValue) {
      params.set(filterType, filterValue)
    }

    // Always navigate with params (preserves project param)
    Navigate(
      { pathname: '/chores', search: params.toString() },
      { replace: true },
    )
  }

  const searchOptions = useMemo(
    () => ({
      keys: ['name', 'raw_label'],
      includeScore: true,
      isCaseSensitive: false,
      findAllMatches: true,
    }),
    [],
  )

  const processedChoresForSearch = useMemo(
    () =>
      chores.map(c => ({
        ...c,
        raw_label: c.labelsV2?.map(l => l.name).join(' '),
      })),
    [chores],
  )

  const fuse = useMemo(
    () => new Fuse(processedChoresForSearch, searchOptions),
    [processedChoresForSearch, searchOptions],
  )

  const handleSearchChange = e => {
    clearActiveFilter()
    if (hasQuickFilters) {
      clearQuickFilters()
    }
    const search = e.target.value
    if (search === '') {
      setFilteredChores(selectedProject ? projectFilteredChores : chores)
      setSearchTerm('')
      setSelectedCalendarDate(null)
      return
    }

    const term = search.toLowerCase()
    setSearchTerm(term)

    // Use project-filtered chores as base for search
    const baseChores = selectedProject ? projectFilteredChores : chores
    const searchableChores = baseChores.map(c => ({
      ...c,
      raw_label: c.labelsV2?.map(l => l.name).join(' '),
    }))

    const fuse = new Fuse(searchableChores, {
      keys: ['name', 'raw_label'],
      includeScore: true,
      isCaseSensitive: false,
      findAllMatches: true,
    })

    setFilteredChores(fuse.search(term).map(result => result.item))
    // Clear selected calendar date when search changes
    setSelectedCalendarDate(null)
  }
  const handleSearchClose = () => {
    setSearchTerm('')
    setFilteredChores(selectedProject ? projectFilteredChores : chores)
    setSearchInputFocus(0)
    setSelectedCalendarDate(null)
  }

  const setSelectedChoreSectionWithCache = value => {
    setSelectedChoreSection(value)
    localStorage.setItem('selectedChoreSection', value)
  }

  const setOpenChoreSectionsWithCache = value => {
    setOpenChoreSections(value)
    localStorage.setItem('openChoreSections', JSON.stringify(value))
  }

  const toggleViewMode = value => {
    const newMode =
      value ??
      (() => {
        const modes = ['default', 'compact', 'calendar']
        return modes[(modes.indexOf(viewMode) + 1) % modes.length]
      })()
    setViewMode(newMode)
    localStorage.setItem('choreCardViewMode', newMode)
    if (newMode !== 'calendar') {
      setSelectedCalendarDate(null)
    }
  }

  // const renderChoreCard = (chore, key) => {
  //   const CardComponent = viewMode === 'compact' ? CompactChoreCard : ChoreCard
  //   return (
  //     <CardComponent
  //       key={key || chore.id}
  //       chore={chore}
  //       performers={membersData?.res}
  //       userLabels={userLabels}
  //       onChipClick={handleLabelFiltering}
  //       onAction={handleChoreAction}
  //       isMultiSelectMode={isMultiSelectMode}
  //       isSelected={selectedChores.has(chore.id)}
  //       onSelectionToggle={() => toggleChoreSelection(chore.id)}
  //     />
  //   )
  // }
  // const renderChores = chores => {
  //   return (
  //     <SwipeableList>
  //       {chores.map(chore => (
  //         <SwipeableListItem
  //           key={chore.id}
  //           trailingActions={
  //             <TrailingActions>
  //               <SwipeAction>
  //                 <Button
  //                   variant='solid'
  //                   color='primary'
  //                   size='sm'
  //                   startIcon={<Add />}
  //                   onClick={() => setAddTaskModalOpen(true)}
  //                 >
  //                   Add Task
  //                 </Button>
  //               </SwipeAction>
  //             </TrailingActions>
  //           }
  //         >
  //           {/* <Button
  //             variant='outlined'
  //             color='neutral'
  //             size='sm'
  //             startIcon={<EditCalendar />}
  //             onClick={() => setViewMode('calendar')}
  //           >
  //             View Calendar
  //           </Button> */}
  //           {renderChoreCard(chore)}
  //           {/* {chores.map(chore => renderChoreCard(chore))} */}
  //         </SwipeableListItem>
  //       ))}
  //     </SwipeableList>
  //   )
  // }

  const getChoresForDate = useCallback(
    date => {
      const filteredChoresData = getFilteredChores
      return filteredChoresData.filter(chore => {
        if (!chore.nextDueDate) return false
        const choreDate = new Date(chore.nextDueDate).toLocaleDateString()
        const selectedDate = date.toLocaleDateString()
        return choreDate === selectedDate
      })
    },
    [getFilteredChores],
  )


  // "Narrowed" means the user actively cut the list down (search, quick
  // filters, a saved filter). Picking a project is not narrowing: an empty
  // project is an empty place, not a filtered-away result.
  const isNarrowed = Boolean(
    searchTerm?.length > 0 || hasQuickFilters || activeFilterId,
  )
  const isCustomProjectSelected = Boolean(
    selectedProject && selectedProject.id !== 'default',
  )

  const clearNarrowing = () => {
    clearQuickFilters()
    setSearchTerm('')
    clearActiveFilter()
    updateFilterUrl(null, null)
  }

  const appendChore = (prev, newChore) => {
    let newChores = [...prev, newChore]


    if (impersonatedUser) {
      newChores = newChores.filter(
        chore => chore.assignedTo === impersonatedUser.userId,
      )
    }

    return newChores
  }

  // Uses functional setState so back-to-back calls (e.g. creating several
  // voice-captured tasks in a row) each build on the latest state instead of
  // a closure snapshot taken before earlier calls landed.
  const updateChores = newChore => {
    setChores(prev => appendChore(prev, newChore))
    setFilteredChores(prev => appendChore(prev, newChore))
    clearQuickFilters()
  }

  // Show error state when API is unreachable
  if (choresError || membersError) {
    return (
      <Container maxWidth='md'>
        <EmptyState
          variant='error'
          fullHeight
          icon={<CloudOff />}
          title={"Can't reach Donetick"}
          description={
            choresErrorDetails?.message ||
            'Your tasks are safe. We just could not load them right now, check your connection and try again.'
          }
          primaryAction={{
            label: 'Try again',
            onClick: () => {
              refetchChores()
              queryClient.invalidateQueries(['circleMembers'])
            },
          }}
        />
      </Container>
    )
  }

  if (
    isUserProfileLoading ||
    userProfile === null ||
    userLabelsLoading ||
    membersLoading ||
    choresLoading ||
    projectsLoading
  ) {
    return (
      <>
        <LoadingComponent />
      </>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Container maxWidth='md'>
        <MyChoreHeader
          activeFilterId={activeFilterId}
          activeFilter={activeFilter}
          selectedProject={selectedProject}
          tempFilter={tempFilter}
          tempFilterMeta={tempFilterMeta}
        />
        <ChoreToolbar
          members={membersData?.res || []}
          labels={userLabels || []}
          projects={projectsWithDefault}
          tempFilter={tempFilter}
          tempFilterMeta={tempFilterMeta}
          applyTempFilter={applyTempFilter}
          clearTempFilter={clearTempFilter}
          saveFilter={saveFilter}
          updateFilter={updateFilter}
          onFilterSaved={name =>
            showSuccess({
              title: 'Filter Saved',
              message: `"${name}" has been saved`,
            })
          }
          onClearAllFilters={() => {
            clearQuickFilters()
            clearActiveFilter()
            setSelectedChoreFilterWithCache('anyone')
            setSelectedProjectWithCache(
              projectsWithDefault.find(p => p.id === 'default') || null,
            )
            updateFilterUrl(null, null)
          }}
          resultCount={
            hasQuickFilters || hasFilterApplied
              ? getFilteredChores.length
              : undefined
          }
          totalCount={
            hasQuickFilters || hasFilterApplied
              ? projectFilteredChores.length
              : undefined
          }
          selectedProject={selectedProject}
          onProjectSelect={project => {
            setSelectedProjectWithCache(project)
            clearActiveFilter()
          }}
          selectedAssigneeFilter={selectedChoreFilter}
          onAssigneeFilterChange={filter => {
            setSelectedChoreFilterWithCache(filter)
            if (activeFilterId) {
              clearActiveFilter()
              updateFilterUrl(null, null)
            }
          }}
          savedFilters={savedFilters}
          activeFilterId={activeFilterId}
          onSavedFilterClick={filterId => {
            if (activeFilterId === filterId) {
              clearActiveFilter()
              updateFilterUrl(null, null)
            } else {
              clearQuickFilters()
              setSearchTerm('')
              setFilteredChores([])
              if (selectedChoreFilter !== 'anyone') {
                setSelectedChoreFilterWithCache('anyone')
              }
              const filter = savedFilters.find(f => f.id === filterId)
              if (filter?.conditions?.some(c => c.type === 'project')) {
                setSelectedProjectWithCache(null)
              }
              applyCustomFilter(filterId)
              updateFilterUrl('filterId', filterId)
            }
          }}
          onSavedFilterEdit={filter => {
            setEditingFilter(filter)
            setShowAdvancedFilterBuilder(true)
          }}
          onSavedFilterDelete={deleteFilter}
          onSavedFilterPin={pinFilter}
          selectedGroupBy={selectedChoreSection}
          onGroupBySelect={value => {
            setSelectedChoreSectionWithCache(value)
            setFilteredChores(chores)
            clearQuickFilters()
          }}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          isMultiSelectMode={isMultiSelectMode}
          onToggleMultiSelect={toggleMultiSelectMode}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onSearchClose={handleSearchClose}
          searchInputRef={searchInputRef}
          showKeyboardShortcuts={showKeyboardShortcuts}
        />

        <MultiSelectToolbar
          isVisible={isMultiSelectMode}
          selectedCount={selectedChores.size}
          onSelectAll={() =>
            selectAllVisibleChores(
              searchTerm?.length > 0 || hasQuickFilters || activeFilterId
                ? getFilteredChores
                : null,
              choreSections,
              openChoreSections,
            )
          }
          onClear={clearSelection}
          onComplete={handleBulkComplete}
          onSkip={handleBulkSkip}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onMoveToProject={handleBulkMoveToProject}
          projects={projects}
          showKeyboardShortcuts={showKeyboardShortcuts}
          selectAllDisabled={
            searchTerm?.length > 0 || hasQuickFilters
              ? selectedChores.size === getFilteredChores.length
              : selectedChores.size ===
                choreSections.flatMap(s => s.content || []).length
          }
        />

        {/* Empty state. Three different situations, three different messages:
            nothing created yet, nothing left after narrowing, or an empty
            project. Only the middle one is about filters. */}
        {(isNarrowed
          ? getFilteredChores.length === 0
          : projectFilteredChores.length === 0) &&
          // only if not in calendar view:
          viewMode !== 'calendar' &&
          (chores.length === 0 ? (
            <EmptyState
              variant='empty'
              fullHeight
              icon={<EditCalendar />}
              title='No tasks yet'
              description='Create your first task and Donetick keeps track of when it is due, whose turn it is, and what comes next.'
              primaryAction={{
                label: 'Create a task',
                startDecorator: <Add />,
                onClick: () => setAddTaskModalOpen(true),
              }}
              secondaryAction={{
                label: 'More options',
                onClick: () => Navigate('/chores/create'),
              }}
            />
          ) : isNarrowed ? (
            <EmptyState
              variant='no-results'
              fullHeight
              icon={<SearchOff />}
              title='No tasks match this view'
              description={
                searchTerm?.length > 0
                  ? `Nothing matches "${searchTerm}". Try a different search, or clear what is narrowing the list.`
                  : 'You have tasks, but none of them fit the filters that are currently on.'
              }
              primaryAction={{
                label:
                  searchTerm?.length > 0 ? 'Clear search' : 'Clear filters',
                onClick: clearNarrowing,
              }}
            />
          ) : isCustomProjectSelected ? (
            <EmptyState
              variant='empty'
              fullHeight
              icon={<EditCalendar />}
              title={`Nothing in ${selectedProject.name} yet`}
              description='Tasks you add to this project show up here. Your other tasks are still where you left them.'
              primaryAction={{
                label: 'Add a task here',
                startDecorator: <Add />,
                onClick: () => setAddTaskModalOpen(true),
              }}
              secondaryAction={{
                label: 'See tasks outside projects',
                onClick: () => setSelectedProjectWithCache(null),
              }}
            />
          ) : (
            <EmptyState
              variant='empty'
              fullHeight
              icon={<EditCalendar />}
              title='No tasks here yet'
              description='Tasks that do not belong to a project live here. Add one, or switch projects to see what is in them.'
              primaryAction={{
                label: 'Create a task',
                startDecorator: <Add />,
                onClick: () => setAddTaskModalOpen(true),
              }}
            />
          ))}
        {searchTerm?.length > 0 && viewMode !== 'calendar' && (
          <ChoreListView
            chores={getFilteredChores}
            viewMode={viewMode}
            membersData={membersData}
            userLabels={userLabels}
            handleLabelFiltering={handleLabelFiltering}
            handleChoreAction={handleChoreAction}
            isMultiSelectMode={isMultiSelectMode}
            selectedChores={selectedChores}
            toggleChoreSelection={toggleChoreSelection}
            onLongPressChore={enterMultiSelectWithChore}
          />
        )}
        {viewMode === 'calendar' && (
          <>
            {/* Summary Chips when no date selected */}
            {/* <Box
              sx={{
                mt: 1,
                mb: 1,
                display: 'flex',
                gap: 1.5,
                justifyContent: 'start',
                flexWrap: 'wrap',
              }}
            >
              {FILTERS['Overdue'](getFilteredChores).length > 0 && (
                <Chip
                  variant='soft'
                  color='danger'
                  size='lg'
                  onClick={() => {
                    // Update state directly for immediate smooth transition
                    const overdueChores = FILTERS['Overdue'](getFilteredChores)
                    setFilteredChores(overdueChores)
                    setSearchFilter('Overdue')
                    setViewMode('default')
                    setSelectedCalendarDate(null)

                    // Update URL
                    updateFilterUrl('filter', 'overdue')
                  }}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    px: 1,
                    py: 0.5,
                  }}
                  startDecorator={
                    <Chip size='md' variant='solid' color='danger'>
                      {FILTERS['Overdue'](getFilteredChores).length}
                    </Chip>
                  }
                >
                  Overdue
                </Chip>
              )}

              {FILTERS['No Due Date'](getFilteredChores).length > 0 && (
                <Chip
                  variant='soft'
                  color='neutral'
                  size='lg'
                  onClick={() => {
                    // Update state directly for immediate smooth transition
                    const unplannedChores =
                      FILTERS['No Due Date'](getFilteredChores)
                    setFilteredChores(unplannedChores)
                    setSearchFilter('No Due Date')
                    setViewMode('default')
                    setSelectedCalendarDate(null)

                    // Update URL
                    updateFilterUrl('filter', 'unplanned')
                  }}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    px: 1,
                    py: 0.5,
                  }}
                  startDecorator={
                    <Chip size='md' variant='solid' color='neutral'>
                      {FILTERS['No Due Date'](getFilteredChores).length}
                    </Chip>
                  }
                >
                  Unplanned
                </Chip>
              )}

              {FILTERS['Pending Approval'](getFilteredChores).length > 0 && (
                <Chip
                  variant='soft'
                  size='lg'
                  onClick={() => {
                    // Update state directly for immediate smooth transition
                    const pendingApprovalChores =
                      FILTERS['Pending Approval'](getFilteredChores)
                    setFilteredChores(pendingApprovalChores)
                    setSearchFilter('Pending Approval')
                    setViewMode('default')
                    setSelectedCalendarDate(null)

                    // Update URL
                    updateFilterUrl('filter', 'pending')
                  }}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    px: 1,
                    py: 0.5,
                  }}
                  startDecorator={
                    <Chip
                      size='md'
                      variant='solid'
                      sx={{
                        bgcolor: TASK_COLOR.PENDING_REVIEW,
                        color: 'white',
                      }}
                    >
                      {FILTERS['Pending Approval'](getFilteredChores).length}
                    </Chip>
                  }
                >
                  Pending Approval
                </Chip>
              )}
            </Box> */}
            {/* Calendar Monthly View */}
            <Box sx={{ mb: 2 }}>
              {isLargeScreen ? (
                <CalendarDual
                  chores={getFilteredChores}
                  onDateChange={date => {
                    setSelectedCalendarDate(date)
                  }}
                />
              ) : (
                <div className='calendar-dual'>
                  <CalendarMonthly
                    chores={getFilteredChores}
                    onDateChange={date => {
                      setSelectedCalendarDate(date)
                    }}
                  />
                </div>
              )}
            </Box>

            {/* Selected Date Tasks */}
            {selectedCalendarDate && (
              <Box sx={{ mt: 2 }}>
                <Typography level='title-md' gutterBottom>
                  Tasks for {selectedCalendarDate.toLocaleDateString()}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {getChoresForDate(selectedCalendarDate).length === 0 ? (
                    <EmptyState
                      size='sm'
                      icon={<EditCalendar />}
                      title='Nothing scheduled'
                      description='This day is free. Add a task if you want something to land here.'
                      primaryAction={{
                        label: 'Add task',
                        startDecorator: <Add />,
                        onClick: () => setAddTaskModalOpen(true),
                      }}
                    />
                  ) : (
                    <ChoreListView
                      chores={getChoresForDate(selectedCalendarDate)}
                      viewMode={'compact'}
                      membersData={membersData}
                      userLabels={userLabels}
                      handleLabelFiltering={handleLabelFiltering}
                      handleChoreAction={handleChoreAction}
                      isMultiSelectMode={isMultiSelectMode}
                      selectedChores={selectedChores}
                      toggleChoreSelection={toggleChoreSelection}
                      onLongPressChore={enterMultiSelectWithChore}
                    />
                  )}
                </Box>
              </Box>
            )}
          </>
        )}
        {searchTerm.length === 0 && viewMode !== 'calendar' && (
          <AccordionGroup transition='0.2s ease' disableDivider>
            {choreSections.map((section, index) => {
              if (section.content.length === 0) return null
              return (
                <Accordion
                  key={section.name + index}
                  sx={{
                    my: 0,
                    px: 0,
                  }}
                  expanded={Boolean(openChoreSections[index])}
                >
                  <Divider orientation='horizontal'>
                    <Chip
                      variant='soft'
                      color='neutral'
                      size='md'
                      onClick={() => {
                        if (openChoreSections[index]) {
                          const newOpenChoreSections = {
                            ...openChoreSections,
                          }
                          delete newOpenChoreSections[index]
                          setOpenChoreSectionsWithCache(newOpenChoreSections)
                        } else {
                          setOpenChoreSectionsWithCache({
                            ...openChoreSections,
                            [index]: true,
                          })
                        }
                      }}
                      endDecorator={
                        openChoreSections[index] ? (
                          <ExpandCircleDown
                            color='primary'
                            sx={{ transform: 'rotate(180deg)' }}
                          />
                        ) : (
                          <ExpandCircleDown color='primary' />
                        )
                      }
                      startDecorator={
                        <>
                          <Chip color='primary' size='sm' variant='soft'>
                            {section?.content?.length}
                          </Chip>
                        </>
                      }
                    >
                      {section.name}
                    </Chip>
                  </Divider>
                  <AccordionDetails
                    sx={{
                      flexDirection: 'column',
                      ['& > *']: {
                        // px: 0.5,
                        px: 0.5,
                        // pr: 0,
                      },
                    }}
                  >
                    <ChoreListView
                      chores={section.content}
                      viewMode={viewMode}
                      membersData={membersData}
                      userLabels={userLabels}
                      handleLabelFiltering={handleLabelFiltering}
                      handleChoreAction={handleChoreAction}
                      isMultiSelectMode={isMultiSelectMode}
                      selectedChores={selectedChores}
                      toggleChoreSelection={toggleChoreSelection}
                      onLongPressChore={enterMultiSelectWithChore}
                    />
                  </AccordionDetails>
                </Accordion>
              )
            })}
          </AccordionGroup>
        )}
        <Box
          sx={{
            // center the button
            justifyContent: 'center',
            mt: 2,
          }}
        ></Box>
        <Box
          // variant='outlined'
          sx={{
            position: 'fixed',
            bottom: getSafeBottom(10, 10),
            left: 10,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            'z-index': 100,
          }}
        >
          <IconButton
            color='primary'
            variant='solid'
            sx={{
              borderRadius: '50%',
              width: 50,
              height: 50,
              zIndex: 101,
              position: 'relative',
            }}
            onClick={() => {
              Navigate(`/chores/create`)
            }}
            title='Create new chore (Cmd+C)'
          >
            <Add />
            <KeyboardShortcutHint
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                zIndex: 1000,
              }}
              show={showKeyboardShortcuts}
              shortcut='J'
            />
          </IconButton>
          <IconButton
            data-testid='open-add-task-modal'
            color='primary'
            variant='soft'
            sx={{
              borderRadius: '50%',
              width: 25,
              height: 25,
              position: 'relative',
              left: -25,
              top: 22,
            }}
            onClick={() => {
              setAddTaskModalOpen(true)
            }}
          >
            <Bolt
              style={{
                rotate: '20deg',
              }}
            />
          </IconButton>

          <KeyboardShortcutHint
            sx={{ position: 'relative', left: -40, top: 30 }}
            show={showKeyboardShortcuts}
            shortcut='K'
          />
        </Box>
        <NotificationAccessSnackbar />
        <FeedbackPrompt />
        {addTaskModalOpen && (
          <TaskInput
            autoFocus={taskInputFocus}
            onChoreUpdate={updateChores}
            isModalOpen={addTaskModalOpen}
            initialMode={addTaskInitialMode}
            onClose={forceRefresh => {
              setAddTaskModalOpen(false)
              setAddTaskInitialMode(null)
              if (forceRefresh) {
                refetchChores()
              }
            }}
          />
        )}
      </Container>

      <Sidepanel
        chores={customFilteredChores}
        allChores={chores}
        performers={membersData?.res || []}
        applyTempFilter={applyTempFilter}
        clearTempFilter={clearTempFilter}
        tempFilter={tempFilter}
      />

      {/* Multi-select Help - only show when in multi-select mode */}
      {/* <MultiSelectHelp isVisible={isMultiSelectMode} /> */}

      {/* Confirmation Modal for bulk operations */}
      {confirmModelConfig?.isOpen && (
        <ConfirmationModal config={confirmModelConfig} />
      )}

      <ChoreModals
        activeModal={activeModal}
        modalChore={modalChore}
        membersData={membersData}
        onChangeDueDate={handleChangeDueDate}
        onCompleteWithPastDate={handleCompleteWithPastDate}
        onAssigneeChange={handleAssigneeChange}
        onCompleteWithNote={handleCompleteWithNote}
        onNudge={handleNudge}
        onClose={closeModal}
      />

      {/* Advanced Filter Builder */}
      <AdvancedFilterBuilder
        isOpen={showAdvancedFilterBuilder}
        onClose={() => {
          setShowAdvancedFilterBuilder(false)
          setEditingFilter(null)
        }}
        onSave={filter => {
          if (filter.id) {
            // Update existing filter
            updateFilter(filter.id, {
              name: filter.name,
              description: filter.description,
              color: filter.color,
              conditions: filter.conditions,
              operator: filter.operator,
            })
            showSuccess({
              title: 'Filter Updated',
              message: `"${filter.name}" has been updated successfully`,
            })
          } else {
            // Create new filter
            saveFilter(filter)
            showSuccess({
              title: 'Advanced Filter Created',
              message: `"${filter.name}" has been created successfully`,
            })
          }
          setShowAdvancedFilterBuilder(false)
          setEditingFilter(null)
        }}
        members={membersData?.res || []}
        labels={userLabels || []}
        projects={projectsWithDefault}
        allChores={searchFilteredChores}
        userProfile={userProfile}
        editingFilter={editingFilter}
      />
    </div>
  )
}

export default MyChores
