import {
  Add,
  Archive,
  Bolt,
  CalendarMonth,
  CancelRounded,
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  Delete,
  Done,
  EditCalendar,
  ExpandCircleDown,
  Grain,
  PriorityHigh,
  SelectAll,
  SkipNext,
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
  Input,
  List,
  Menu,
  MenuItem,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useArchiveChore,
  useChores,
  useDeleteChores,
  useUnArchiveChore,
} from '../../queries/ChoreQueries'
import { useNotification } from '../../service/NotificationProvider'
import { TASK_COLOR } from '../../utils/Colors'
import Priorities from '../../utils/Priorities'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import DateModal from '../Modals/Inputs/DateModal'
import NudgeModal from '../Modals/Inputs/NudgeModal'
import SelectModal from '../Modals/Inputs/SelectModal'
import TextModal from '../Modals/Inputs/TextModal'
import WriteNFCModal from '../Modals/Inputs/WriteNFCModal'
import ChoreCard from './ChoreCard'
import CompactChoreCard from './CompactChoreCard'
import IconButtonWithMenu from './IconButtonWithMenu'

import { useMediaQuery } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { usePauseChore, useStartChore } from '../../queries/TimeQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import {
  ChoreFilters,
  ChoresGrouper,
  ChoreSorter,
  filterByProject,
} from '../../utils/Chores'
import {
  ApproveChore,
  DeleteChore,
  MarkChoreComplete,
  NudgeChore,
  RejectChore,
  SkipChore,
  UndoChoreAction,
  UpdateChoreAssignee,
  UpdateDueDate,
} from '../../utils/Fetcher'
import { getSafeBottom } from '../../utils/SafeAreaUtils.js'
import TaskInput from '../components/AddTaskModal'
import CalendarDual from '../components/CalendarDual'
import CalendarMonthly from '../components/CalendarMonthly.jsx'
import ProjectSelector from '../components/ProjectSelector'
import { useProjects } from '../Projects/ProjectQueries.js'
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
  const archiveChore = useArchiveChore()
  const unarchiveChore = useUnArchiveChore()
  const deleteChores = useDeleteChores()
  const startChore = useStartChore()
  const pauseChore = usePauseChore()
  const [chores, setChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [searchFilter, setSearchFilter] = useState('All')
  const [selectedProject, setSelectedProject] = useState(() => {
    // Get saved project from localStorage, default to null
    const saved = localStorage.getItem('selectedProject')
    return saved ? JSON.parse(saved) : null
  })
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
  const [selectedChoreFilter, setSelectedChoreFilter] = useState(
    localStorage.getItem('selectedChoreFilter') || 'anyone',
  )
  const [searchTerm, setSearchTerm] = useState('')

  const [anchorEl, setAnchorEl] = useState(null)
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('choreCardViewMode') || 'default',
  )
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date())
  const menuRef = useRef(null)
  const Navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()

  // Create a projects list that includes the default project for the ProjectSelector
  const projectsWithDefault = useMemo(() => {
    const defaultProject = {
      id: 'default',
      name: 'Default Project',
      description: 'Your default project workspace',
      color: '#1976d2',
      icon: 'FolderOpen',
    }

    // Check if default project already exists in the list
    const hasDefault = projects.some(
      p => p.id === 'default' || p.name === 'Default Project',
    )

    return hasDefault ? projects : [defaultProject, ...projects]
  }, [projects])
  const {
    data: choresData,
    isLoading: choresLoading,
    refetch: refetchChores,
  } = useChores(false)
  const { data: membersData, isLoading: membersLoading } = useCircleMembers()

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedChores, setSelectedChores] = useState(new Set())
  const [confirmModelConfig, setConfirmModelConfig] = useState({})

  // Centralized modal state
  const [activeModal, setActiveModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [modalChore, setModalChore] = useState(null)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
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

    // Use project-filtered chores for section grouping
    const choresToGroup = selectedProject
      ? filterByProject(chores, selectedProject.id)
      : chores

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

  // Keyboard shortcuts for multi-select and other actions
  useEffect(() => {
    const handleKeyDown = event => {
      // if the modal open we don't want anything here to trigger
      if (addTaskModalOpen) return
      // if Ctrl/Cmd + / then show keyboard shortcuts modal
      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }
      const isHoldingCmdOrCtrl = event.ctrlKey || event.metaKey
      // Ctrl/Cmd + K to open task modal
      if (isHoldingCmdOrCtrl && event.key === 'k') {
        event.preventDefault()
        setAddTaskModalOpen(true)
        return
      }

      if (addTaskModalOpen) {
        // we want to ignore anything in here until the modal close
        return
      }

      // Ctrl/Cmd + J to navigate to create chore page
      if (isHoldingCmdOrCtrl && event.key === 'j') {
        event.preventDefault()
        Navigate(`/chores/create`)
        return
      }

      // Ctrl/Cmd + F to focus search input:
      else if (isHoldingCmdOrCtrl && event.key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
        // Ctrl/Cmd + X to close search input
      } else if (isHoldingCmdOrCtrl && event.key === 'x') {
        event.preventDefault()
        if (searchTerm?.length > 0) {
          handleSearchClose()
        }
      }
      // Ctrl/Cmd + S Toggle Multi-select mode
      else if (isHoldingCmdOrCtrl && event.key === 's') {
        event.preventDefault()
        toggleMultiSelectMode()
        return
      }

      // Ctrl/Cmd + A to select all - works both in and out of multi-select mode
      else if (
        isHoldingCmdOrCtrl &&
        event.key === 'a' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        event.preventDefault()
        if (!isMultiSelectMode) {
          // Enable multi-select mode and select all visible tasks
          setIsMultiSelectMode(true)
          setTimeout(() => {
            selectAllVisibleChores()
          }, 0)
          // showSuccess({
          //   title: '🎯 Multi-select Mode Active',
          //   message: 'Selected all visible tasks. Press Esc to exit.',
          // })
        } else {
          // Already in multi-select mode, check if all visible tasks are already selected
          let visibleChores = []

          if (searchTerm?.length > 0 || searchFilter !== 'All') {
            visibleChores = filteredChores
            const allVisibleSelected =
              visibleChores.length > 0 &&
              visibleChores.every(chore => selectedChores.has(chore.id))

            if (allVisibleSelected) {
              showSuccess({
                title: '✅ All Tasks Selected',
                message: `All ${visibleChores.length} filtered task${visibleChores.length !== 1 ? 's are' : ' is'} already selected.`,
              })
            } else {
              selectAllVisibleChores()
              showSuccess({
                title: '🎯 Tasks Selected',
                message: `Selected ${visibleChores.length} filtered task${visibleChores.length !== 1 ? 's' : ''}.`,
              })
            }
          } else {
            // Check expanded sections first
            const expandedChores = choreSections
              .filter((_section, index) => openChoreSections[index])
              .flatMap(section => section.content || [])

            const allExpandedSelected =
              expandedChores.length > 0 &&
              expandedChores.every(chore => selectedChores.has(chore.id))

            // Get all chores (including collapsed sections)
            const allChores = choreSections.flatMap(
              section => section.content || [],
            )
            const allChoresSelected =
              allChores.length > 0 &&
              allChores.every(chore => selectedChores.has(chore.id))

            if (allChoresSelected) {
              // All chores (including collapsed) are already selected
              showSuccess({
                title: '✅ All Tasks Selected',
                message: `All ${allChores.length} task${allChores.length !== 1 ? 's are' : ' is'} already selected (including collapsed sections).`,
              })
            } else if (allExpandedSelected) {
              // All expanded are selected, now select ALL (including collapsed)
              selectAllVisibleChores() // This will now select all chores
              const collapsedCount = allChores.length - expandedChores.length
              showSuccess({
                title: '🎯 All Tasks Selected',
                message: `Selected all ${allChores.length} tasks (including ${collapsedCount} from collapsed sections).`,
              })
            } else {
              // Not all expanded are selected, select expanded only
              selectAllVisibleChores() // This will select expanded only
              showSuccess({
                title: '🎯 Tasks Selected',
                message: `Selected ${expandedChores.length} task${expandedChores.length !== 1 ? 's' : ''} from expanded sections.`,
              })
            }
          }
        }
      }

      // Multi-select keyboard shortcuts (only when in multi-select mode)
      if (isMultiSelectMode) {
        // Escape to clear selection or exit multi-select mode
        if (event.key === 'Escape') {
          event.preventDefault()
          if (selectedChores.size > 0) {
            clearSelection()
          } else {
            setIsMultiSelectMode(false)
          }
          return
        }

        // Enter key for bulk complete
        if (
          isHoldingCmdOrCtrl &&
          event.key === 'Enter' &&
          selectedChores.size > 0
        ) {
          event.preventDefault()
          handleBulkComplete()
          return
        }

        // "/" key for bulk skip
        if (
          isHoldingCmdOrCtrl &&
          event.key === '/' &&
          selectedChores.size > 0
        ) {
          event.preventDefault()
          handleBulkSkip()
          return
        }

        // "x" key for bulk archive (without shift or modifiers)
        if (
          isHoldingCmdOrCtrl &&
          (event.key === 'x' || event.key === 'X') &&
          selectedChores.size > 0 &&
          !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
        ) {
          event.preventDefault()
          handleBulkArchive()
          return
        }
      }

      if (
        isHoldingCmdOrCtrl &&
        (event.key === 'e' || event.key === 'E') &&
        selectedChores.size > 0 &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        event.preventDefault()
        if (isMultiSelectMode && selectedChores.size > 0) {
          handleBulkDelete()
        }
        return
      }

      // Ctrl/Cmd + O to navigate to archived tasks
      if (isHoldingCmdOrCtrl && event.key === 'o') {
        event.preventDefault()
        Navigate('/archived')
        return
      }
    }
    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setShowKeyboardShortcuts(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isMultiSelectMode, selectedChores.size, addTaskModalOpen])

  // Helper function to update local state and show notifications
  const updateChoreInState = (updatedChore, event) => {
    let newChores = chores.map(c =>
      c.id === updatedChore.id ? updatedChore : c,
    )
    let newFilteredChores = filteredChores.map(c =>
      c.id === updatedChore.id ? updatedChore : c,
    )

    // Remove from lists if archived or completed (once/trigger types)
    if (
      event === 'archive' ||
      (event === 'completed' && updatedChore.frequencyType === 'once') ||
      updatedChore.frequencyType === 'trigger'
    ) {
      newChores = newChores.filter(c => c.id !== updatedChore.id)
      newFilteredChores = newFilteredChores.filter(
        c => c.id !== updatedChore.id,
      )
    }

    setChores(newChores)
    setFilteredChores(newFilteredChores)
    setChoreSections(
      ChoresGrouper(
        selectedChoreSection,
        newChores,
        ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
          selectedChoreFilter
        ],
      ),
    )

    // Invalidate query to ensure sync with server data
    // This prevents data from getting stale after token refresh or background updates
    queryClient.invalidateQueries({ queryKey: ['chores'] })

    // Show notifications - handle undoable actions with undo button (only for single actions)
    if (!isMultiSelectMode) {
      const undoableActions = {
        completed: 'Task completed',
        approved: 'Task approved',
        rejected: 'Task rejected',
        skipped: 'Task skipped',
      }

      if (undoableActions[event]) {
        showSuccess({
          message: undoableActions[event],
          undoAction: async () => {
            try {
              const undoResponse = await UndoChoreAction(updatedChore.id)
              if (undoResponse.ok) {
                refetchChores()
                const undoMessages = {
                  completed: 'Task completion has been undone.',
                  approved: 'Task approval has been undone.',
                  rejected: 'Task rejection has been undone.',
                  skipped: 'Task skip has been undone.',
                }
                showUndo({
                  title: 'Undo Successful',
                  message: undoMessages[event],
                })
              } else {
                console.log('Failed to undo', undoResponse)

                throw new Error('Failed to undo')
              }
            } catch (error) {
              showError({
                title: 'Undo Failed',
                message: 'Unable to undo the action. Please try again.',
              })
              console.log('Undo error:', error)
            }
          },
        })
        return // Exit early for undoable actions
      }
    }

    // Regular notifications for non-undoable actions
    const notifications = {
      rescheduled: {
        type: 'success',
        title: 'Task Rescheduled',
        message: 'The task due date has been updated successfully.',
      },
      'due-date-removed': {
        type: 'success',
        title: 'Task Unplanned',
        message: 'The task is now unplanned and has no due date.',
      },
      unarchive: {
        type: 'success',
        title: 'Task Restored',
        message: 'The task has been restored and is now active.',
      },
      archive: {
        type: 'success',
        title: 'Task Archived',
        message: 'The task has been archived and hidden from the active list.',
      },
      started: {
        type: 'success',
        title: 'Task Started',
        message: 'The task has been marked as started.',
      },
      paused: {
        type: 'warning',
        title: 'Task Paused',
        message: 'The task has been paused.',
      },
      deleted: {
        type: 'success',
        title: 'Task Deleted',
        message: 'The task has been deleted.',
      },
    }

    const notification = notifications[event]
    if (notification) {
      const notifyFn =
        notification.type === 'warning' ? showWarning : showSuccess
      notifyFn({ title: notification.title, message: notification.message })
    }
  }

  // Centralized action handler for all chore operations
  const handleChoreAction = async (action, chore, extraData = {}) => {
    switch (action) {
      case 'complete':
        try {
          const response = await MarkChoreComplete(
            chore.id,
            impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
            null,
            null,
          )
          if (response.ok) {
            const data = await response.json()
            updateChoreInState(data.res, 'completed')
          }
        } catch (error) {
          if (error?.queued) {
            showError({
              title: 'Update Failed',
              message: 'Request will be reattempt when you are online',
            })
          } else {
            showError({
              title: 'Failed to update',
              message: error,
            })
          }
        }
        break

      case 'start':
        startChore.mutate(chore.id, {
          onSuccess: async res => {
            const data = await res.json()
            const newChore = { ...chore, status: data.res.status }
            updateChoreInState(newChore, 'started')
          },
          onError: error => {
            showError({
              title: 'Failed to start',
              message: error.message || 'Unable to start chore',
            })
          },
        })
        break

      case 'pause':
        pauseChore.mutate(chore.id, {
          onSuccess: async res => {
            const data = await res.json()
            const newChore = { ...chore, status: data.res.status }
            updateChoreInState(newChore, 'paused')
          },
          onError: error => {
            showError({
              title: 'Failed to pause',
              message: error.message || 'Unable to pause chore',
            })
          },
        })
        break

      case 'approve':
        try {
          const response = await ApproveChore(chore.id)
          if (response.ok) {
            const data = await response.json()
            updateChoreInState(data.res, 'approved')
          }
        } catch (error) {
          showError({
            title: 'Failed to approve',
            message: error.message || 'Unable to approve chore',
          })
        }
        break

      case 'reject':
        try {
          const response = await RejectChore(chore.id)
          if (response.ok) {
            const data = await response.json()
            updateChoreInState(data.res, 'rejected')
          }
        } catch (error) {
          showError({
            title: 'Failed to reject',
            message: error.message || 'Unable to reject chore',
          })
        }
        break

      case 'delete':
        setConfirmModelConfig({
          isOpen: true,
          title: 'Delete Chore',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          message: 'Are you sure you want to delete this chore?',
          onClose: async isConfirmed => {
            if (isConfirmed === true) {
              try {
                const response = await DeleteChore(chore.id)
                if (response.ok) {
                  // Remove from state and show notification
                  const newChores = chores.filter(c => c.id !== chore.id)
                  const newFilteredChores = filteredChores.filter(
                    c => c.id !== chore.id,
                  )
                  setChores(newChores)
                  setFilteredChores(newFilteredChores)
                  setChoreSections(
                    ChoresGrouper(
                      selectedChoreSection,
                      newChores,
                      ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
                        selectedChoreFilter
                      ],
                    ),
                  )
                  showSuccess({
                    title: 'Task Deleted',
                    message: 'The task has been deleted successfully.',
                  })
                }
              } catch (error) {
                showError({
                  title: 'Failed to delete',
                  message: error,
                })
              }
            }
            setConfirmModelConfig({})
          },
        })
        break

      case 'archive':
        try {
          await new Promise((resolve, reject) => {
            archiveChore.mutate(chore.id, {
              onSuccess: data => {
                updateChoreInState(data, 'archive')
                resolve(data)
              },
              onError: error => {
                showError({
                  title: 'Failed to archive',
                  message: error.message || 'Unable to archive chore',
                })
                reject(error)
              },
            })
          })
        } catch (error) {
          // Error already handled in onError callback
        }
        break

      case 'skip':
        try {
          const response = await SkipChore(chore.id)
          if (response.ok) {
            const data = await response.json()
            updateChoreInState(data.res, 'skipped')
          }
        } catch (error) {
          showError({
            title: 'Failed to skip',
            message: error,
          })
        }
        break

      // Quick reschedule actions (with date provided)
      case 'changeDueDate':
        console.log('Reschedule response data111:', chore, extraData)

        if (extraData && 'date' in extraData) {
          // Quick reschedule with specific date (including null for remove)
          try {
            const response = await UpdateDueDate(chore.id, extraData.date)
            if (response.ok) {
              const data = await response.json()
              console.log('Reschedule response data:', data, chore, extraData)

              chore.nextDueDate = extraData.date
              const eventType =
                extraData.date === null ? 'due-date-removed' : 'rescheduled'
              updateChoreInState(chore, eventType)
            }
          } catch (error) {
            showError({
              title:
                extraData.date === null
                  ? 'Failed to remove due date'
                  : 'Failed to reschedule',
              message: error.message || 'Unable to update due date',
            })
          }
        } else {
          // Open modal for custom date selection
          setModalChore(chore)
          setModalData(extraData)
          setActiveModal(action)
        }
        break

      // Modal-based actions
      case 'completeWithNote':
      case 'completeWithPastDate':
      case 'changeAssignee':
      case 'writeNFC':
      case 'nudge':
        setModalChore(chore)
        setModalData(extraData)
        setActiveModal(action)
        break

      default:
        console.warn('Unknown action:', action)
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setModalChore(null)
    setModalData({})
  }

  const handleChangeDueDate = newDate => {
    if (!modalChore) return
    UpdateDueDate(modalChore.id, newDate).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = modalChore
          newChore.nextDueDate = newDate
          updateChoreInState(newChore, 'rescheduled')
        })
      }
    })
    closeModal()
  }

  const handleCompleteWithPastDate = newDate => {
    if (!modalChore) return
    MarkChoreComplete(
      modalChore.id,
      impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
      new Date(newDate).toISOString(),
      null,
    ).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          updateChoreInState(newChore, 'completed')
        })
      }
    })
    closeModal()
  }

  const handleAssigneeChange = assigneeId => {
    if (!modalChore) return
    UpdateChoreAssignee(modalChore.id, assigneeId).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          updateChoreInState(newChore, 'assigned')
        })
      }
    })
    closeModal()
  }

  const handleCompleteWithNote = note => {
    if (!modalChore) return
    MarkChoreComplete(
      modalChore.id,
      impersonatedUser
        ? { note, completedBy: impersonatedUser.userId }
        : { note },
      null,
      null,
    ).then(response => {
      if (response.ok) {
        response.json().then(data => {
          const newChore = data.res
          updateChoreInState(newChore, 'completed')
        })
      }
    })
    closeModal()
  }

  const handleNudge = async ({ choreId, message, notifyAllAssignees }) => {
    try {
      const response = await NudgeChore(choreId, {
        message,
        notifyAllAssignees,
      })
      if (response.ok) {
        const data = await response.json()
        showSuccess({
          title: 'Nudge Sent!',
          message: data.message || 'Nudge sent successfully',
        })
      } else {
        throw new Error('Failed to send nudge')
      }
    } catch (error) {
      showError({
        title: 'Failed to Send Nudge',
        message: error.message || 'Unable to send nudge at this time',
      })
    } finally {
      closeModal()
    }
  }

  // Auto-update selected calendar date when day changes (large screen only)
  useEffect(() => {
    if (!isLargeScreen || viewMode !== 'calendar' || !selectedCalendarDate) {
      return
    }

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Set to start of tomorrow

    const msUntilTomorrow = tomorrow.getTime() - now.getTime()

    const timeout = setTimeout(() => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Check if selected date is now yesterday and update to today
      if (selectedCalendarDate.toDateString() === yesterday.toDateString()) {
        setSelectedCalendarDate(today)
      }
    }, msUntilTomorrow)

    return () => clearTimeout(timeout)
  }, [isLargeScreen, viewMode, selectedCalendarDate])

  // Handle URL parameters for navigation from calendar
  useEffect(() => {
    const filter = searchParams.get('filter')
    const view = searchParams.get('view')
    const projectId = searchParams.get('project')

    if (view === 'calendar') {
      setViewMode('calendar')
      setSearchFilter('All')
      setSelectedCalendarDate(null)
      return
    }

    if (projectId && chores.length > 0 && projectsWithDefault.length > 0) {
      const decodedProjectId = decodeURIComponent(projectId)
      let project = null

      // Try to find project by ID first, then by name for backward compatibility
      if (decodedProjectId === 'default') {
        project = { id: 'default', name: 'Default Project' }
      } else {
        project = projectsWithDefault.find(
          p => p.id === decodedProjectId || p.id === Number(decodedProjectId),
        )
      }

      if (project) {
        setSelectedProjectWithCache(project)
      }
      return
    }

    if (filter && chores.length > 0) {
      let filterKey = ''
      let filteredChores = []

      switch (filter) {
        case 'overdue':
          filterKey = 'Overdue'
          filteredChores = FILTERS['Overdue'](chores)
          break
        case 'unplanned':
          filterKey = 'No Due Date'
          filteredChores = FILTERS['No Due Date'](chores)
          break
        case 'pending-approval':
          filterKey = 'Pending Approval'
          filteredChores = FILTERS['Pending Approval'](chores)
          break
        default:
          return
      }

      setFilteredChores(filteredChores)
      setSearchFilter(filterKey)
      setViewMode('default')
    }
  }, [searchParams, chores, projectsWithDefault])
  const setSelectedChoreSectionWithCache = value => {
    setSelectedChoreSection(value)
    localStorage.setItem('selectedChoreSection', value)
  }
  const setOpenChoreSectionsWithCache = value => {
    setOpenChoreSections(value)
    localStorage.setItem('openChoreSections', JSON.stringify(value))
  }
  const setSelectedChoreFilterWithCache = value => {
    setSelectedChoreFilter(value)
    localStorage.setItem('selectedChoreFilter', value)
    // Clear selected calendar date when filters change
    setSelectedCalendarDate(null)
  }

  const setSelectedProjectWithCache = project => {
    // Handle the case where project might be null (clearing selection)
    const finalProject = project?.id === 'default' || !project ? null : project

    setSelectedProject(finalProject)
    console.log('final project', finalProject)

    localStorage.setItem('selectedProject', JSON.stringify(finalProject))
    setViewMode('default')
    setSelectedCalendarDate(null)
    // Clear other filters when project changes
    setSearchFilter('All')

    // Don't manually set filteredChores - let the memo handle it
    // This ensures consistency between filteredChores and choreSections

    // Update URL to reflect project selection
    const newUrl = new URL(window.location)
    if (finalProject && finalProject.id !== 'default') {
      newUrl.searchParams.set('project', encodeURIComponent(finalProject.id))
    } else {
      newUrl.searchParams.delete('project')
    }
    window.history.replaceState({}, '', newUrl)
  }

  const toggleViewMode = () => {
    const modes = ['default', 'compact', 'calendar']
    const currentIndex = modes.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const newMode = modes[nextIndex]
    setViewMode(newMode)
    localStorage.setItem('choreCardViewMode', newMode)

    // Clear selected calendar date when switching away from calendar view
    if (newMode !== 'calendar') {
      setSelectedCalendarDate(null)
    }
  }

  // Helper function to render the appropriate card component
  const renderChoreCard = (chore, key) => {
    performance.mark(`chore-render-start-${chore.id}`)
    const CardComponent = viewMode === 'compact' ? CompactChoreCard : ChoreCard
    const result = (
      <CardComponent
        key={key || chore.id}
        chore={chore}
        performers={membersData?.res}
        userLabels={userLabels}
        onChipClick={handleLabelFiltering}
        onAction={handleChoreAction}
        // Multi-select props
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedChores.has(chore.id)}
        onSelectionToggle={() => toggleChoreSelection(chore.id)}
      />
    )
    performance.mark(`chore-render-end-${chore.id}`)
    performance.measure(
      `chore-render-${chore.id}`,
      `chore-render-start-${chore.id}`,
      `chore-render-end-${chore.id}`,
    )
    return result
  }

  // First layer: Apply project filter to get base chores
  // IMPORTANT: Use local 'chores' state instead of 'processedChores' to ensure
  // updates via updateChoreInState are reflected in filtered results
  const projectFilteredChores = useMemo(() => {
    if (!selectedProject) {
      return chores
    }
    return filterByProject(chores, selectedProject.id)
  }, [chores, selectedProject])

  // Second layer: Apply additional filters on top of project-filtered chores
  const getFilteredChores = useMemo(() => {
    let result = []
    let baseChores = projectFilteredChores // Start with project-filtered chores

    if (searchTerm?.length > 0 || searchFilter !== 'All') {
      // Apply search/label/priority filters to project-filtered chores
      if (searchTerm?.length > 0) {
        // For search, use fuse search on project-filtered chores
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
        result = fuse
          .search(searchTerm.toLowerCase())
          .map(result => result.item)
      } else {
        result = filteredChores.filter(
          chore =>
            !selectedProject ||
            filterByProject([chore], selectedProject).length > 0,
        )
      }
    } else {
      let choresToFilter = baseChores

      if (impersonatedUser) {
        choresToFilter = choresToFilter.filter(
          chore => chore.assignedTo === impersonatedUser.userId,
        )
      }

      result = choresToFilter.filter(
        ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
          selectedChoreFilter
        ],
      )
    }

    return result
  }, [
    searchTerm,
    searchFilter,
    filteredChores,
    projectFilteredChores,
    selectedProject,
    impersonatedUser,
    userProfile?.id,
    selectedChoreFilter,
  ])

  const getChoresForDate = useCallback(
    date => {
      const filteredChoresData = getFilteredChores
      const result = filteredChoresData.filter(chore => {
        if (!chore.nextDueDate) return false
        const choreDate = new Date(chore.nextDueDate).toLocaleDateString()
        const selectedDate = date.toLocaleDateString()
        return choreDate === selectedDate
      })

      return result
    },
    [getFilteredChores],
  )

  const updateChores = newChore => {
    let newChores = [...chores, newChore]

    // Filter chores based on impersonated user
    if (impersonatedUser) {
      newChores = newChores.filter(
        chore => chore.assignedTo === impersonatedUser.userId,
      )
    }

    setChores(newChores)
    setFilteredChores(newChores)
    setChoreSections(
      ChoresGrouper(
        selectedChoreSection,
        newChores,
        ChoreFilters(impersonatedUser?.userId || userProfile?.id)[
          selectedChoreFilter
        ],
      ),
    )
    setSearchFilter('All')
  }
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
    // Start with project-filtered chores as base
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
    // Clear selected calendar date when filters change
    setSelectedCalendarDate(null)
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
    if (searchFilter !== 'All') {
      setSearchFilter('All')
    }
    const search = e.target.value
    if (search === '') {
      setFilteredChores(selectedProject ? projectFilteredChores : chores)
      setSearchTerm('')
      // Clear selected calendar date when search changes
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
    // remove the focus from the search input:
    setSearchInputFocus(0)
    // Clear selected calendar date when search closes
    setSelectedCalendarDate(null)
  }

  // Multi-select helper functions
  const toggleMultiSelectMode = () => {
    const newMode = !isMultiSelectMode
    setIsMultiSelectMode(newMode)

    if (newMode) {
      setSelectedChores(new Set()) // Clear selection when exiting multi-select
    }
  }

  const toggleChoreSelection = choreId => {
    const newSelection = new Set(selectedChores)
    if (newSelection.has(choreId)) {
      newSelection.delete(choreId)
    } else {
      newSelection.add(choreId)
    }
    setSelectedChores(newSelection)
  }

  const selectAllVisibleChores = () => {
    let visibleChores = []

    if (searchTerm?.length > 0 || searchFilter !== 'All') {
      // If there's a search term or filter, all filtered chores are visible
      visibleChores = filteredChores
    } else {
      // First, get chores from expanded sections only
      const expandedChores = choreSections
        .filter((_section, index) => openChoreSections[index]) // Only expanded sections
        .flatMap(section => section.content || []) // Get all chores from expanded sections

      // Check if all expanded chores are already selected
      const allExpandedSelected =
        expandedChores.length > 0 &&
        expandedChores.every(chore => selectedChores.has(chore.id))

      if (allExpandedSelected) {
        // If all expanded chores are already selected, select ALL chores (including collapsed sections)
        visibleChores = choreSections.flatMap(section => section.content || [])
      } else {
        // Otherwise, just select expanded chores
        visibleChores = expandedChores
      }
    }

    if (visibleChores.length > 0) {
      const allIds = new Set(visibleChores.map(chore => chore.id))
      setSelectedChores(allIds)
    }
  }

  const clearSelection = () => {
    // if already empty, just exit multi-select mode:
    if (selectedChores.size === 0) {
      setIsMultiSelectMode(false)
      return
    }
    setSelectedChores(new Set())
  }

  const getSelectedChoresData = () => {
    return Array.from(selectedChores)
      .map(id => chores.find(chore => chore.id === id))
      .filter(Boolean)
  }

  // Bulk operations with improved UX and confirmation modal
  const handleBulkComplete = async () => {
    const selectedData = getSelectedChoresData()
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Complete Tasks',
      confirmText: 'Complete',
      cancelText: 'Cancel',
      message: `Mark ${selectedData.length} task${selectedData.length > 1 ? 's' : ''} as completed?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const completedTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await MarkChoreComplete(
                  chore.id,
                  impersonatedUser
                    ? { completedBy: impersonatedUser.userId }
                    : null,
                  null,
                  null,
                )
                completedTasks.push(chore)
              } catch (error) {
                failedTasks.push(chore)
              }
            }

            if (completedTasks.length > 0) {
              showSuccess({
                title: '✅ Tasks Completed',
                message: `Successfully completed ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''}.`,
              })
            }

            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be completed.`,
              })
            }

            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Complete Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }
  const handleBulkArchive = async () => {
    const selectedData = getSelectedChoresData()
    if (selectedData.length === 0) return
    setConfirmModelConfig({
      isOpen: true,
      title: 'Archive Tasks',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      message: `Archive ${selectedData.length} task${selectedData.length > 1 ? 's' : ''}?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const archivedTasks = []
            const failedTasks = []
            for (const chore of selectedData) {
              try {
                await new Promise((resolve, reject) => {
                  archiveChore.mutate(chore.id, {
                    onSuccess: data => {
                      archivedTasks.push(data)
                      // Remove from chores and filteredChores
                      setChores(prev => prev.filter(c => c.id !== chore.id))
                      setFilteredChores(prev =>
                        prev.filter(c => c.id !== chore.id),
                      )
                      resolve(data)
                    },
                    onError: error => {
                      failedTasks.push(chore)
                      reject(error)
                    },
                  })
                })
              } catch (error) {
                // Error already handled in onError callback
              }
            }
            if (archivedTasks.length > 0) {
              showSuccess({
                title: '📦 Tasks Archived',
                message: `Successfully archived ${archivedTasks.length} task${archivedTasks.length > 1 ? 's' : ''}.`,
              })
            }
            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be archived.`,
              })
            }
            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Archive Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }
  const handleBulkDelete = async () => {
    const selectedData = getSelectedChoresData()
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Delete Tasks',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: `Delete ${selectedData.length} task${selectedData.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const deletedTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await DeleteChore(chore.id)
                deletedTasks.push(chore)
              } catch (error) {
                failedTasks.push(chore)
              }
            }

            if (deletedTasks.length > 0) {
              showSuccess({
                title: '🗑️ Tasks Deleted',
                message: `Successfully deleted ${deletedTasks.length} task${deletedTasks.length > 1 ? 's' : ''}.`,
              })

              const deletedIds = new Set(deletedTasks.map(c => c.id))
              const newChores = chores.filter(c => !deletedIds.has(c.id))
              const newFilteredChores = filteredChores.filter(
                c => !deletedIds.has(c.id),
              )
              setChores(newChores)
              setFilteredChores(newFilteredChores)
            }

            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be deleted.`,
              })
            }
            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Delete Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }

  const handleBulkSkip = async () => {
    const selectedData = getSelectedChoresData()
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Skip Tasks',
      confirmText: 'Skip',
      cancelText: 'Cancel',
      message: `Skip ${selectedData.length} task${selectedData.length > 1 ? 's' : ''} to next due date?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const skippedTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await SkipChore(chore.id)
                skippedTasks.push(chore)
              } catch (error) {
                failedTasks.push(chore)
              }
            }

            if (skippedTasks.length > 0) {
              showSuccess({
                title: '⏭️ Tasks Skipped',
                message: `Successfully skipped ${skippedTasks.length} task${skippedTasks.length > 1 ? 's' : ''}.`,
              })
            }

            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be skipped.`,
              })
            }

            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Skip Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
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
          <Input
            slotProps={{ input: { ref: searchInputRef } }}
            placeholder='Search'
            value={searchTerm}
            onFocus={() => {
              setShowSearchFilter(true)
            }}
            fullWidth
            sx={{
              mt: 1,
              mb: 1,
              borderRadius: 24,
              height: 24,
              borderColor: 'text.disabled',
              padding: 1,
            }}
            onChange={handleSearchChange}
            startDecorator={
              <KeyboardShortcutHint shortcut='F' show={showKeyboardShortcuts} />
            }
            endDecorator={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {searchTerm && (
                  <>
                    <KeyboardShortcutHint
                      shortcut='X'
                      show={showKeyboardShortcuts}
                    />
                    <CancelRounded onClick={handleSearchClose} />
                  </>
                )}
              </Box>
            }
          />

          <SortAndGrouping
            title='Group by'
            k={'icon-menu-group-by'}
            icon={<Sort />}
            selectedItem={selectedChoreSection}
            selectedFilter={selectedChoreFilter}
            setFilter={filter => {
              setSelectedChoreFilterWithCache(filter)
            }}
            onItemSelect={selected => {
              setSelectedChoreSectionWithCache(selected.value)
              setFilteredChores(chores)
              setSearchFilter('All')
            }}
            mouseClickHandler={handleMenuOutsideClick}
          />

          {/* Project Selector - Show only if there are multiple projects */}
          {projectsWithDefault.length > 1 && (
            <ProjectSelector
              selectedProject={selectedProject?.name || 'Default Project'}
              onProjectSelect={project => {
                setSelectedProjectWithCache(project)
                // setFilteredChores(chores)
                // setSearchFilter('All')
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
              }}
            >
              <CancelRounded />
            </IconButton>
          </div>
        </Box>

        {/* Multi-select Toolbar with animation */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            maxHeight: isMultiSelectMode ? '200px' : '0',
            opacity: isMultiSelectMode ? 1 : 0,
            transform: isMultiSelectMode
              ? 'translateY(0)'
              : 'translateY(-20px)',
            marginBottom: isMultiSelectMode ? 2 : 0,
          }}
        >
          <Box
            sx={{
              backgroundColor: 'background.surface',
              backdropFilter: 'blur(8px)',
              borderRadius: 'lg',
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'm',
              gap: 2,
              display: 'flex',
              flexDirection: {
                sm: 'column', // Stack vertically on mobile
                md: 'row', // Horizontal on tablet and larger
              },
              alignItems: {
                xs: 'stretch', // Full width on mobile
                sm: 'center', // Center aligned on larger screens
              },
              justifyContent: {
                xs: 'center',
                sm: 'space-between',
              },
            }}
          >
            {/* Selection Info and Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: {
                  xs: 'wrap', // Allow wrapping on mobile if needed
                  sm: 'nowrap',
                },
                justifyContent: {
                  xs: 'center', // Center on mobile
                  sm: 'flex-start',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckBox sx={{ color: 'primary.500' }} />
                <Typography level='body-sm' fontWeight='md'>
                  {selectedChores.size} task
                  {selectedChores.size !== 1 ? 's' : ''} selected
                </Typography>
              </Box>

              <Divider
                orientation='vertical'
                sx={{
                  display: { xs: 'none', sm: 'block' }, // Hide vertical divider on mobile
                }}
              />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size='sm'
                  variant='outlined'
                  onClick={selectAllVisibleChores}
                  startDecorator={<SelectAll />}
                  disabled={
                    searchTerm?.length > 0 || searchFilter !== 'All'
                      ? selectedChores.size === filteredChores.length
                      : selectedChores.size ===
                        choreSections.flatMap(s => s.content || []).length
                  }
                  sx={{
                    minWidth: 'auto',
                    '--Button-paddingInline': '0.75rem',
                    position: 'relative',
                  }}
                  title='Select all visible tasks (Ctrl+A)'
                >
                  All
                  {showKeyboardShortcuts && (
                    <KeyboardShortcutHint
                      shortcut='A'
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        zIndex: 1000,
                      }}
                    />
                  )}
                </Button>
                <Button
                  size='sm'
                  variant='outlined'
                  onClick={clearSelection}
                  startDecorator={
                    selectedChores.size === 0 ? (
                      <Close />
                    ) : (
                      <CheckBoxOutlineBlank />
                    )
                  }
                  sx={{
                    minWidth: 'auto',
                    '--Button-paddingInline': '0.75rem',
                    position: 'relative',
                  }}
                  title={`${selectedChores.size === 0 ? 'Close' : 'Clear'} multi-select (Esc)`}
                >
                  {selectedChores.size === 0 ? 'Close' : 'Clear'}
                  {showKeyboardShortcuts && (
                    <KeyboardShortcutHint
                      withCtrl={false}
                      shortcut='Esc'
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        zIndex: 1000,
                      }}
                    />
                  )}
                </Button>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: {
                  xs: 'wrap', // Allow wrapping on mobile
                  sm: 'nowrap',
                },
                justifyContent: {
                  xs: 'center', // Center on mobile
                  sm: 'flex-end',
                },
              }}
            >
              <Button
                size='sm'
                variant='solid'
                color='success'
                onClick={handleBulkComplete}
                startDecorator={<Done />}
                disabled={selectedChores.size === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                  position: 'relative',
                }}
                title='Complete selected tasks (Enter)'
              >
                Complete
                {showKeyboardShortcuts && selectedChores.size > 0 && (
                  <KeyboardShortcutHint
                    shortcut='Enter'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      zIndex: 1000,
                    }}
                  />
                )}
              </Button>
              <Button
                size='sm'
                variant='soft'
                color='warning'
                onClick={handleBulkSkip}
                startDecorator={<SkipNext />}
                disabled={selectedChores.size === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                  position: 'relative',
                }}
                title='Skip selected tasks (/)'
              >
                Skip
                {showKeyboardShortcuts && selectedChores.size > 0 && (
                  <KeyboardShortcutHint
                    shortcut='/'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      zIndex: 1000,
                    }}
                  />
                )}
              </Button>
              <Button
                size='sm'
                variant='soft'
                color='danger'
                onClick={handleBulkArchive}
                startDecorator={<Archive />}
                disabled={selectedChores.size === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                  position: 'relative',
                }}
                title='Archive selected tasks (X)'
              >
                Archive
                {showKeyboardShortcuts && selectedChores.size > 0 && (
                  <KeyboardShortcutHint
                    shortcut='X'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      zIndex: 1000,
                    }}
                  />
                )}
              </Button>

              <Button
                size='sm'
                variant='soft'
                color='danger'
                onClick={handleBulkDelete}
                startDecorator={<Delete />}
                disabled={selectedChores.size === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                  position: 'relative',
                }}
                title='Delete selected tasks (Shift+X)'
              >
                Delete
                {showKeyboardShortcuts && selectedChores.size > 0 && (
                  <KeyboardShortcutHint
                    shortcut='E'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      zIndex: 1000,
                    }}
                  />
                )}
              </Button>

              {/* 
              <Divider
                orientation='vertical'
                sx={{
                  display: { xs: 'none', sm: 'block' }, // Hide vertical divider on mobile
                }}
              />

              <IconButton
                size='sm'
                variant='plain'
                onClick={toggleMultiSelectMode}
                color='neutral'
                title='Exit multi-select mode (Esc)'
                sx={{
                  '&:hover': {
                    bgcolor: 'danger.softBg',
                    color: 'danger.softColor',
                  },
                }}
              >
                <CancelRounded />
              </IconButton> */}
            </Box>
          </Box>
        </Box>

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
            }}
            endDecorator={<CancelRounded />}
            onClick={() => {
              setFilteredChores(
                selectedProject ? projectFilteredChores : chores,
              )
              setSearchFilter('All')
            }}
          >
            Additional Filter: {searchFilter}
          </Chip>
        )}
        {/* Show "Nothing scheduled" when appropriate based on current view mode */}
        {(searchTerm?.length > 0 || searchFilter !== 'All'
          ? filteredChores.length === 0
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
                      // Reset search and filters to show all chores in current project
                      setSearchFilter('All')
                      setSearchTerm('')
                      // Clear any manual filteredChores and let the memo handle it
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
        {(searchTerm?.length > 0 || searchFilter !== 'All') &&
          viewMode !== 'calendar' &&
          getFilteredChores.map(chore =>
            renderChoreCard(chore, `filtered-${chore.id}`),
          )}
        {viewMode === 'calendar' && (
          <>
            {/* Summary Chips when no date selected */}
            <Box
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
                    // Update URL for navigation context
                    Navigate('/chores?filter=overdue', {
                      replace: false,
                    })

                    // Also update state directly for immediate smooth transition
                    const overdueChores = FILTERS['Overdue'](getFilteredChores)
                    setFilteredChores(overdueChores)
                    setSearchFilter('Overdue')
                    setViewMode('default')
                    setSelectedCalendarDate(null)
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
                    // Update URL for navigation context
                    Navigate('/chores?filter=unplanned', {
                      replace: false,
                    })

                    // Also update state directly for immediate smooth transition
                    const unplannedChores =
                      FILTERS['No Due Date'](getFilteredChores)
                    setFilteredChores(unplannedChores)
                    setSearchFilter('No Due Date')
                    setViewMode('default')
                    setSelectedCalendarDate(null)
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
                    // Update URL for navigation context
                    Navigate('/chores?filter=pending-approval', {
                      replace: true,
                    })

                    // Also update state directly for immediate smooth transition
                    const pendingApprovalChores =
                      FILTERS['Pending Approval'](getFilteredChores)
                    setFilteredChores(pendingApprovalChores)
                    setSearchFilter('Pending Approval')
                    setViewMode('default')
                    setSelectedCalendarDate(null)
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
            </Box>
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

      <Sidepanel chores={chores} performers={membersData?.res || []} />

      {/* Multi-select Help - only show when in multi-select mode */}
      {/* <MultiSelectHelp isVisible={isMultiSelectMode} /> */}

      {/* Confirmation Modal for bulk operations */}
      {confirmModelConfig?.isOpen && (
        <ConfirmationModal config={confirmModelConfig} />
      )}

      {/* Centralized Modals */}
      {activeModal === 'changeDueDate' && modalChore && (
        <DateModal
          isOpen={true}
          key={'changeDueDate' + modalChore.id}
          current={modalChore.nextDueDate}
          title={`Change due date`}
          onClose={closeModal}
          onSave={handleChangeDueDate}
        />
      )}

      {activeModal === 'completeWithPastDate' && modalChore && (
        <DateModal
          isOpen={true}
          key={'completedInPast' + modalChore.id}
          current={modalChore.nextDueDate}
          title={`Save Chore that you completed in the past`}
          onClose={closeModal}
          onSave={handleCompleteWithPastDate}
        />
      )}

      {activeModal === 'changeAssignee' && modalChore && (
        <SelectModal
          isOpen={true}
          options={membersData?.res || []}
          displayKey='displayName'
          title={`Delegate to someone else`}
          placeholder={'Select a performer'}
          onClose={closeModal}
          onSave={selected => handleAssigneeChange(selected.id)}
        />
      )}

      {activeModal === 'completeWithNote' && modalChore && (
        <TextModal
          isOpen={true}
          title='Add note to attach to this completion:'
          onClose={closeModal}
          okText={'Complete'}
          onSave={handleCompleteWithNote}
        />
      )}

      {activeModal === 'writeNFC' && modalChore && (
        <WriteNFCModal
          config={{
            isOpen: true,
            url: `${window.location.origin}/chores/${modalChore.id}`,
            onClose: closeModal,
          }}
        />
      )}

      {activeModal === 'nudge' && modalChore && (
        <NudgeModal
          config={{
            isOpen: true,
            choreId: modalChore.id,
            onClose: closeModal,
            onConfirm: handleNudge,
          }}
        />
      )}
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
