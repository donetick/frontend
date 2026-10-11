import {
  Add,
  ArrowBack,
  ArrowDropDown,
  ArrowForward,
  AttachFile,
  BoltOutlined,
  CalendarMonthOutlined,
  Check,
  Checklist,
  Close,
  Delete,
  DescriptionOutlined,
  DocumentScanner,
  EditOutlined,
  GroupOutlined,
  HorizontalRule,
  InfoOutlined,
  LabelOutlined,
  LockOutlined,
  NotificationsOutlined,
  Save,
  TimerOutlined,
  TitleOutlined,
  UploadFile,
} from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Chip,
  Container,
  Divider,
  Dropdown,
  FormControl,
  FormHelperText,
  IconButton,
  Input,
  List,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import DurationInput from '../../components/common/DurationInput'
import EmptyState from '../../components/common/EmptyState'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import NotificationTemplate from '../../components/NotificationTemplate.jsx'
import { usePageShortcutScope } from '../../contexts/KeyboardShortcutScopeContext'
import { usePaywall } from '../../contexts/PaywallContext'
import { useDocumentScanner } from '../../hooks/useDocumentScanner'
import {
  useArchiveChore,
  useChore,
  useCreateChore,
  useDeleteChores,
  useUnArchiveChore,
  useUpdateChore,
} from '../../queries/ChoreQueries.jsx'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import { useNotification } from '../../service/NotificationProvider'
import { getTextColorFromBackgroundColor } from '../../utils/Colors.jsx'
import { sanitizeRemindersForPlan } from '../../utils/entitlements'
import {
  DeleteChoreAttachment,
  DeleteDraftAttachment,
  GetAllCircleMembers,
  GetThings,
  UploadChoreAttachment,
} from '../../utils/Fetcher'
import { imageSourceToFile } from '../../utils/FileConvert'
import { isPlusAccount, resolvePhotoURL } from '../../utils/Helpers'
import { getImageSrc, removeCachedImage } from '../../utils/ImageCache'
import Priorities from '../../utils/Priorities.jsx'
import { getIconComponent } from '../../utils/ProjectIcons'
import { getSafeBottomPadding } from '../../utils/SafeAreaUtils.js'
import { useSinglePageTaskEditor } from '../../utils/TaskEditorPreferences'
import { generateUUID } from '../../utils/UUID'
import { useProjectFilter } from '../Chores/hooks/useProjectFilter.js'
import LoadingComponent from '../components/Loading.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import SubTasks from '../components/SubTask.jsx'
import { useLabels } from '../Labels/LabelQueries'
import AttachmentViewerModal from '../Modals/Inputs/AttachmentViewerModal'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import LabelModal from '../Modals/Inputs/LabelModal'
import { useProjects } from '../Projects/ProjectQueries'
import CompletionActionsSection from './CompletionActionsSection'
import EditorSection from './EditorSection'
import RepeatSection from './RepeatSection'
import WizardContainer from './WizardContainer'
import WizardStepper from './WizardStepper'

const STRATEGY_LABELS = {
  random: 'Random user',
  least_assigned: 'Least often assigned',
  least_completed: 'Fewest completions',
  keep_last_assigned: 'Keep the same user',
  random_except_last_assigned: 'Random, excluding the last user',
  round_robin: 'Rotate in order',
  no_assignee: 'Leave unassigned',
}

const ASSIGN_STRATEGIES = [
  'random',
  'least_assigned',
  'least_completed',
  'keep_last_assigned',
  'random_except_last_assigned',
  'round_robin',
  'no_assignee',
]
const DEFAULT_ASSIGN_STRATEGY = ASSIGN_STRATEGIES[3] // keep_last_assigned
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']

const NO_DUE_DATE_REQUIRED_TYPE = ['no_repeat', 'once']
const NO_DUE_DATE_ALLOWED_TYPE = ['trigger', 'always']
const NOTIFICATION_FORBIDDEN_TYPE = ['trigger', 'always']
const ChoreEdit = () => {
  const { t } = useTranslation('chores')
  // Page-level shortcuts (save/cancel) must defer to whatever modal
  // currently owns the keyboard — see KeyboardShortcutScopeContext.
  const isPageShortcutActive = usePageShortcutScope()
  const singlePageEditor = useSinglePageTaskEditor()
  const location = useLocation()
  const [createAnother, setCreateAnother] = useState(
    location.state?.createAnother === true,
  )
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile()
  const { showPaywall } = usePaywall()

  const [chore, setChore] = useState([])
  const [choresHistory, setChoresHistory] = useState([])
  const [userHistory, setUserHistory] = useState({})
  const { choreId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [wizardStep, setWizardStep] = useState(0)
  const wizardSteps = ['Task', 'Schedule', 'Assignment', 'Review']
  const wizardBodyRef = useRef(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const [anyone, setAnyone] = useState(false)
  const [assignableTo, setAssignableTo] = useState([])
  const [performers, setPerformers] = useState([])
  const [assignStrategy, setAssignStrategy] = useState(DEFAULT_ASSIGN_STRATEGY)
  const [dueDate, setDueDate] = useState(null)
  const [dueDateOnly, setDueDateOnly] = useState(null)
  const [dueTime, setDueTime] = useState(null)
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [assignedTo, setAssignedTo] = useState(-1)
  const [frequencyType, setFrequencyType] = useState('once')
  const [frequency, setFrequency] = useState(1)
  const [frequencyMetadata, setFrequencyMetadata] = useState({})
  const [labels, setLabels] = useState([])
  const [labelsV2, setLabelsV2] = useState([])
  const [priority, setPriority] = useState(0)
  const [completionActions, setCompletionActions] = useState([])
  const [completionActionsValid, setCompletionActionsValid] = useState(true)
  const [points, setPoints] = useState(-1)
  const [requireApproval, setRequireApproval] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [subTasks, setSubTasks] = useState(null)
  const [completionWindow, setCompletionWindow] = useState(-1)
  const [deadlineOffset, setDeadlineOffset] = useState(-1)
  const [allUserThings, setAllUserThings] = useState([])
  const [thingTrigger, setThingTrigger] = useState(null)
  const [isThingValid, setIsThingValid] = useState(false)

  const [notificationMetadata, setNotificationMetadata] = useState({})

  const [isRolling, setIsRolling] = useState(false)
  const [isNotificable, setIsNotificable] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [updatedBy, setUpdatedBy] = useState(0)
  const [createdBy, setCreatedBy] = useState(0)
  const [errors, setErrors] = useState({})
  const [attemptToSave, setAttemptToSave] = useState(false)
  const [draftId] = useState(() => generateUUID())
  const [attachments, setAttachments] = useState([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false)
  const [attachmentViewerConfig, setAttachmentViewerConfig] = useState({
    isOpen: false,
  })
  const [showSavePrivacyDefault, setShowSavePrivacyDefault] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [showSaveNotificationDefault, setShowSaveNotificationDefault] =
    useState(false)
  const [showSaveAssigneeDefault, setShowSaveAssigneeDefault] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const { data: userLabelsRaw, isLoading: isUserLabelsLoading } = useLabels()
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects()

  const { projectsWithDefault, selectedProject, setSelectedProjectWithCache } =
    useProjectFilter(projects)

  const [projectId, setProjectId] = useState(
    selectedProject ? selectedProject.id : 'default',
  )

  const updateChoreMutation = useUpdateChore()
  const createChoreMutation = useCreateChore()
  const archiveChore = useArchiveChore()
  const unarchiveChore = useUnArchiveChore()
  const deleteChores = useDeleteChores()
  const {
    data: choreData,
    isError: isChoreError,
    isLoading: isChoreLoading,
    refetch: refetchChore,
  } = useChore(choreId)
  const { data: membersData, isLoading: isMemberDataLoading } =
    useCircleMembers()
  const { showError, showSuccess } = useNotification()
  const { isNativeScanner, scanDocument } = useDocumentScanner()

  const [userLabels, setUserLabels] = useState([])

  useEffect(() => {
    if (userLabelsRaw) {
      setUserLabels(userLabelsRaw)
    }
  }, [userLabelsRaw])

  const Navigate = useNavigate()

  const assignees = anyone ? performers : assignableTo
  const hasSpecificAssignees = !anyone && assignableTo.length > 0
  const canPickStrategy = hasSpecificAssignees && assignableTo.length > 1
  const assignStrategyValue = !hasSpecificAssignees
    ? 'no_assignee'
    : canPickStrategy
      ? assignStrategy
      : DEFAULT_ASSIGN_STRATEGY
  const assignedToValue =
    !hasSpecificAssignees || assignStrategyValue === 'no_assignee'
      ? null
      : assignableTo.some(a => a.userId === assignedTo)
        ? assignedTo
        : assignableTo[0].userId

  const snapshot = JSON.stringify({
    name,
    description,
    priority,
    projectId,
    labelsV2,
    anyone,
    assignableTo,
    assignedTo,
    assignStrategy,
    dueDate,
    dueDateOnly,
    dueTime,
    useCustomTime,
    frequencyType,
    frequency,
    frequencyMetadata,
    thingTrigger: thingTrigger
      ? {
          thingID: thingTrigger.thingID ?? thingTrigger.thingId,
          triggerState: thingTrigger.triggerState,
          condition: thingTrigger.condition || '',
        }
      : null,
    subTasks,
    attachments,
    completionActions,
    points,
    requireApproval,
    isPrivate,
    isNotificable,
    notificationMetadata,
    isRolling,
    completionWindow,
    deadlineOffset,
  })
  const latestSnapshot = useRef(snapshot)
  latestSnapshot.current = snapshot
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const dirtyGuard = useRef(false)
  const hasInteracted = useRef(false)
  const isDirty = savedSnapshot !== null && snapshot !== savedSnapshot
  dirtyGuard.current = isDirty
  const formLoading =
    (isChoreLoading && choreId) ||
    isUserLabelsLoading ||
    isUserProfileLoading ||
    isMemberDataLoading ||
    isProjectsLoading
  useEffect(() => {
    if (formLoading || hasInteracted.current) return
    // Async defaults and child controls can normalize values after the first render.
    setSavedSnapshot(snapshot)
  }, [formLoading, snapshot])
  const captureInitialValues = () => {
    if (hasInteracted.current) return
    hasInteracted.current = true
    setSavedSnapshot(latestSnapshot.current)
  }
  useEffect(() => {
    const protect = event => {
      if (dirtyGuard.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [])
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyGuard.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    setConfirmModelConfig({
      isOpen: true,
      title: 'Discard unsaved changes?',
      message: 'Your changes have not been saved.',
      confirmText: 'Discard changes',
      cancelText: 'Keep editing',
      color: 'danger',
      onClose: confirmed => {
        setConfirmModelConfig({})
        if (confirmed) {
          dirtyGuard.current = false
          blocker.proceed()
        } else blocker.reset()
      },
    })
  }, [blocker.state])
  const errorSections = {
    name: 'task',
    description: 'description',
    assignees: 'assignment',
    assignedTo: 'assignment',
    frequency: 'schedule',
    dueDate: 'schedule',
    thingTrigger: 'schedule',
    completionActions: 'actions',
  }
  const focusError = key => {
    const step =
      {
        name: 0,
        description: 0,
        assignees: 2,
        assignedTo: 2,
        frequency: 1,
        dueDate: 1,
        thingTrigger: 1,
        completionActions: 3,
      }[key] ?? 3
    if (!singlePageEditor) setWizardStep(step)
    requestAnimationFrame(() => {
      const section = document.querySelector(
        `[data-editor-section="${errorSections[key] || 'actions'}"]`,
      )
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      section
        ?.querySelector('input, select, textarea, [role="combobox"]')
        ?.focus({ preventScroll: true })
    })
  }
  const dueSummary = dueDate
    ? moment(dueDate).format(useCustomTime ? 'D MMM · HH:mm' : 'D MMM')
    : 'No due date'
  const triggerThing = allUserThings.find(
    item => item.id === (thingTrigger?.thingID ?? thingTrigger?.thingId),
  )
  const frequencySummary = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    adaptive: 'Adaptive schedule',
    interval: `Every ${frequency} ${frequencyMetadata?.unit || 'days'}`,
    days_of_the_week: frequencyMetadata?.days?.join(', ') || 'Choose weekdays',
    day_of_the_month: 'Selected days of the month',
  }[frequencyType]
  const scheduleSummary =
    frequencyType === 'trigger'
      ? triggerThing
        ? `When ${triggerThing.name} ${{ eq: 'is', neq: 'is not', gt: 'is greater than', gte: 'is at least', lt: 'is less than', lte: 'is at most' }[thingTrigger?.condition] || 'is'} ${thingTrigger?.triggerState}`
        : 'Choose a Thing condition'
      : frequencyType === 'always'
        ? 'Available without a due date'
        : frequencySummary
          ? `${frequencySummary} · ${dueSummary}`
          : dueSummary

  const HandleValidateChore = (step = null) => {
    let errors = {}

    if (name.trim() === '') {
      errors.name = 'Name is required'
    }
    if (assignStrategyValue !== 'no_assignee') {
      if (assignees.length === 0) {
        errors.assignees = 'Choose at least one eligible user'
      }
      if (assignedToValue === null || assignedToValue < 0) {
        errors.assignedTo = 'Choose who is assigned to this task'
      }
    }
    if (frequencyType === 'interval' && !frequency > 0) {
      errors.frequency = t('choreEdit.errFrequencyInvalid', {
        unit: frequencyMetadata.unit,
      })
    }
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata['days']?.length === 0
    ) {
      errors.frequency = t('choreEdit.errSelectDayOfWeek')
    }

    // Validate advanced scheduling patterns
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata?.weekPattern === 'week_of_month' &&
      (!frequencyMetadata?.occurrences ||
        frequencyMetadata.occurrences.length === 0)
    ) {
      errors.frequency = t('choreEdit.errSelectDayOccurrence')
    }
    if (
      frequencyType === 'day_of_the_month' &&
      frequencyMetadata['months']?.length === 0
    ) {
      errors.frequency = t('choreEdit.errSelectMonth')
    }
    if (
      dueDate === null &&
      !NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) &&
      !NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)
    ) {
      if (REPEAT_ON_TYPE.includes(frequencyType)) {
        console.log('VALIDATION:', dueDate, frequencyType)

        errors.dueDate = t('choreEdit.errStartDateRequired')
      } else {
        errors.dueDate = t('choreEdit.errDueDateRequired')
      }
    }
    if (frequencyType === 'trigger') {
      if (!isThingValid) {
        errors.thingTrigger = t('choreEdit.errThingTrigger')
      }
    }

    if (!completionActionsValid)
      errors.completionActions = 'Check the completion actions and their values'

    // if there is any error then return false:
    if (step !== null) {
      const fields = [
        ['name', 'description'],
        ['frequency', 'dueDate', 'thingTrigger'],
        ['assignees', 'assignedTo'],
      ][step]
      if (fields)
        errors = Object.fromEntries(
          Object.entries(errors).filter(([key]) => fields.includes(key)),
        )
    }
    setErrors(errors)
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => focusError(Object.keys(errors)[0])),
      )
      return false
    }

    return true
  }

  const handleDueDateChange = e => {
    const dateValue = e.target.value // YYYY-MM-DD format
    if (!dateValue) {
      setDueDateOnly(null)
      setDueDate(null)
      return
    }
    setDueDateOnly(dateValue)

    // Combine date with time or end of day
    if (useCustomTime && dueTime) {
      // Use the custom time
      const combinedDateTime = moment(`${dateValue}T${dueTime}`).format(
        'YYYY-MM-DDTHH:mm:00',
      )
      setDueDate(combinedDateTime)

      // Update frequencyMetadata.time for REPEAT_ON_TYPE frequencies
      if (REPEAT_ON_TYPE.includes(frequencyType)) {
        setFrequencyMetadata({
          ...frequencyMetadata,
          time: moment(`${dateValue}T${dueTime}`).format(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      }
    } else {
      // Default to end of day (23:59:59) in user's timezone
      const endOfDay = moment(dateValue)
        .endOf('day')
        .format('YYYY-MM-DDTHH:mm:59')
      setDueDate(endOfDay)
    }
  }

  const handleDueTimeChange = e => {
    const timeValue = e.target.value // HH:mm format
    setDueTime(timeValue)

    if (dueDateOnly) {
      // Combine date with the selected time
      const combinedDateTime = moment(`${dueDateOnly}T${timeValue}`).format(
        'YYYY-MM-DDTHH:mm:00',
      )
      setDueDate(combinedDateTime)

      // Update frequencyMetadata.time for REPEAT_ON_TYPE frequencies
      if (REPEAT_ON_TYPE.includes(frequencyType)) {
        setFrequencyMetadata({
          ...frequencyMetadata,
          time: moment(`${dueDateOnly}T${timeValue}`).format(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      }
    }
  }

  const handleUseCustomTimeChange = checked => {
    setUseCustomTime(checked)

    if (checked) {
      // Initialize with current time or default to 18:00
      const defaultTime = dueTime || '18:00'
      setDueTime(defaultTime)

      if (dueDateOnly) {
        const combinedDateTime = moment(`${dueDateOnly}T${defaultTime}`).format(
          'YYYY-MM-DDTHH:mm:59',
        )
        setDueDate(combinedDateTime)

        // Update frequencyMetadata.time for REPEAT_ON_TYPE frequencies
        if (REPEAT_ON_TYPE.includes(frequencyType)) {
          setFrequencyMetadata({
            ...frequencyMetadata,
            time: moment(`${dueDateOnly}T${defaultTime}`).format(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        }
      }
    } else {
      // Revert to end of day
      if (dueDateOnly) {
        const endOfDay = moment(dueDateOnly)
          .endOf('day')
          .format('YYYY-MM-DDTHH:mm:ss')
        setDueDate(endOfDay)
      }
    }
  }
  // `shouldCreateAnother` is passed explicitly by the split-button menu so a
  // menu pick performs the save right away instead of only changing the
  // default (state updates wouldn't be visible to this call anyway).
  const HandleSaveChore = (shouldCreateAnother = createAnother) => {
    if (updateChoreMutation.isPending || createChoreMutation.isPending) return
    setAttemptToSave(true)
    if (!HandleValidateChore()) {
      console.log('validation failed')
      console.log(errors)
      return
    }
    let newChoreId = choreId
    if (searchParams.get('clone') === 'true') {
      newChoreId = null
    }
    const assignees = anyone ? [] : assignableTo
    // The editor blocks Plus-only reminders on the way in, but a cloned task,
    // a queued offline edit or a task created while subscribed can still carry
    // them — so the plan is enforced once more on the way out.
    const planReminders = sanitizeRemindersForPlan(
      notificationMetadata?.templates,
      isPlusAccount(userProfile),
    )
    const chore = {
      id: Number(newChoreId),
      name: name,
      description: description,
      assignees: assignees,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      nextDueDate: dueDate ? new Date(dueDate).toISOString() : null,
      frequencyType: frequencyType,
      frequency: Number(frequency),
      frequencyMetadata: frequencyMetadata,
      assignedTo: assignedToValue,
      assignStrategy: assignStrategyValue,
      isRolling: isRolling,
      isActive: isActive,
      notification: isNotificable && planReminders.length > 0,
      labels: labels.map(l => l.name),
      labelsV2: labelsV2,
      subTasks: subTasks,
      notificationMetadata: {
        ...notificationMetadata,
        templates: planReminders,
      },
      thingTrigger: thingTrigger,
      completionActions,
      points: points < 0 ? null : points,
      requireApproval: requireApproval,
      isPrivate: isPrivate,
      completionWindow:
        // if completionWindow is -1 then set it to null or dueDate is null
        completionWindow < 0 || dueDate === null ? null : completionWindow,
      deadlineOffset: deadlineOffset < 0 ? null : deadlineOffset,
      priority: priority,
      projectId: projectId === 'default' ? null : projectId,
      draftId: newChoreId > 0 ? undefined : draftId,
    }
    let SaveFunction = createChoreMutation.mutateAsync
    if (newChoreId > 0) {
      SaveFunction = updateChoreMutation.mutateAsync
    } else {
      // This is the dedicated create page, distinct from the AddTaskModal
      // popup (which sets its own quick_add/voice/scan source).
      chore.source =
        searchParams.get('clone') === 'true' ? 'clone' : 'full_page'
    }

    SaveFunction(chore)
      .then(result => {
        if (
          result?._pendingUpdate ||
          result?._pendingCreate ||
          result?.res?._pendingCreate
        ) {
          showSuccess({
            title: t('choreEdit.savedOfflineTitle'),
            message: t('choreEdit.savedOfflineMessage'),
          })
        } else {
          showSuccess({
            title: t('choreEdit.savedTitle'),
            message: t('choreEdit.savedMessage'),
          })
        }
        dirtyGuard.current = false
        setSavedSnapshot(latestSnapshot.current)
        Navigate(shouldCreateAnother ? '/chores/create' : '/chores', {
          state: shouldCreateAnother ? { createAnother: true } : null,
        })
      })
      .catch(error => {
        console.error('Failed to save chore:', error)
        showError({
          title: t('choreEdit.saveFailedTitle'),
          message: error?.isServerMessage
            ? error.message
            : t('choreEdit.saveFailedMessage'),
        })
      })
  }
  useEffect(() => {
    //fetch performers:
    GetAllCircleMembers().then(data => {
      setPerformers(data.res)
    })
    GetThings().then(response => {
      response.json().then(data => {
        setAllUserThings(data.res)
      })
    })

    // Load default privacy setting for new chores
    if (!choreId) {
      const defaultPrivacySetting = localStorage.getItem(
        'defaultPrivacySetting',
      )
      if (defaultPrivacySetting !== null) {
        setIsPrivate(JSON.parse(defaultPrivacySetting))
      }

      const defaultNotificationSetting = localStorage.getItem(
        'defaultNotificationSetting',
      )
      if (defaultNotificationSetting !== null) {
        setIsNotificable(JSON.parse(defaultNotificationSetting))
      }

      const defaultAnyoneSetting = localStorage.getItem('defaultAnyoneSetting')
      if (defaultAnyoneSetting != null) {
        const savedAnyone = JSON.parse(defaultAnyoneSetting)
        setAnyone(savedAnyone)
      }

      const defaultAssigneeSetting = localStorage.getItem(
        'defaultAssigneeSetting',
      )
      if (defaultAssigneeSetting !== null) {
        const savedAssignees = JSON.parse(defaultAssigneeSetting)
        setAssignableTo(savedAssignees)
      }
    }
  }, [])
  useEffect(() => {
    if (choreId || !userProfile?.id) return

    const defaultAnyoneSetting = localStorage.getItem('defaultAnyoneSetting')
    const defaultAssigneeSetting = localStorage.getItem(
      'defaultAssigneeSetting',
    )

    if (defaultAnyoneSetting === null && defaultAssigneeSetting === null) {
      setAnyone(false)
      setAssignableTo([{ userId: userProfile.id }])
      setAssignedTo(userProfile.id)
    }
  }, [choreId, userProfile?.id])
  useEffect(() => {
    const anyoneSetting = localStorage.getItem('defaultAnyoneSetting')
    const anyoneDirty = anyoneSetting !== JSON.stringify(anyone)
    const assigneeSetting = localStorage.getItem('defaultAssigneeSetting')
    const assigneeDirty = assigneeSetting !== JSON.stringify(assignableTo)
    const dirty = anyoneDirty || (!anyone && assigneeDirty)
    setShowSaveAssigneeDefault(dirty)
  }, [anyone, assignableTo])

  // A task in a private project is always private: the project's privacy wins over
  // the task's own setting, so keep the form in sync with the selected project.
  const selectedProjectIsPrivate = Boolean(
    projects.find(project => project.id === projectId)?.isPrivate,
  )
  useEffect(() => {
    if (selectedProjectIsPrivate && !isPrivate) {
      setIsPrivate(true)
    }
  }, [selectedProjectIsPrivate, isPrivate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = event => {
      if (!isPageShortcutActive) return
      if (event.repeat) return

      const isHoldingCmd = event.ctrlKey || event.metaKey

      // Show keyboard shortcuts when holding Cmd/Ctrl
      if (isHoldingCmd) {
        setShowKeyboardShortcuts(true)
      }

      // Cmd/Ctrl + Enter to save
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        HandleSaveChore()
        return
      }

      // Cmd/Ctrl + Escape key to cancel
      if (event.key === 'Escape' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        Navigate(choreId ? `/chores/${choreId}` : '/chores')
        return
      }
    }

    const handleKeyUp = event => {
      if (event.key === 'Control' || event.key === 'Meta') {
        setShowKeyboardShortcuts(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [HandleSaveChore, isPageShortcutActive])

  useEffect(() => {
    if (isChoreLoading === false && choreData && choreId) {
      const data = choreData
      const isCloneMode = searchParams.get('clone') === 'true'

      setChore(data.res)
      setName(data.res.name ? data.res.name : '')
      setDescription(data.res.description ? data.res.description : '')
      setAssignableTo(data.res.assignees ? data.res.assignees : [])
      setAnyone((data.res.assignees?.length || 0) === 0)
      setAssignedTo(data.res.assignedTo)
      setFrequencyType(data.res.frequencyType ? data.res.frequencyType : 'once')

      setFrequencyMetadata(data.res.frequencyMetadata)
      setFrequency(data.res.frequency)

      setNotificationMetadata(data.res.notificationMetadata)
      setCompletionActions(data.res.completionActions || [])
      setPoints(
        data.res.points != null && data.res.points >= 0 ? data.res.points : -1,
      )
      setRequireApproval(data.res.requireApproval || false)
      setIsPrivate(data.res.isPrivate || false)
      setCompletionWindow(
        data.res.completionWindow && data.res.completionWindow > -1
          ? data.res.completionWindow
          : -1,
      )
      setDeadlineOffset(
        data.res.deadlineOffset && data.res.deadlineOffset > -1
          ? data.res.deadlineOffset
          : -1,
      )

      setLabelsV2(data.res.labelsV2)

      setPriority(data.res.priority)
      setAssignStrategy(
        data.res.assignStrategy
          ? data.res.assignStrategy
          : DEFAULT_ASSIGN_STRATEGY,
      )
      setIsRolling(data.res.isRolling)
      setIsActive(data.res.isActive)
      setSubTasks(data.res.subTasks ? data.res.subTasks : [])
      setProjectId(data.res.projectId || 'default')

      if (isCloneMode) {
        if (data.res.subTasks) {
          const clonedSubTasks = data.res.subTasks.map(subTask => ({
            ...subTask,
            id: -subTask.id, // Negate ID to indicate new sub task
            parentId: subTask.parentId ? -subTask.parentId : null, // Negate parent ID if exists
            completed: false, // Reset completion status
            completedAt: null, // Reset completion date
          }))
          setSubTasks(clonedSubTasks)
        }
        if (data.res.name) {
          setName(`Copy of ${data.res.name}`)
        }
      }

      setIsNotificable(data.res.notification)
      setThingTrigger(data.res.thingChore)

      // Parse existing due date into date and time components
      if (data.res.nextDueDate) {
        const dueDateMoment = moment(data.res.nextDueDate)
        const dateOnly = dueDateMoment.format('YYYY-MM-DD')
        const timeOnly = dueDateMoment.format('HH:mm')
        const endOfDayTime = '23:59'

        setDueDateOnly(dateOnly)
        setDueDate(dueDateMoment.format('YYYY-MM-DDTHH:mm:ss'))

        // Check if it's a custom time (not end of day)
        if (timeOnly !== endOfDayTime) {
          setUseCustomTime(true)
          setDueTime(timeOnly)
        } else {
          setUseCustomTime(false)
          setDueTime(null)
        }
      } else {
        setDueDateOnly(null)
        setDueDate(null)
        setUseCustomTime(false)
        setDueTime(null)
      }

      setCreatedBy(data.res.createdBy)
      setUpdatedBy(data.res.updatedBy)
      setAttachments(data.res.attachments || [])
    }
  }, [choreData, isChoreLoading, searchParams])

  // useEffect(() => {
  //   if (userLabels && userLabels.length == 0 && labelsV2.length == 0) {
  //     return
  //   }
  //   const labelIds = labelsV2.map(l => l.id)
  //   setLabelsV2(userLabels.filter(l => labelIds.indexOf(l.id) > -1))
  // }, [userLabels, labelsV2])

  useEffect(() => {
    // if frequency type change to something need a due date then set it to the current date:
    if (!NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) && !dueDate) {
      const today = moment(new Date()).format('YYYY-MM-DD')
      setDueDateOnly(today)
      // Default to end of day
      setDueDate(moment(today).endOf('day').format('YYYY-MM-DDTHH:mm:59'))
      setUseCustomTime(false)
      setDueTime(null)
    }
    if (NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)) {
      setDueDate(null)
      setDueDateOnly(null)
      setUseCustomTime(false)
      setDueTime(null)
    }
    // backend rejects notification: true for these frequency types
    // (forbidden_with_trigger_frequency), so clear it client-side too
    if (NOTIFICATION_FORBIDDEN_TYPE.includes(frequencyType)) {
      setIsNotificable(false)
      setNotificationMetadata({})
    }
  }, [frequencyType])

  // useEffect(() => {
  //   if (performers.length > 0 && assignees.length === 0 && userProfile) {
  //     setAssignees([
  //       {
  //         userId: userProfile?.id,
  //       },
  //     ])
  //   }
  // }, [performers, userProfile])

  // if user resolve the error trigger validation to remove the error message from the respective field
  useEffect(() => {
    if (attemptToSave) {
      HandleValidateChore()
    }
  }, [assignableTo, name, frequencyMetadata, attemptToSave, dueDate])

  const uploadAttachmentFile = async file => {
    if (!file) return
    setIsUploadingAttachment(true)
    try {
      const response = choreId
        ? await UploadChoreAttachment(file, 'chore_attachment', {
            entityId: choreId,
          })
        : await UploadChoreAttachment(file, 'chore_attachment_draft', {
            draftId,
          })
      if (!response.ok) {
        showError({
          title: t('choreEdit.uploadFailedTitle'),
          message: t('choreEdit.uploadFailedMessage'),
        })
        return
      }
      const data = await response.json()
      setAttachments(prev => [
        ...prev,
        {
          file_path: data.path,
          file_name: data.file_name,
          size_bytes: data.size_bytes,
          sign: data.sign,
        },
      ])
    } catch {
      showError({
        title: t('choreEdit.uploadFailedTitle'),
        message: t('choreEdit.uploadFailedMessage'),
      })
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  // Native only: the OS scanner returns a cropped, deskewed page which is a
  // better attachment than a raw camera shot of the same document.
  const handleScanAttachment = async () => {
    const { cancelled, error, image } = await scanDocument()
    if (cancelled) return
    if (error || !image) {
      showError({
        title: t('choreEdit.scanFailedTitle'),
        message: error || t('choreEdit.scanFailedMessage'),
      })
      return
    }
    const file = await imageSourceToFile(image, `scan-${Date.now()}.jpg`)
    if (!file) {
      showError({
        title: t('choreEdit.scanFailedTitle'),
        message: t('choreEdit.scanReadFailedMessage'),
      })
      return
    }
    await uploadAttachmentFile(file)
  }

  const handleDelete = () => {
    setConfirmModelConfig({
      isOpen: true,
      title: t('choreEdit.deleteChoreTitle'),
      confirmText: t('common:delete'),
      cancelText: t('common:cancel'),
      message: t('edit.deleteConfirm'),
      onClose: isConfirmed => {
        if (isConfirmed === true) {
          deleteChores.mutate([choreId], {
            onSuccess: () => {
              Navigate('/chores')
            },
            onError: error => {
              showError({
                title: t('choreEdit.deleteFailedTitle'),
                message: t('choreEdit.deleteChoreFailed', {
                  error: error.message,
                }),
              })
            },
          })
        }
        setConfirmModelConfig({})
      },
    })
  }
  const changeWizardStep = next => {
    if (next > wizardStep && !HandleValidateChore(wizardStep)) return
    setWizardStep(next)
    wizardBodyRef.current?.scrollTo({ top: 0 })
    requestAnimationFrame(() => {
      if (window.matchMedia('(min-width:600px)').matches)
        window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }
  const assignmentSummary = anyone
    ? 'Anyone in your circle'
    : performers
        .filter(user => assignableTo.some(a => a.userId === user.userId))
        .map(user => user.displayName)
        .join(', ') || 'No eligible users selected'
  if (
    (isChoreLoading && choreId) ||
    isUserLabelsLoading ||
    isUserProfileLoading ||
    isMemberDataLoading ||
    isProjectsLoading
  ) {
    return <LoadingComponent />
  }
  if (isChoreError && choreId) {
    return (
      <Container maxWidth='sm'>
        <EmptyState
          variant='error'
          fullHeight
          icon={<Checklist />}
          title={t('choreView.notFoundTitle')}
          description={t('choreView.notFoundDescription')}
          primaryAction={{ label: t('archived.backToTasks'), to: '/chores' }}
        />
      </Container>
    )
  }
  return (
    <WizardContainer
      maxWidth={false}
      onClose={() => Navigate(choreId ? `/chores/${choreId}` : '/chores')}
      onClickCapture={captureInitialValues}
      onChangeCapture={captureInitialValues}
      onKeyDownCapture={captureInitialValues}
      sx={{
        p: 0,
        maxWidth: 'none !important',
        minHeight: { sm: '100dvh' },
        '& .task-editor-grid h4, & .task-editor-grid h5': {
          fontSize: 14,
          fontWeight: 500,
          mb: 0.75,
          color: 'text.secondary',
        },
        '& .task-editor-grid .MuiInput-root, & .task-editor-grid .MuiSelect-root, & .task-editor-grid .MuiAutocomplete-root':
          { minHeight: 44, borderRadius: 'md', minWidth: 0 },
        '& .task-properties': {
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
          alignItems: 'start',
          '& > .MuiBox-root': { mb: 0 },
          '& > :last-child:nth-child(3)': { gridColumn: '1 / -1' },
        },
        '& .task-editor-grid .MuiCard-root': { boxShadow: 'none' },
        '& [data-wizard-name]': {
          display: singlePageEditor || wizardStep === 0 ? 'block' : 'none',
        },
        '& [data-editor-section="task"]': {
          display: singlePageEditor || wizardStep === 0 ? 'block' : 'none',
        },
        '& [data-editor-section="schedule"]': {
          display: singlePageEditor || wizardStep === 1 ? 'block' : 'none',
          ...(singlePageEditor
            ? {}
            : {
                mt: '0 !important',
                pt: '0 !important',
                borderTop: '0 !important',
              }),
        },
        '& [data-editor-section="assignment"]': {
          display: singlePageEditor || wizardStep === 2 ? 'block' : 'none',
          ...(singlePageEditor
            ? {}
            : {
                mt: '0 !important',
                pt: '0 !important',
                borderTop: '0 !important',
              }),
        },
        '& [data-editor-section="description"], & [data-editor-section="organization"], & [data-editor-section="subtasks"]':
          { display: singlePageEditor || wizardStep === 0 ? 'block' : 'none' },
        '& [data-editor-section="actions"], & [data-editor-section="notifications"], & [data-editor-section="window"], & [data-editor-section="privacy"], & [data-editor-section="metadata"]':
          { display: singlePageEditor || wizardStep === 3 ? 'block' : 'none' },
      }}
    >
      <Sheet
        sx={{
          borderRadius: { xs: '20px 20px 0 0', sm: 0 },
          border: 0,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: { xs: 'calc(100dvh - 48px)', sm: 'none' },
          minHeight: { sm: '100dvh' },
          overflow: 'hidden',
          bgcolor: { xs: 'background.surface', sm: 'transparent' },
          boxShadow: { xs: 'sm', sm: 'none' },
        }}
      >
        <Box
          sx={{
            display: { xs: 'block', sm: 'none' },
            width: 36,
            height: 4,
            bgcolor: 'neutral.600',
            borderRadius: 2,
            mx: 'auto',
            mt: 1.25,
          }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, sm: 3 },
            py: 2,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography level='h4'>
              {choreId ? 'Edit task' : 'Create task'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isDirty && (
              <Chip variant='soft' color='warning'>
                {t('taskEditor.unsaved')}
              </Chip>
            )}
            <IconButton
              aria-label={t('taskEditor.closeTaskEditor')}
              color='neutral'
              variant='plain'
              onClick={() =>
                Navigate(choreId ? `/chores/${choreId}` : '/chores')
              }
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>
        {!singlePageEditor && (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            <Typography
              level='body-sm'
              sx={{
                display: { xs: 'block', sm: 'none' },
                mb: name && wizardStep > 0 ? 1 : 0,
              }}
            >
              {t('taskEditor.step')}
              {wizardStep + 1}
              {t('taskEditor.of4')}
              {wizardSteps[wizardStep]}
            </Typography>
            <WizardStepper
              steps={wizardSteps}
              activeStep={wizardStep}
              onStepChange={changeWizardStep}
              sx={{ mb: name && wizardStep > 0 ? 2 : 0 }}
            />
            {name && wizardStep > 0 && (
              <Sheet
                variant='soft'
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 'md',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    level='title-sm'
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {name}
                  </Typography>
                  <Typography level='body-xs'>
                    {t('taskEditor.task')}
                  </Typography>
                </Box>
                <IconButton
                  aria-label={t('taskEditor.editTaskDetails')}
                  size='sm'
                  onClick={() => changeWizardStep(0)}
                >
                  <EditOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Sheet>
            )}
          </Box>
        )}
        <Box
          ref={wizardBodyRef}
          tabIndex={-1}
          role='region'
          aria-label={
            singlePageEditor ? 'Task settings' : wizardSteps[wizardStep]
          }
          sx={{
            minHeight: 0,
            outline: 0,
            overflowY: { xs: 'auto', sm: 'visible' },
            flex: 1,
          }}
        >
          {Object.keys(errors).length > 0 && (
            <Alert color='danger' variant='soft' sx={{ mb: 2 }}>
              <Box>
                <Typography level='title-sm'>
                  {t('taskEditor.checkTheseSettingsBeforeSaving')}
                </Typography>
                {Object.entries(errors).map(([key, message]) => (
                  <Button
                    key={key}
                    variant='plain'
                    color='danger'
                    size='sm'
                    onClick={() => focusError(key)}
                  >
                    {message}
                  </Button>
                ))}
              </Box>
            </Alert>
          )}
          {!singlePageEditor && wizardStep === 3 && (
            <Box
              data-wizard-review
              tabIndex={-1}
              sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}
            >
              <Typography level='title-lg'>
                {t('taskEditor.reviewTask')}
              </Typography>
              <Typography
                level='body-sm'
                textColor='text.tertiary'
                sx={{ mb: 2 }}
              >
                {t('taskEditor.checkTheDetailsThen')}{' '}
                {choreId ? 'save your changes' : 'create your task'}.
              </Typography>
              {[
                { label: 'Task', value: name, step: 0 },
                { label: 'Schedule', value: scheduleSummary, step: 1 },
                { label: 'Assignment', value: assignmentSummary, step: 2 },
              ].map(item => (
                <Sheet
                  key={item.label}
                  variant='outlined'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 1.5,
                    mb: 1,
                    borderRadius: 'md',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography level='body-xs' textColor='text.tertiary'>
                      {item.label}
                    </Typography>
                    <Typography
                      level='title-sm'
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={'Edit ' + item.label.toLowerCase()}
                    onClick={() => changeWizardStep(item.step)}
                  >
                    <EditOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                </Sheet>
              ))}
            </Box>
          )}
          <Box className='task-editor-grid'>
            <EditorSection
              title={t('taskEditor.name')}
              icon={TitleOutlined}
              section='task'
              hideHeading={!singlePageEditor}
              collapsible={singlePageEditor}
              defaultOpen
              error={errors.name}
              summary={name}
            >
              <Box data-wizard-name>
                <FormControl error={errors.name}>
                  {!singlePageEditor && (
                    <Typography level='h4'>
                      {t('taskEditor.taskName')}
                    </Typography>
                  )}
                  <Input
                    aria-label={t('taskEditor.taskName2')}
                    placeholder={t('taskEditor.whatNeedsToBeDone')}
                    sx={{ minHeight: 48, fontSize: 'lg' }}
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                  <FormHelperText error>{errors.name}</FormHelperText>
                </FormControl>
              </Box>
            </EditorSection>

            <EditorSection
              title={t('taskEditor.schedule')}
              icon={CalendarMonthOutlined}
              section='schedule'
              collapsible
              defaultOpen
              error={errors.frequency || errors.dueDate || errors.thingTrigger}
              summary={scheduleSummary}
            >
              <Typography
                level='body-sm'
                textColor='text.tertiary'
                sx={{ mb: 2 }}
              >
                {t('taskEditor.chooseWhenThisTaskIsDueAnd')}
              </Typography>

              <RepeatSection
                frequency={frequency}
                onFrequencyUpdate={setFrequency}
                frequencyType={frequencyType}
                onFrequencyTypeUpdate={value => {
                  setFrequencyType(value)
                  if (value === 'always') {
                    setDueDate(null)
                    setDueDateOnly(null)
                    setDueTime(null)
                    setUseCustomTime(false)
                  }
                }}
                frequencyMetadata={frequencyMetadata}
                onFrequencyMetadataUpdate={setFrequencyMetadata}
                frequencyError={errors?.frequency}
                allUserThings={allUserThings}
                onTriggerUpdate={thingUpdate => {
                  if (thingUpdate === null) {
                    setThingTrigger(null)
                    return
                  }
                  setThingTrigger({
                    triggerState: thingUpdate.triggerState,
                    condition: thingUpdate.condition,
                    thingID: thingUpdate.thing.id,
                  })
                }}
                OnTriggerValidate={setIsThingValid}
                isAttemptToSave={attemptToSave}
                selectedThing={thingTrigger}
              />

              {frequencyType !== 'always' &&
                (frequencyType !== 'trigger' || dueDate) && (
                  <Box mt={3} mb={2}>
                    <Typography level='h4'>
                      {choreId ? 'Next due date' : 'First due date'}
                    </Typography>
                    {frequencyType === 'trigger' && !dueDate && (
                      <Typography level='body-sm'>
                        {t('taskEditor.theTaskBecomesDueWhenItsThing')}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'minmax(0, 1fr)',
                          sm: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 2,
                        mt: 2,
                        alignItems: 'start',
                      }}
                    >
                      <FormControl error={Boolean(errors.dueDate)}>
                        <Typography level='h4'>
                          {REPEAT_ON_TYPE.includes(frequencyType)
                            ? 'Start date'
                            : 'Date'}
                        </Typography>
                        <Input
                          type='date'
                          aria-label={t('taskEditor.dueDate')}
                          value={dueDateOnly || ''}
                          onChange={handleDueDateChange}
                        />
                        {dueDate && (
                          <Button
                            size='sm'
                            variant='plain'
                            color='neutral'
                            sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                            onClick={() => {
                              setDueDate(null)
                              setDueDateOnly(null)
                              setDueTime(null)
                              setUseCustomTime(false)
                            }}
                          >
                            {t('actionMenu.removeDueDate')}
                          </Button>
                        )}
                        {errors.dueDate && (
                          <FormHelperText>{errors.dueDate}</FormHelperText>
                        )}
                      </FormControl>
                      <FormControl>
                        <Typography level='h4'>
                          {t('taskEditor.time')}
                        </Typography>
                        {useCustomTime ? (
                          <Input
                            type='time'
                            aria-label={t('taskEditor.dueTime')}
                            value={dueTime || '18:00'}
                            onChange={handleDueTimeChange}
                          />
                        ) : (
                          <Button
                            variant='outlined'
                            color='neutral'
                            onClick={() => handleUseCustomTimeChange(true)}
                            sx={{
                              minHeight: 44,
                              justifyContent: 'flex-start',
                              fontWeight: 400,
                            }}
                          >
                            {t('taskEditor.addATime')}
                          </Button>
                        )}
                        {useCustomTime && (
                          <Button
                            size='sm'
                            variant='plain'
                            color='neutral'
                            sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                            onClick={() => handleUseCustomTimeChange(false)}
                          >
                            {t('taskEditor.removeTime')}
                          </Button>
                        )}
                      </FormControl>
                    </Box>
                  </Box>
                )}

              {!['once', 'no_repeat', 'trigger', 'always'].includes(
                frequencyType,
              ) && (
                <Box>
                  <Typography level='h4'>
                    {t('choreEdit.schedulingPrefs')}
                  </Typography>
                  <RadioGroup name='tiers' sx={{ gap: 1, '& > div': { p: 1 } }}>
                    <FormControl>
                      <Radio
                        overlay
                        checked={!isRolling}
                        onClick={() => setIsRolling(false)}
                        label={t('choreEdit.rescheduleFromDue')}
                      />
                      <FormHelperText>
                        {t('taskEditor.theNextOccurrenceIsScheduledFromThe')}
                      </FormHelperText>
                    </FormControl>
                    <FormControl>
                      <Radio
                        overlay
                        checked={isRolling}
                        onClick={() => {
                          setIsRolling(true)
                          setDeadlineOffset(-1)
                        }}
                        label={t('choreEdit.rescheduleFromCompletion')}
                      />
                      <FormHelperText>
                        {t('taskEditor.theNextOccurrenceIsScheduledFromThe2')}
                      </FormHelperText>
                    </FormControl>
                  </RadioGroup>
                </Box>
              )}
            </EditorSection>

            <EditorSection
              title={t('choreView.assignment')}
              icon={GroupOutlined}
              section='assignment'
              collapsible
              defaultOpen
              error={errors.assignees || errors.assignedTo}
              summary={assignmentSummary}
            >
              <Box mb={2}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography level='h4' sx={{ mb: '0 !important' }}>
                    {t('taskEditor.assignTo')}
                  </Typography>
                  {!showSaveAssigneeDefault && (
                    <Chip
                      size='sm'
                      variant='soft'
                      color='neutral'
                      startDecorator={<Check sx={{ fontSize: 14 }} />}
                    >
                      {t('taskEditor.savedDefault')}
                    </Chip>
                  )}
                  {showSaveAssigneeDefault && (
                    <Box sx={{ display: 'flex', justifyContent: 'start' }}>
                      <Button
                        variant='plain'
                        size='sm'
                        color='neutral'
                        startDecorator={<Save sx={{ fontSize: 16 }} />}
                        sx={{
                          borderRadius: 6,
                          fontWeight: 500,
                          '&:hover': {
                            background: 'neutral.softHoverBg',
                          },
                        }}
                        onClick={() => {
                          localStorage.setItem(
                            'defaultAnyoneSetting',
                            JSON.stringify(anyone),
                          )
                          localStorage.setItem(
                            'defaultAssigneeSetting',
                            JSON.stringify(assignableTo),
                          )
                          setShowSaveAssigneeDefault(false)
                        }}
                      >
                        {t('taskEditor.useAsDefault')}
                      </Button>
                    </Box>
                  )}
                </Box>
                <Typography
                  level='body-sm'
                  textColor='text.tertiary'
                  sx={{ mb: 1.5 }}
                >
                  {t('taskEditor.chooseWhoCanBeAssignedThisTask')}
                </Typography>
                <Card variant='plain' sx={{ p: 0, bgcolor: 'transparent' }}>
                  <List
                    orientation='horizontal'
                    wrap
                    sx={{
                      '--List-gap': '8px',
                      '--ListItem-radius': '20px',
                      p: 0,
                      '& .MuiListItem-root': { minHeight: 36, px: 1.5 },
                    }}
                  >
                    {/* add one for Anyone if no specific assignee is selected */}

                    <ListItem
                      key={'anyone'}
                      sx={{
                        border: '1px solid',
                        borderColor: anyone
                          ? 'primary.outlinedBorder'
                          : 'neutral.outlinedBorder',
                        bgcolor: anyone
                          ? 'primary.softBg'
                          : 'background.surface',
                      }}
                    >
                      <Checkbox
                        checked={anyone}
                        onClick={() => {
                          setAnyone(!anyone)
                          setIsPrivate(false)
                        }}
                        overlay
                        disableIcon
                        variant='plain'
                        label={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                            }}
                          >
                            {t('choreEdit.anyone')}
                            {anyone && <Check sx={{ fontSize: 16 }} />}
                          </Box>
                        }
                      />
                    </ListItem>

                    {performers?.map((item, index) => (
                      <ListItem
                        key={item.id}
                        sx={{
                          border: '1px solid',
                          borderColor:
                            !anyone &&
                            assignableTo.some(a => a.userId === item.userId)
                              ? 'primary.outlinedBorder'
                              : 'neutral.outlinedBorder',
                          bgcolor:
                            !anyone &&
                            assignableTo.some(a => a.userId === item.userId)
                              ? 'primary.softBg'
                              : 'background.surface',
                        }}
                      >
                        <Checkbox
                          checked={
                            !anyone &&
                            assignableTo.some(a => a.userId == item.userId)
                          }
                          onClick={() => {
                            if (anyone) {
                              setAnyone(false)
                              setAssignableTo([{ userId: item.userId }])
                              return
                            }
                            const assignees = assignableTo
                            const setAssignees = setAssignableTo
                            if (assignees.some(a => a.userId === item.userId)) {
                              const newAssignees = assignees.filter(
                                a => a.userId !== item.userId,
                              )
                              setAnyone(newAssignees.length === 0)
                              setAssignees(newAssignees)
                            } else {
                              setAssignees([
                                ...assignees,
                                { userId: item.userId },
                              ])
                            }
                          }}
                          overlay
                          disableIcon
                          variant='plain'
                          label={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                              }}
                            >
                              <Avatar
                                sx={{ width: 22, height: 22, fontSize: 12 }}
                                color='primary'
                              >
                                {item.displayName?.charAt(0).toUpperCase()}
                              </Avatar>
                              {item.displayName}
                              {!anyone &&
                                assignableTo.some(
                                  a => a.userId === item.userId,
                                ) && <Check sx={{ fontSize: 16 }} />}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Card>
                <Typography
                  level='body-xs'
                  textColor='text.tertiary'
                  sx={{ mt: 1 }}
                >
                  {!showSaveAssigneeDefault
                    ? 'This assignment matches your default for new tasks in this browser.'
                    : 'Use as default applies this assignment to new tasks in this browser.'}
                </Typography>
                {(errors.assignees || errors.assignedTo) && (
                  <FormControl
                    error={Boolean(errors.assignees || errors.assignedTo)}
                  >
                    <FormHelperText>
                      {errors.assignees || errors.assignedTo}
                    </FormHelperText>
                  </FormControl>
                )}
              </Box>

              {assignees.length > 1 && (
                <Box className='task-properties'>
                  <Box mb={2}>
                    <Typography level='h4'>
                      {t('taskEditor.assignedNow')}
                    </Typography>
                    <Select
                      placeholder={
                        assignees.length === 0
                          ? 'No Assignees yet can perform this task'
                          : 'Select an assignee for this task'
                      }
                      disabled={assignees.length === 0}
                      value={assignedTo > -1 ? assignedTo : null}
                      onChange={(_, selectedUserId) =>
                        setAssignedTo(selectedUserId)
                      }
                    >
                      {performers
                        ?.filter(p => assignees.some(a => a.userId == p.userId))
                        .map((item, index) => (
                          <Option value={item.userId} key={item.displayName}>
                            {item.displayName}
                          </Option>
                        ))}
                    </Select>
                  </Box>

                  <Box>
                    <Typography level='h4'>
                      {t('taskEditor.nextAssignment')}
                    </Typography>
                    <Select
                      aria-label={t('taskEditor.nextAssignment')}
                      value={assignStrategy}
                      onChange={(_, value) => {
                        if (value) setAssignStrategy(value)
                      }}
                    >
                      {ASSIGN_STRATEGIES.map(value => (
                        <Option key={value} value={value}>
                          {STRATEGY_LABELS[value]}
                        </Option>
                      ))}
                    </Select>
                  </Box>
                </Box>
              )}
            </EditorSection>
            <EditorSection
              title={t('taskEditor.descriptionAttachments')}
              icon={DescriptionOutlined}
              section='description'
              collapsible
              defaultOpen
              error={errors.description}
              summary={
                [
                  description.replace(/<[^>]*>/g, '').trim()
                    ? 'Instructions added'
                    : '',
                  attachments.length
                    ? `${attachments.length} file${attachments.length === 1 ? '' : 's'}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Instructions, notes and supporting files'
              }
            >
              <Box mb={2}>
                <FormControl error={errors.description}>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    entityId={choreId}
                    entityType={'chore_description'}
                    draftId={draftId}
                  />
                  <FormHelperText error>{errors.description}</FormHelperText>
                </FormControl>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: attachments.length ? 2 : 0,
                }}
              >
                <Button
                  component='label'
                  variant='outlined'
                  color='neutral'
                  size='sm'
                  startDecorator={isUploadingAttachment ? null : <UploadFile />}
                  loading={isUploadingAttachment}
                  sx={{ flexShrink: 0 }}
                >
                  {t('taskEditor.uploadAttachment')}
                  <input
                    type='file'
                    hidden
                    onChange={async e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setIsUploadingAttachment(true)
                      try {
                        const response = choreId
                          ? await UploadChoreAttachment(
                              file,
                              'chore_attachment',
                              {
                                entityId: choreId,
                              },
                            )
                          : await UploadChoreAttachment(
                              file,
                              'chore_attachment_draft',
                              { draftId },
                            )
                        if (!response.ok) {
                          showError({
                            title: 'Upload Failed',
                            message: 'Failed to upload attachment.',
                          })
                          return
                        }
                        const data = await response.json()
                        setAttachments(prev => [
                          ...prev,
                          {
                            file_path: data.path,
                            file_name: data.file_name,
                            size_bytes: data.size_bytes,
                            sign: data.sign,
                          },
                        ])
                      } catch {
                        showError({
                          title: 'Upload Failed',
                          message: 'Failed to upload attachment.',
                        })
                      } finally {
                        setIsUploadingAttachment(false)
                        e.target.value = ''
                      }
                    }}
                  />
                </Button>
                {isNativeScanner && (
                  <Button
                    variant='outlined'
                    color='neutral'
                    size='sm'
                    startDecorator={<DocumentScanner />}
                    disabled={isUploadingAttachment}
                    onClick={handleScanAttachment}
                  >
                    {t('choreEdit.scan')}
                  </Button>
                )}
              </Box>
              {attachments.length > 0 && (
                <Box sx={{ mt: 0 }}>
                  <Box>
                    {attachments.length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        {attachments.map((att, idx) => (
                          <Box
                            key={att.file_path || idx}
                            onClick={async () => {
                              const url = await getImageSrc(
                                att.file_path,
                                att.sign ? resolvePhotoURL(att.sign) : null,
                                { choreId, kind: 'attachment' },
                              ).catch(() =>
                                resolvePhotoURL(att.sign || att.file_path),
                              )
                              const ext = (att.file_name || '')
                                .split('.')
                                .pop()
                                .toLowerCase()
                              const isImage = [
                                'jpg',
                                'jpeg',
                                'png',
                                'gif',
                                'webp',
                                'bmp',
                                'svg',
                              ].includes(ext)
                              if (isImage) {
                                setAttachmentViewerConfig({
                                  isOpen: true,
                                  url,
                                  fileName: att.file_name,
                                  onClose: () =>
                                    setAttachmentViewerConfig({
                                      isOpen: false,
                                    }),
                                })
                              } else {
                                const a = document.createElement('a')
                                a.href = url
                                a.download = att.file_name || 'attachment'
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                              }
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              borderRadius: 'sm',
                              border: '1px solid',
                              borderColor: 'neutral.outlinedBorder',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'neutral.softHoverBg' },
                            }}
                          >
                            <AttachFile
                              sx={{ fontSize: 18, color: 'neutral.500' }}
                            />
                            <Typography
                              level='body-sm'
                              sx={{ flex: 1, wordBreak: 'break-all' }}
                            >
                              {att.file_name}
                            </Typography>
                            {att.size_bytes && (
                              <Typography level='body-xs' color='neutral'>
                                {(att.size_bytes / 1024).toFixed(1)}
                                {t('taskEditor.kb')}
                              </Typography>
                            )}
                            {choreId && (
                              <IconButton
                                size='sm'
                                variant='plain'
                                color='danger'
                                onClick={event => {
                                  event.stopPropagation()
                                  DeleteChoreAttachment(choreId, att.file_path)
                                    .then(() => {
                                      removeCachedImage(att.file_path)
                                      setAttachments(prev =>
                                        prev.filter(
                                          a => a.file_path !== att.file_path,
                                        ),
                                      )
                                    })
                                    .catch(() => {
                                      showError({
                                        title: 'Delete Failed',
                                        message: 'Failed to delete attachment.',
                                      })
                                    })
                                }}
                              >
                                <Delete sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                            {!choreId && (
                              <IconButton
                                size='sm'
                                variant='plain'
                                color='danger'
                                onClick={event => {
                                  event.stopPropagation()
                                  // Draft uploads live server-side too — delete there
                                  // so they are not promoted onto the chore on save.
                                  DeleteDraftAttachment(att.file_path)
                                    .then(() => {
                                      setAttachments(prev =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    })
                                    .catch(() => {
                                      showError({
                                        title: 'Delete Failed',
                                        message: 'Failed to delete attachment.',
                                      })
                                    })
                                }}
                              >
                                <Delete sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </EditorSection>

            <EditorSection
              title={t('taskEditor.organization')}
              icon={LabelOutlined}
              section='organization'
              collapsible
              summary={[
                priority
                  ? Priorities.find(
                      item => item.value === priority,
                    )?.name.trim()
                  : 'No priority',
                projectId !== 'default'
                  ? projects.find(item => item.id === projectId)?.name
                  : '',
                labelsV2.length
                  ? `${labelsV2.length} label${labelsV2.length === 1 ? '' : 's'}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            >
              <Box className='task-properties'>
                <FormControl>
                  <Typography level='h4'>{t('choreEdit.priority')}</Typography>
                  <Select
                    aria-label={t('choreEdit.priority')}
                    value={priority}
                    onChange={(_, value) => {
                      if (value !== null) setPriority(value)
                    }}
                    startDecorator={
                      Priorities.find(item => item.value === priority)
                        ?.icon || <HorizontalRule />
                    }
                  >
                    <Option value={0}>{t('taskEditor.noPriority')}</Option>
                    {Priorities.map(item => (
                      <Option key={item.value} value={item.value}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: item.color
                              ? `${item.color}.500`
                              : 'text.primary',
                          }}
                        >
                          {item.icon}
                          {item.name.trim()}
                        </Box>
                      </Option>
                    ))}
                  </Select>
                </FormControl>
                {/* Project Selection - Show only if there are multiple projects */}
                {projects.length >= 1 && (
                  <Box mb={2}>
                    <Typography level='h4'>{t('choreEdit.project')}</Typography>
                    <Select
                      value={projectId}
                      onChange={(event, newValue) => setProjectId(newValue)}
                      defaultValue='default'
                      sx={{ minWidth: 0, width: '100%' }}
                    >
                      {/*               id: 'default',
              name: 'Default Project',
              color: LABEL_COLORS[0].value,
              icon: 'FolderOpen',
               */}
                      <Option key='default' value='default'>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Avatar
                            size='sm'
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: '#1976d2',
                            }}
                          >
                            {(() => {
                              const IconComponent =
                                getIconComponent('FolderOpen')
                              return (
                                <IconComponent
                                  sx={{
                                    fontSize: 14,
                                    color:
                                      getTextColorFromBackgroundColor(
                                        '#1976d2',
                                      ),
                                  }}
                                />
                              )
                            })()}
                          </Avatar>
                          {t('choreEdit.defaultProject')}
                        </Box>
                      </Option>
                      {projects.map(project => (
                        <Option key={project.id} value={project.id}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Avatar
                              size='sm'
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: project.color || '#1976d2',
                              }}
                            >
                              {project.icon ? (
                                (() => {
                                  const IconComponent = getIconComponent(
                                    project.icon,
                                  )
                                  return (
                                    <IconComponent
                                      sx={{
                                        fontSize: 14,
                                        color: getTextColorFromBackgroundColor(
                                          project.color || '#1976d2',
                                        ),
                                      }}
                                    />
                                  )
                                })()
                              ) : (
                                <></>
                              )}
                            </Avatar>
                            {project.name}
                          </Box>
                        </Option>
                      ))}
                    </Select>
                  </Box>
                )}

                <Box mb={2}>
                  <Typography level='h4'>{t('choreEdit.labels')}</Typography>
                  <Select
                    multiple
                    onChange={(event, newValue) => {
                      setLabelsV2(
                        userLabels.filter(l => newValue.indexOf(l.name) > -1),
                      )
                    }}
                    placeholder={t('taskEditor.addLabels')}
                    value={labelsV2?.map(l => l.name)}
                    renderValue={selected => (
                      <Box sx={{ display: 'flex', gap: '0.25rem' }}>
                        {labelsV2.map(selectedOption => {
                          return (
                            <Chip
                              variant='soft'
                              color='primary'
                              key={selectedOption.id}
                              size='lg'
                              sx={{
                                background: selectedOption.color,
                                color: getTextColorFromBackgroundColor(
                                  selectedOption.color,
                                ),
                              }}
                            >
                              {selectedOption.name}
                            </Chip>
                          )
                        })}
                      </Box>
                    )}
                    sx={{ minWidth: 0, width: '100%' }}
                    slotProps={{
                      listbox: {
                        sx: {
                          width: '100%',
                        },
                      },
                    }}
                  >
                    {userLabels &&
                      userLabels.map(label => (
                        <Option key={label.id + label.name} value={label.name}>
                          <div
                            style={{
                              width: '20 px',
                              height: '20 px',
                              borderRadius: '50%',
                              background: label.color,
                            }}
                          />
                          {label.name}
                        </Option>
                      ))}
                    <MenuItem
                      key={'addNewLabel'}
                      value={' New Label'}
                      onClick={() => {
                        setAddLabelModalOpen(true)
                      }}
                    >
                      <Add />
                      {t('choreEdit.addNewLabel')}
                    </MenuItem>
                  </Select>
                </Box>
              </Box>
            </EditorSection>
            <Box>
              <EditorSection
                title={t('taskEditor.subtasks')}
                icon={Checklist}
                section='subtasks'
                collapsible
                defaultOpen={Boolean(subTasks?.length)}
                summary={
                  subTasks?.length
                    ? `${subTasks.length} subtask${subTasks.length === 1 ? '' : 's'}`
                    : 'A checklist of steps to complete this task'
                }
              >
                <Box>
                  {/* <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                if (e.target.checked) {
                  setSubTasks([])
                } else {
                  setSubTasks(null)
                }
              }}
              overlay
              checked={subTasks != null}
              label='Add sub tasks to this task'
            />
            <FormHelperText>Break this task into smaller steps</FormHelperText>
          </FormControl> */}
                  <Card
                    variant='outlined'
                    sx={{
                      p: 1,
                      mt: 2,
                    }}
                  >
                    <SubTasks
                      editMode={true}
                      tasks={subTasks ? subTasks : []}
                      setTasks={setSubTasks}
                      choreId={choreId}
                    />
                  </Card>
                </Box>
              </EditorSection>
            </Box>
            <EditorSection
              title={t('taskEditor.onCompletion')}
              icon={BoltOutlined}
              section='actions'
              collapsible
              defaultOpen={
                points >= 0 || completionActions.length > 0 || requireApproval
              }
              error={errors.completionActions}
              summary={
                [
                  points >= 0 ? `${points} points` : '',
                  completionActions.length
                    ? `${completionActions.length} Thing action${completionActions.length === 1 ? '' : 's'}`
                    : '',
                  requireApproval ? 'Approval required' : '',
                ]
                  .filter(Boolean)
                  .join(' · ') ||
                'Award points, require approval, or update Things when completed'
              }
            >
              <CompletionActionsSection
                actions={completionActions}
                onChange={setCompletionActions}
                showHeading={false}
                points={points}
                onPointsChange={setPoints}
                requireApproval={requireApproval}
                onRequireApprovalChange={setRequireApproval}
                onValidate={setCompletionActionsValid}
              />
            </EditorSection>
            <EditorSection
              title={t('choreEdit.notifications')}
              icon={NotificationsOutlined}
              section='notifications'
              collapsible
              defaultOpen={isNotificable}
              summary={isNotificable ? 'Reminders enabled' : 'Reminders off'}
            >
              <Box mb={2}>
                {!isPlusAccount(userProfile) && (
                  <Typography level='body-sm' color='warning' sx={{ mb: 1 }}>
                    {t('taskEditor.taskNotificationsAreNotAvailableInThe')}
                  </Typography>
                )}

                <FormControl sx={{ mt: 1 }}>
                  <Checkbox
                    onChange={e => {
                      setIsNotificable(e.target.checked)
                      if (!e.target.checked) {
                        setNotificationMetadata({})
                      }
                    }}
                    defaultChecked={isNotificable}
                    checked={isNotificable}
                    disabled={
                      !isPlusAccount(userProfile) ||
                      NOTIFICATION_FORBIDDEN_TYPE.includes(frequencyType)
                    }
                    overlay
                    label={t('choreEdit.notifyForTask')}
                  />
                  <FormHelperText
                    sx={{
                      opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
                    }}
                  >
                    {NOTIFICATION_FORBIDDEN_TYPE.includes(frequencyType)
                      ? t('choreEdit.notifyForTaskUnavailable')
                      : t('choreEdit.notifyForTaskHelp')}
                  </FormHelperText>
                </FormControl>
              </Box>

              {isNotificable &&
                !NOTIFICATION_FORBIDDEN_TYPE.includes(frequencyType) && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <Card variant='outlined'>
                      <Typography level='h4' mb={2}>
                        {t('choreEdit.notificationSchedule')}
                      </Typography>
                      <Box sx={{ p: 0.5 }}>
                        <NotificationTemplate
                          onChange={metadata => {
                            const newTemplates = metadata.notifications
                            if (
                              notificationMetadata?.templates !== newTemplates
                            ) {
                              setNotificationMetadata({
                                ...notificationMetadata,
                                templates: newTemplates,
                              })
                            }
                          }}
                          value={notificationMetadata}
                        />
                      </Box>

                      <Typography level='h4' mt={3} mb={2}>
                        {t('choreEdit.whoToNotify')}
                      </Typography>
                      <FormControl>
                        <Checkbox
                          overlay
                          disabled={true}
                          checked={true}
                          label={t('choreEdit.allAssignees')}
                        />
                        <FormHelperText>
                          {t('choreEdit.allAssigneesHelp')}
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <Checkbox
                          overlay
                          onClick={() => {
                            if (notificationMetadata?.circleGroup) {
                              delete notificationMetadata.circleGroupID
                            }

                            setNotificationMetadata({
                              ...notificationMetadata,
                              circleGroup: !notificationMetadata?.circleGroup,
                            })
                          }}
                          checked={
                            notificationMetadata
                              ? notificationMetadata?.circleGroup
                              : false
                          }
                          label={t('choreEdit.specificGroup')}
                        />
                        <FormHelperText>
                          {t('choreEdit.specificGroupHelp')}
                        </FormHelperText>
                      </FormControl>

                      {notificationMetadata?.circleGroup && (
                        <Box
                          sx={{
                            mt: 0,
                            ml: 4,
                          }}
                        >
                          <Typography level='body-sm'>
                            {t('choreEdit.telegramGroupIdLabel')}
                          </Typography>
                          <Input
                            type='number'
                            value={notificationMetadata?.circleGroupID}
                            placeholder={t(
                              'choreEdit.telegramGroupIdPlaceholder',
                            )}
                            onChange={e => {
                              setNotificationMetadata({
                                ...notificationMetadata,
                                circleGroupID: parseInt(e.target.value),
                              })
                            }}
                          />
                        </Box>
                      )}
                    </Card>
                  </Box>
                )}
            </EditorSection>
            {dueDate && (
              <EditorSection
                title={t('choreEdit.taskWindow')}
                icon={TimerOutlined}
                section='window'
                collapsible
                defaultOpen={completionWindow !== -1}
                summary={
                  completionWindow !== -1
                    ? `Completable ${completionWindow}h before due`
                    : t('choreEdit.taskWindowDesc')
                }
              >
                <Box mb={2}>
                  {/* Available From (Completion Window) */}
                  <FormControl sx={{ mt: 1 }}>
                    <Checkbox
                      checked={completionWindow !== -1}
                      onChange={e => {
                        if (e.target.checked) {
                          setCompletionWindow(1) // default 1 hour in seconds
                        } else {
                          setCompletionWindow(-1)
                        }
                      }}
                      overlay
                      label={t('choreEdit.earliestCompletion')}
                    />
                    <FormHelperText>
                      {t('choreEdit.earliestCompletionHelp')}
                    </FormHelperText>
                  </FormControl>

                  {completionWindow !== -1 && (
                    <Card variant='outlined'>
                      <Box
                        sx={{
                          mt: 0,
                          ml: 4,
                        }}
                      >
                        <Typography level='body-sm'>
                          {t('choreEdit.hoursLabel')}
                        </Typography>
                        <Input
                          type='number'
                          value={completionWindow}
                          sx={{ maxWidth: 100 }}
                          slotProps={{
                            input: {
                              min: 0,
                              max: 24 * 7,
                            },
                          }}
                          placeholder={t('choreEdit.hoursPlaceholder')}
                          onChange={e => {
                            setCompletionWindow(parseInt(e.target.value))
                          }}
                        />
                      </Box>
                    </Card>
                  )}

                  {/* Expires After (Deadline) */}
                  {/* <FormControl sx={{ mt: 2 }}>
              <Checkbox
                checked={deadlineOffset !== -1}
                disabled={isRolling}
                onChange={e => {
                  if (e.target.checked) {
                    setDeadlineOffset(86400) // default 1 day in seconds
                  } else {
                    setDeadlineOffset(-1)
                  }
                }}
                overlay
                label='Set a deadline'
              />
              <FormHelperText>
                {isRolling && !['once', 'no_repeat'].includes(frequencyType)
                  ? 'Deadline is not available when scheduling from completion date'
                  : 'Task will be considered expired after the due date'}
              </FormHelperText>
            </FormControl> */}

                  {deadlineOffset !== -1 && (
                    <Box
                      sx={{
                        mt: 1,
                        ml: 4,
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <DurationInput
                        value={deadlineOffset}
                        onChange={setDeadlineOffset}
                        size='sm'
                        minValue={0}
                      />
                      <Typography level='body-sm'>
                        {t('choreEdit.afterDueDate')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </EditorSection>
            )}
            <EditorSection
              title={t('choreEdit.privacySettings')}
              icon={LockOutlined}
              section='privacy'
              collapsible
              defaultOpen={isPrivate}
              summary={
                isPrivate
                  ? 'Visible to assigned users'
                  : 'Visible to your circle'
              }
            >
              <Box>
                <RadioGroup
                  name='isPrivate'
                  value={isPrivate}
                  onChange={event => {
                    const newValue =
                      event.target.value === 'true' ? true : false
                    setIsPrivate(newValue)
                    setShowSavePrivacyDefault(true)
                  }}
                  sx={{
                    '& > div': { py: 1 },
                  }}
                >
                  <FormControl>
                    <Radio
                      overlay
                      value={false}
                      disabled={selectedProjectIsPrivate}
                      label={t('choreEdit.public')}
                    />
                    <FormHelperText>
                      {t('taskEditor.visibleToEveryoneInYourCircle')}
                    </FormHelperText>
                  </FormControl>
                  <FormControl>
                    <Radio
                      overlay
                      disabled={
                        selectedProjectIsPrivate ||
                        anyone ||
                        assignableTo.length === 0
                      }
                      value={true}
                      label={t('choreEdit.limited')}
                    />
                    <FormHelperText>
                      {t('taskEditor.visibleToYouAndThePeopleEligible')}
                      {assignees.length === 0
                        ? ' (No assignees selected, Limited option is disabled)'
                        : ''}
                    </FormHelperText>
                  </FormControl>
                </RadioGroup>

                {selectedProjectIsPrivate && (
                  <Typography level='body-sm' color='neutral'>
                    {t('taskEditor.inheritedFromTheProjectTasksInA')}
                  </Typography>
                )}
                {showSavePrivacyDefault && !selectedProjectIsPrivate && (
                  <Box sx={{ mt: 0, display: 'flex', justifyContent: 'start' }}>
                    <Button
                      variant='outlined'
                      size='sm'
                      color='neutral'
                      startDecorator={<Save />}
                      sx={{
                        borderRadius: 6,
                        fontWeight: 500,
                        '&:hover': {
                          background: 'neutral.softHoverBg',
                        },
                      }}
                      onClick={() => {
                        localStorage.setItem(
                          'defaultPrivacySetting',
                          JSON.stringify(isPrivate),
                        )
                        setShowSavePrivacyDefault(false)
                      }}
                    >
                      {t('taskEditor.useAsDefault')}
                    </Button>
                  </Box>
                )}
              </Box>
            </EditorSection>
          </Box>

          {choreId > 0 && (
            <EditorSection
              title={t('taskEditor.taskLog')}
              icon={InfoOutlined}
              section='metadata'
              summary={t('taskEditor.whoCreatedAndLastEditedThisTask')}
              collapsible
            >
              <Sheet
                sx={{
                  p: 2,
                  borderRadius: 'md',
                  boxShadow: 'sm',
                }}
              >
                <Typography level='body1'>
                  {t('choreEdit.createdBy')}{' '}
                  <Chip variant='solid'>
                    {
                      membersData.res.find(f => f.userId === createdBy)
                        ?.displayName
                    }
                  </Chip>{' '}
                  {moment(chore.createdAt).fromNow()}
                </Typography>
                {(chore.updatedAt && updatedBy > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />

                    <Typography level='body1'>
                      {t('choreEdit.updatedBy')}{' '}
                      <Chip variant='solid'>
                        {
                          membersData.res.find(f => f.userId === updatedBy)
                            ?.displayName
                        }
                      </Chip>{' '}
                      {moment(chore.updatedAt).fromNow()}
                    </Typography>
                  </>
                )) || <></>}
              </Sheet>
            </EditorSection>
          )}
        </Box>
        <Sheet
          data-wizard-footer
          variant='outlined'
          sx={{
            position: 'relative',
            flexShrink: 0,
            border: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 2,
            px: 2,
            pb: getSafeBottomPadding(2),
            display: 'flex',
            justifyContent: 'center',
            'z-index': 1000,
            bgcolor: 'background.surface',
            boxShadow: 'none',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: singlePageEditor ? 'none' : 880,
              // Everything stays on a single row, including mobile: the
              // management, back, cancel and save controls shrink rather than
              // wrap, and the save label already has a short xs variant.
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1.5 },
              // The secondary controls absorb the squeeze on narrow screens;
              // save keeps its full padding so the primary action stays the
              // visually dominant target.
              '& [data-footer-management], & [data-footer-back], & [data-footer-cancel]':
                {
                  minWidth: 0,
                  flexShrink: 1,
                },
              '& [data-footer-back], & [data-footer-cancel]': {
                px: { xs: 1, sm: 1.5 },
              },
              '& [data-footer-management] button': {
                px: { xs: 1, sm: 1.5 },
                whiteSpace: 'nowrap',
              },
              '& [data-footer-save]': {
                flexShrink: 0,
              },
              '& [data-footer-save] button': {
                whiteSpace: 'nowrap',
              },
            }}
          >
            {choreId > 0 && (singlePageEditor || wizardStep === 3) && (
              <Box data-footer-management>
                {' '}
                <Dropdown>
                  <ButtonGroup variant='outlined' color='neutral'>
                    <Button
                      onClick={() => {
                        isActive
                          ? archiveChore.mutate(choreId)
                          : unarchiveChore.mutate(choreId)
                      }}
                    >
                      {isActive ? 'Archive' : 'Unarchive'}
                    </Button>
                    <MenuButton
                      aria-label={t('taskEditor.moreTaskActions')}
                      slots={{ root: IconButton }}
                      slotProps={{
                        root: {
                          variant: 'outlined',
                          color: 'neutral',
                        },
                      }}
                    >
                      <ArrowDropDown />
                    </MenuButton>
                  </ButtonGroup>
                  <Menu disablePortal placement='top-end'>
                    <MenuItem color='danger' onClick={handleDelete}>
                      {t('taskEditor.delete')}
                    </MenuItem>
                  </Menu>
                </Dropdown>
              </Box>
            )}
            {!singlePageEditor && wizardStep > 0 && (
              <Button
                data-footer-back
                variant='outlined'
                color='neutral'
                startDecorator={<ArrowBack />}
                onClick={() => changeWizardStep(wizardStep - 1)}
              >
                {t('taskEditor.back')}
              </Button>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }} />
            <Button
              data-footer-cancel
              color='neutral'
              variant='plain'
              onClick={() => {
                Navigate(choreId ? `/chores/${choreId}` : '/chores')
              }}
            >
              {t('taskEditor.cancel')}
              {showKeyboardShortcuts && (
                <KeyboardShortcutHint shortcut='Esc' sx={{ ml: 1 }} />
              )}
            </Button>
            {!singlePageEditor && wizardStep < 3 ? (
              <Button
                endDecorator={<ArrowForward />}
                onClick={() => changeWizardStep(wizardStep + 1)}
              >
                {t('taskEditor.next')}
              </Button>
            ) : (
              <Box data-footer-save>
                <Dropdown>
                  <ButtonGroup variant='solid' color='primary'>
                    <Button
                      loading={
                        updateChoreMutation.isPending ||
                        createChoreMutation.isPending
                      }
                      onClick={() => HandleSaveChore()}
                      sx={{ minWidth: 96 }}
                    >
                      {createAnother ? (
                        <>
                          <Box
                            component='span'
                            sx={{ display: { xs: 'none', sm: 'inline' } }}
                          >
                            {choreId > 0
                              ? 'Save and create another'
                              : 'Create and add another'}
                          </Box>
                          <Box
                            component='span'
                            sx={{ display: { xs: 'inline', sm: 'none' } }}
                          >
                            {choreId > 0 ? 'Save & new' : 'Create & new'}
                          </Box>
                        </>
                      ) : choreId > 0 ? (
                        'Save'
                      ) : (
                        'Create'
                      )}
                      {showKeyboardShortcuts && (
                        <KeyboardShortcutHint shortcut='Enter' sx={{ ml: 1 }} />
                      )}
                    </Button>
                    <MenuButton
                      aria-label={t('taskEditor.moreSaveOptions')}
                      slots={{ root: IconButton }}
                      slotProps={{
                        root: {
                          variant: 'solid',
                          color: 'primary',
                          disabled:
                            updateChoreMutation.isPending ||
                            createChoreMutation.isPending,
                        },
                      }}
                    >
                      <ArrowDropDown />
                    </MenuButton>
                  </ButtonGroup>
                  <Menu disablePortal placement='top-end'>
                    <MenuItem
                      selected={!createAnother}
                      disabled={
                        updateChoreMutation.isPending ||
                        createChoreMutation.isPending
                      }
                      onClick={() => {
                        setCreateAnother(false)
                        HandleSaveChore(false)
                      }}
                    >
                      <Box sx={{ width: 20 }}>
                        {!createAnother && <Check fontSize='small' />}
                      </Box>
                      {choreId > 0 ? 'Save' : 'Create'}
                    </MenuItem>
                    <MenuItem
                      selected={createAnother}
                      disabled={
                        updateChoreMutation.isPending ||
                        createChoreMutation.isPending
                      }
                      onClick={() => {
                        setCreateAnother(true)
                        HandleSaveChore(true)
                      }}
                    >
                      <Box sx={{ width: 20 }}>
                        {createAnother && <Check fontSize='small' />}
                      </Box>
                      {choreId > 0
                        ? 'Save and create another task'
                        : 'Create and add another task'}
                    </MenuItem>
                  </Menu>
                </Dropdown>
              </Box>
            )}
          </Box>
        </Sheet>
      </Sheet>
      <AttachmentViewerModal config={attachmentViewerConfig} />
      <ConfirmationModal config={confirmModelConfig} />
      {addLabelModalOpen && (
        <LabelModal
          isOpen={addLabelModalOpen}
          onSave={label => {
            console.log('label', label)

            const newLabels = [...labelsV2]
            newLabels.push(label)
            setUserLabels([...userLabels, label])

            setLabelsV2([...labelsV2, label])
            setAddLabelModalOpen(false)
          }}
          onClose={() => setAddLabelModalOpen(false)}
        />
      )}
      {/* <ChoreHistory ChoreHistory={choresHistory} UsersData={performers} /> */}
    </WizardContainer>
  )
}

export default function ChoreEditorRoute() {
  const location = useLocation()
  return <ChoreEdit key={location.key} />
}
