import {
  Add,
  Bolt,
  CalendarMonth,
  CancelRounded,
  CheckBox,
  CheckBoxOutlineBlank,
  EditCalendar,
  ExpandCircleDown,
  Grain,
  PriorityHigh,
  Sort,
  Style,
  ViewAgenda,
  ViewModule,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  List,
  Menu,
  MenuItem,
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
import ChoreCard from './ChoreCard'
import CompactChoreCard from './CompactChoreCard'
import IconButtonWithMenu from './IconButtonWithMenu'

import { useMediaQuery } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
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
import ProjectSelector from '../components/ProjectSelector'
import AdvancedFilterBuilder from '../Modals/Inputs/AdvancedFilterBuilder'
import { useProjects } from '../Projects/ProjectQueries.js'
import ChoreModals from './components/ChoreModals'
import FilterSection from './components/FilterSection'
import MultiSelectToolbar from './components/MultiSelectToolbar'
import SearchBar from './components/SearchBar'
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
import SortAndGrouping from './SortAndGrouping'

const MyChores = () => {
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile()
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('md'))
  const { showSuccess, showError, showWarning, showUndo } = useNotification()
  const queryClient = useQueryClient()
  const { impersonatedUser } = useImpersonateUser()
  const Navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const {
    data: choresData,
    isLoading: choresLoading,
    refetch: refetchChores,
  } = useChores(false)
  const { data: membersData, isLoading: membersLoading } = useCircleMembers()

  const [chores, setChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [choreSections, setChoreSections] = useState([])
  const [showSearchFilter, setShowSearchFilter] = useState(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [taskInputFocus, setTaskInputFocus] = useState(0)
  const searchInputRef = useRef(null)
  const [searchInputFocus, setSearchInputFocus] = useState(0)
  const [selectedChoreSection, setSelectedChoreSection] = useState(
    localStorage.getItem('selectedChoreSection') || 'due_date',
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
    useProjectFilter(projects)

  const {
    searchTerm,
    searchFilter,
    selectedChoreFilter,
    projectFilteredChores,
    searchFilteredChores,
    nonProjectFilteredChores,
    setSearchTerm,
    setSearchFilter,
    setSelectedChoreFilterWithCache,
    clearFilters,
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

    // If a custom filter (temp or saved) is active, use customFilteredChores
    let choresToGroup = chores
    if (tempFilter || activeFilterId) {
      choresToGroup = customFilteredChores
    } else if (selectedProject) {
      // Otherwise, use project-filtered chores for section grouping
      if (selectedProject.id === 'default') {
        // Default project: only show tasks without a projectId
        choresToGroup = chores.filter(chore => !chore.projectId)
      } else {
        // Other projects: use the existing filter function
        choresToGroup = filterByProject(chores, selectedProject.id)
      }
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
    customFilteredChores,
    tempFilter,
    activeFilterId,
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

        if (localStorage.getItem('openChoreSections') === null) {
          setSelectedChoreSectionWithCache(selectedChoreSection)
          const openSections = processedSections.reduce(
            (acc, _section, index) => {
              acc[index] = true
              return acc
            },
            {},
          )
          setOpenChoreSections(openSections)
        }

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
    }
  }, [
    membersLoading,
    choresLoading,
    isUserProfileLoading,
    choresData?.res,
    membersData?.res,
    processedChores, // Added to ensure local state syncs when query data updates
    processedSections,
    userProfile,
    impersonatedUser?.userId,
    selectedChoreSection,
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

  // Read and apply filters from URL parameters
  useEffect(() => {
    if (!chores.length || !savedFilters.length) return

    // Check for filterId (camelCase) or filter_id (snake_case) for advanced filters
    const filterId =
      searchParams.get('filterId') || searchParams.get('filter_id')

    const oldFilter = searchParams.get('filter')

    // Handle advanced filter parameter
    if (filterId && !activeFilterId) {
      const filter = savedFilters.find(f => f.id === filterId)
      if (filter) {
        applyCustomFilter(filterId)
        return
      }
    }

    // Handle legacy filter parameter (e.g., filter=unplanned)
    if (oldFilter && searchFilter === 'All' && !activeFilterId) {
      const filterMap = {
        unplanned: 'No Due Date',
        overdue: 'Overdue',
        today: 'Due today',
        week: 'Due in week',
        later: 'Due Later',
        pending: 'Pending Approval',
      }

      const filterName = filterMap[oldFilter.toLowerCase()]
      if (filterName && FILTERS[filterName]) {
        const filtered = FILTERS[filterName](
          selectedProject ? projectFilteredChores : chores,
        )
        setFilteredChores(filtered)
        setSearchFilter(filterName)
        setViewMode('default')
        setSelectedCalendarDate(null)
      }
    }
  }, [
    searchParams,
    chores,
    searchFilter,
    activeFilterId,
    savedFilters,
    applyCustomFilter,
    selectedProject,
    projectFilteredChores,
    setSearchFilter,
    setFilteredChores,
    setViewMode,
    setSelectedCalendarDate,
  ])

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

  const { showKeyboardShortcuts } = useKeyboardShortcuts({
    isMultiSelectMode,
    selectedChores,
    addTaskModalOpen,
    searchTerm,
    searchFilter,
    filteredChores,
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
          selectAllVisibleChores()
        }, 0)
      },
      onSelectAll: () => selectAllVisibleChores(),
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

  const handleLabelFiltering = chipClicked => {
    clearActiveFilter()

    const baseChores = selectedProject ? projectFilteredChores : chores

    if (chipClicked.label) {
      const label = chipClicked.label
      const labelFiltered = baseChores.filter(chore =>
        chore.labelsV2.some(
          l => l.id === label.id && l.created_by === label.created_by,
        ),
      )
      setFilteredChores(labelFiltered)
      setSearchFilter('Label: ' + label.name)
    } else if (chipClicked.priority) {
      const priority = chipClicked.priority
      const priorityFiltered = baseChores.filter(
        chore => chore.priority === priority,
      )
      setFilteredChores(priorityFiltered)
      setSearchFilter('Priority: ' + priority)
    }
    setSelectedCalendarDate(null)
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
    Navigate({ pathname: '/chores', search: params.toString() })
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
    if (searchFilter !== 'All') {
      setSearchFilter('All')
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

  const toggleViewMode = () => {
    const modes = ['default', 'compact', 'calendar']
    const currentIndex = modes.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const newMode = modes[nextIndex]
    setViewMode(newMode)
    localStorage.setItem('choreCardViewMode', newMode)

    if (newMode !== 'calendar') {
      setSelectedCalendarDate(null)
    }
  }

  const renderChoreCard = (chore, key) => {
    const CardComponent = viewMode === 'compact' ? CompactChoreCard : ChoreCard
    return (
      <CardComponent
        key={key || chore.id}
        chore={chore}
        performers={membersData?.res}
        userLabels={userLabels}
        onChipClick={handleLabelFiltering}
        onAction={handleChoreAction}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedChores.has(chore.id)}
        onSelectionToggle={() => toggleChoreSelection(chore.id)}
      />
    )
  }

  const getFilteredChores = useMemo(() => {
    if (activeFilterId || tempFilter) {
      return customFilteredChores
    }

    let baseChores = projectFilteredChores

    if (searchTerm?.length > 0 || searchFilter !== 'All') {
      if (searchTerm?.length > 0) {
        const projectFilteredForSearch = baseChores.map(c => ({
          ...c,
          raw_label: c.labelsV2?.map(l => l.name).join(' '),
        }))
        const fuse = new Fuse(projectFilteredForSearch, {
          keys: ['name', 'raw_label'],
          includeScore: true,
          isCaseSensitive: false,
          findAllMatches: true,
        })
        return fuse.search(searchTerm).map(result => result.item)
      } else if (searchFilter !== 'All') {
        return filteredChores
      }
    }

    return baseChores
  }, [
    activeFilterId,
    tempFilter,
    customFilteredChores,
    projectFilteredChores,
    searchTerm,
    searchFilter,
    filteredChores,
  ])

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

  const updateChores = newChore => {
    let newChores = [...chores, newChore]

    if (impersonatedUser) {
      newChores = newChores.filter(
        chore => chore.assignedTo === impersonatedUser.userId,
      )
    }

    setChores(newChores)
    setFilteredChores(newChores)
    setSearchFilter('All')
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignContent: 'center',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            onClose={handleSearchClose}
            onFocus={() => setShowSearchFilter(true)}
            showKeyboardShortcuts={showKeyboardShortcuts}
            inputRef={searchInputRef}
          />

          <SortAndGrouping
            title='Group by'
            k={'icon-menu-group-by'}
            icon={<Sort />}
            selectedItem={selectedChoreSection}
            selectedFilter={selectedChoreFilter}
            setFilter={filter => {
              setSelectedChoreFilterWithCache(filter)
              // Clear active custom filter when quick filter is applied
              if (activeFilterId) {
                clearActiveFilter()
                updateFilterUrl(null, null)
              }
            }}
            onItemSelect={selected => {
              setSelectedChoreSectionWithCache(selected.value)
              setFilteredChores(chores)
              setSearchFilter('All')
            }}
            onCreateNewFilter={() => {
              setShowAdvancedFilterBuilder(true)
              setEditingFilter(null)
            }}
            mouseClickHandler={handleMenuOutsideClick}
          />

          {/* Project Selector - Hidden when active filter has project conditions */}
          {projectsWithDefault.length > 1 &&
            !hasProjectConditions &&
            !hasFilterApplied && (
              <ProjectSelector
                selectedProject={selectedProject?.name || 'Default Project'}
                onProjectSelect={project => {
                  setSelectedProjectWithCache(project)
                  clearActiveFilter()
                }}
                showKeyboardShortcuts={showKeyboardShortcuts}
              />
            )}

          {/* View Mode Toggle Button */}
          <IconButton
            variant='outlined'
            color='neutral'
            size='sm'
            sx={{
              height: 32,
              width: 32,
              borderRadius: '50%',
            }}
            onClick={toggleViewMode}
            title={
              viewMode === 'default'
                ? 'Switch to Compact View'
                : viewMode === 'compact'
                  ? 'Switch to Calendar View'
                  : 'Switch to Card View'
            }
          >
            {viewMode === 'default' ? (
              <ViewAgenda />
            ) : viewMode === 'compact' ? (
              <CalendarMonth />
            ) : (
              <ViewModule />
            )}
          </IconButton>

          {/* Multi-select Toggle Button */}
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <IconButton
              variant={isMultiSelectMode ? 'solid' : 'outlined'}
              color={isMultiSelectMode ? 'primary' : 'neutral'}
              size='sm'
              sx={{
                height: 32,
                width: 32,
                borderRadius: '50%',
              }}
              onClick={toggleMultiSelectMode}
              title={
                isMultiSelectMode
                  ? 'Exit Multi-select Mode (Ctrl+S)'
                  : 'Enable Multi-select Mode (Ctrl+S)'
              }
            >
              {isMultiSelectMode ? <CheckBox /> : <CheckBoxOutlineBlank />}
            </IconButton>
            <KeyboardShortcutHint
              shortcut='S'
              show={showKeyboardShortcuts}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                zIndex: 1000,
              }}
            />
          </Box>
        </Box>

        {/* Search Filter with animation */}
        <Box
          sx={{
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            maxHeight: showSearchFilter ? '150px' : '0',
            opacity: showSearchFilter ? 1 : 0,
            transform: showSearchFilter ? 'translateY(0)' : 'translateY(-10px)',
            marginBottom: showSearchFilter ? 1 : 0,
          }}
        >
          <div className='flex gap-4'>
            <div className='grid flex-1 grid-cols-3 gap-4'>
              <IconButtonWithMenu
                label={' Priority'}
                k={'icon-menu-priority-filter'}
                icon={<PriorityHigh />}
                options={Priorities}
                selectedItem={searchFilter}
                onItemSelect={selected => {
                  handleLabelFiltering({ priority: selected.value })
                }}
                mouseClickHandler={handleMenuOutsideClick}
                isActive={searchFilter.startsWith('Priority: ')}
              />

              <IconButtonWithMenu
                k={'icon-menu-labels-filter'}
                label={' Labels'}
                icon={<Style />}
                options={userLabels}
                selectedItem={searchFilter}
                onItemSelect={selected => {
                  handleLabelFiltering({ label: selected })
                }}
                isActive={searchFilter.startsWith('Label: ')}
                mouseClickHandler={handleMenuOutsideClick}
                useChips
              />

              <Button
                onClick={handleFilterMenuOpen}
                variant='outlined'
                startDecorator={<Grain />}
                color={
                  searchFilter && FILTERS[searchFilter] && searchFilter != 'All'
                    ? 'primary'
                    : 'neutral'
                }
                size='sm'
                sx={{
                  height: 24,
                  borderRadius: 24,
                }}
              >
                {' Other'}
              </Button>

              <List
                orientation='horizontal'
                wrap
                sx={{
                  mt: 0.2,
                }}
              >
                <Menu
                  ref={menuRef}
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleFilterMenuClose}
                >
                  {Object.keys(FILTERS).map((filter, index) => (
                    <MenuItem
                      key={`filter-list-${filter}-${index}`}
                      onClick={() => {
                        const filterFunction = FILTERS[filter]
                        const baseChores = selectedProject
                          ? projectFilteredChores
                          : chores
                        const filteredChores =
                          filterFunction.length === 2
                            ? filterFunction(baseChores, userProfile?.id)
                            : filterFunction(baseChores)
                        setFilteredChores(filteredChores)
                        setSearchFilter(filter)
                        handleFilterMenuClose()

                        // Update URL with legacy filter parameter
                        const filterMap = {
                          'No Due Date': 'unplanned',
                          Overdue: 'overdue',
                          'Due today': 'today',
                          'Due in week': 'week',
                          'Due Later': 'later',
                          'Pending Approval': 'pending',
                        }
                        const urlFilter = filterMap[filter]
                        if (urlFilter) {
                          updateFilterUrl('filter', urlFilter)
                        }
                      }}
                    >
                      {filter}
                      <Chip
                        color={searchFilter === filter ? 'primary' : 'neutral'}
                      >
                        {(() => {
                          const baseChores = selectedProject
                            ? projectFilteredChores
                            : chores
                          return FILTERS[filter].length === 2
                            ? FILTERS[filter](baseChores, userProfile?.id)
                                .length
                            : FILTERS[filter](baseChores).length
                        })()}
                      </Chip>
                    </MenuItem>
                  ))}

                  {searchFilter.startsWith('Label: ') ||
                    (searchFilter.startsWith('Priority: ') && (
                      <MenuItem
                        key={`filter-list-cancel-all-filters`}
                        onClick={() => {
                          setFilteredChores(
                            selectedProject ? projectFilteredChores : chores,
                          )
                          setSearchFilter('All')
                          updateFilterUrl(null, null)
                        }}
                      >
                        Cancel All Filters
                      </MenuItem>
                    ))}
                </Menu>
              </List>
            </div>
            <IconButton
              variant='outlined'
              color='neutral'
              size='sm'
              sx={{
                height: 24,
                borderRadius: 24,
              }}
              onClick={() => {
                setShowSearchFilter(false)
                setSearchTerm('')
                setFilteredChores(chores)
                setSearchFilter('All')
                updateFilterUrl(null, null)
              }}
            >
              <CancelRounded />
            </IconButton>
          </div>
        </Box>

        {/* Custom Filters Section */}
        <FilterSection
          savedFilters={savedFilters}
          activeFilterId={activeFilterId}
          activeFilter={activeFilter}
          hasProjectConditions={hasProjectConditions}
          onFilterClick={filterId => {
            if (activeFilterId === filterId) {
              clearActiveFilter()
              updateFilterUrl(null, null)
            } else {
              setSearchFilter('All')
              setSearchTerm('')
              setFilteredChores([])

              // Reset quick filter to 'anyone' when custom filter is applied
              if (selectedChoreFilter !== 'anyone') {
                setSelectedChoreFilterWithCache('anyone')
              }

              // Clear project selection if the filter has project conditions
              const filter = savedFilters.find(f => f.id === filterId)
              if (filter?.conditions?.some(c => c.type === 'project')) {
                setSelectedProjectWithCache(null)
              }

              applyCustomFilter(filterId)
              updateFilterUrl('filterId', filterId)
            }
          }}
          onFilterDelete={deleteFilter}
          onFilterPin={pinFilter}
          onFilterEdit={filter => {
            setEditingFilter(filter)
            setShowAdvancedFilterBuilder(true)
          }}
          onClearActiveFilter={clearActiveFilter}
          onCreateAdvancedFilter={() => setShowAdvancedFilterBuilder(true)}
          updateFilterUrl={updateFilterUrl}
        />

        <MultiSelectToolbar
          isVisible={isMultiSelectMode}
          selectedCount={selectedChores.size}
          onSelectAll={selectAllVisibleChores}
          onClear={clearSelection}
          onComplete={handleBulkComplete}
          onSkip={handleBulkSkip}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          showKeyboardShortcuts={showKeyboardShortcuts}
          selectAllDisabled={
            searchTerm?.length > 0 || searchFilter !== 'All'
              ? selectedChores.size === filteredChores.length
              : selectedChores.size ===
                choreSections.flatMap(s => s.content || []).length
          }
        />

        {/* Additional Filters Display */}
        {searchFilter !== 'All' && (
          <Chip
            level='title-md'
            gutterBottom
            color='warning'
            label={searchFilter}
            onDelete={() => {
              setFilteredChores(
                selectedProject ? projectFilteredChores : chores,
              )
              setSearchFilter('All')
              updateFilterUrl(null, null)
            }}
            endDecorator={<CancelRounded />}
            onClick={() => {
              setFilteredChores(
                selectedProject ? projectFilteredChores : chores,
              )
              setSearchFilter('All')
              updateFilterUrl(null, null)
            }}
          >
            Additional Filter: {searchFilter}
          </Chip>
        )}
        {/* Show "Nothing scheduled" when appropriate based on current view mode */}
        {(searchTerm?.length > 0 || searchFilter !== 'All' || activeFilterId
          ? getFilteredChores.length === 0
          : projectFilteredChores.length === 0) &&
          // only if not in calendar view:
          viewMode !== 'calendar' && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                height: '50vh',
              }}
            >
              <EditCalendar
                sx={{
                  fontSize: '4rem',
                  // color: 'text.disabled',
                  mb: 1,
                }}
              />
              <Typography level='title-md' gutterBottom>
                Nothing scheduled
              </Typography>
              {chores.length > 0 && (
                <>
                  <Button
                    onClick={() => {
                      setSearchFilter('All')
                      setSearchTerm('')
                      clearActiveFilter()
                    }}
                    variant='outlined'
                    color='neutral'
                  >
                    Reset filters
                  </Button>
                </>
              )}
            </Box>
          )}
        {(searchTerm?.length > 0 || searchFilter !== 'All' || activeFilterId) &&
          viewMode !== 'calendar' &&
          getFilteredChores.map(chore =>
            renderChoreCard(chore, `filtered-${chore.id}`),
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
                    <Typography
                      level='body-sm'
                      sx={{
                        textAlign: 'center',
                        py: 2,
                        color: 'text.tertiary',
                      }}
                    >
                      No tasks scheduled for this date
                    </Typography>
                  ) : (
                    getChoresForDate(selectedCalendarDate).map(chore => (
                      <CompactChoreCard
                        key={`calendar-${chore.id}`}
                        chore={chore}
                        performers={membersData?.res || []}
                        userLabels={userLabels}
                        onChipClick={handleLabelFiltering}
                        onAction={handleChoreAction}
                        // Multi-select props
                        isMultiSelectMode={isMultiSelectMode}
                        isSelected={selectedChores.has(chore.id)}
                        onSelectionToggle={() => toggleChoreSelection(chore.id)}
                      />
                    ))
                  )}
                </Box>
              </Box>
            )}
          </>
        )}
        {searchTerm.length === 0 &&
          searchFilter === 'All' &&
          !activeFilterId &&
          viewMode !== 'calendar' && (
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
                      {section.content?.map(chore => renderChoreCard(chore))}
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
        {addTaskModalOpen && (
          <TaskInput
            autoFocus={taskInputFocus}
            onChoreUpdate={updateChores}
            isModalOpen={addTaskModalOpen}
            onClose={forceRefresh => {
              setAddTaskModalOpen(false)
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

const FILTERS = {
  All: function (chores) {
    return chores
  },
  Overdue: function (chores) {
    return chores.filter(chore => {
      if (chore.nextDueDate === null) return false
      return new Date(chore.nextDueDate) < new Date()
    })
  },
  'Due today': function (chores) {
    return chores.filter(chore => {
      return (
        new Date(chore.nextDueDate).toDateString() === new Date().toDateString()
      )
    })
  },
  'Due in week': function (chores) {
    return chores.filter(chore => {
      return (
        new Date(chore.nextDueDate) <
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
        new Date(chore.nextDueDate) > new Date()
      )
    })
  },
  'Due Later': function (chores) {
    return chores.filter(chore => {
      return (
        new Date(chore.nextDueDate) > new Date(Date.now() + 24 * 60 * 60 * 1000)
      )
    })
  },
  'Created By Me': function (chores, userID) {
    return chores.filter(chore => {
      return chore.createdBy === userID
    })
  },
  'Assigned To Me': function (chores, userID) {
    return chores.filter(chore => {
      return chore.assignedTo === userID
    })
  },
  'No Due Date': function (chores) {
    return chores.filter(chore => {
      return chore.nextDueDate === null
    })
  },
  'Pending Approval': function (chores) {
    return chores.filter(chore => {
      return chore.status === 3
    })
  },
}

export default MyChores
