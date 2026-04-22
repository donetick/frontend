import { Add, ArrowDropDown, HorizontalRule, Save } from '@mui/icons-material'
import {
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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DurationInput from '../../components/common/DurationInput'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import NotificationTemplate from '../../components/NotificationTemplate.jsx'
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
import { GetAllCircleMembers, GetThings } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import Priorities from '../../utils/Priorities.jsx'
import { getIconComponent } from '../../utils/ProjectIcons'
import { getSafeBottomPadding } from '../../utils/SafeAreaUtils.js'
import { useProjectFilter } from '../Chores/hooks/useProjectFilter.js'
import LoadingComponent from '../components/Loading.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import SubTasks from '../components/SubTask.jsx'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import LabelModal from '../Modals/Inputs/LabelModal'
import { useProjects } from '../Projects/ProjectQueries'
import RepeatSection from './RepeatSection'

const ASSIGN_STRATEGIES = [
  'random',
  'least_assigned',
  'least_completed',
  'keep_last_assigned',
  'random_except_last_assigned',
  'round_robin',
  'no_assignee',
]
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']

const NO_DUE_DATE_REQUIRED_TYPE = ['no_repeat', 'once']
const NO_DUE_DATE_ALLOWED_TYPE = ['trigger']
const ChoreEdit = () => {
  const { t } = useTranslation(['chores', 'common'])
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile()

  const [chore, setChore] = useState([])
  const [choresHistory, setChoresHistory] = useState([])
  const [userHistory, setUserHistory] = useState({})
  const { choreId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const [assignees, setAssignees] = useState([])
  const [performers, setPerformers] = useState([])
  const [assignStrategy, setAssignStrategy] = useState(ASSIGN_STRATEGIES[2])
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
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false)
  const [showSavePrivacyDefault, setShowSavePrivacyDefault] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [showSaveNotificationDefault, setShowSaveNotificationDefault] =
    useState(false)
  const [showSaveAssigneeDefault, setShowSaveAssigneeDefault] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const { data: userLabelsRaw, isLoading: isUserLabelsLoading } = useLabels()
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects()

  const { selectedProject, projectsWithDefault, setSelectedProjectWithCache } =
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
    isLoading: isChoreLoading,
    refetch: refetchChore,
  } = useChore(choreId)
  const { data: membersData, isLoading: isMemberDataLoading } =
    useCircleMembers()
  const { showSuccess, showError } = useNotification()

  const [userLabels, setUserLabels] = useState([])

  useEffect(() => {
    if (userLabelsRaw) {
      setUserLabels(userLabelsRaw)
    }
  }, [userLabelsRaw])

  const Navigate = useNavigate()

  const HandleValidateChore = () => {
    const errors = {}

    if (name.trim() === '') {
      errors.name = t('chores:edit.validation.nameRequired')
    }
    if (assignStrategy !== 'no_assignee') {
      if (assignees.length === 0) {
        errors.assignees = t('chores:edit.validation.assigneesRequired')
      }
      if (assignedTo === null || assignedTo < 0) {
        errors.assignedTo = t('chores:edit.validation.assignedToRequired')
      }
    }
    if (frequencyType === 'interval' && !frequency > 0) {
      errors.frequency = t('chores:edit.validation.invalidFrequency', {
        unit: frequencyMetadata.unit,
      })
    }
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata['days']?.length === 0
    ) {
      errors.frequency = t('chores:edit.validation.selectDayOfWeek')
    }

    // Validate advanced scheduling patterns
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata?.weekPattern === 'week_of_month' &&
      (!frequencyMetadata?.occurrences ||
        frequencyMetadata.occurrences.length === 0)
    ) {
      errors.frequency = t('chores:edit.validation.selectDayOccurrence')
    }
    if (
      frequencyType === 'day_of_the_month' &&
      frequencyMetadata['months']?.length === 0
    ) {
      errors.frequency = t('chores:edit.validation.selectMonth')
    }
    if (
      dueDate === null &&
      !NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) &&
      !NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)
    ) {
      if (REPEAT_ON_TYPE.includes(frequencyType)) {
        console.log('VALIDATION:', dueDate, frequencyType)

        errors.dueDate = t('chores:edit.validation.startDateRequired')
      } else {
        errors.dueDate = t('chores:edit.validation.dueDateRequired')
      }
    }
    if (frequencyType === 'trigger') {
      if (!isThingValid) {
        errors.thingTrigger = t('chores:edit.validation.thingTriggerInvalid')
      }
    }

    // if there is any error then return false:
    setErrors(errors)
    if (Object.keys(errors).length > 0) {
      // generate a list with error and set it in snackbar:

      const errorList = Object.keys(errors).map(key => (
        <ListItem key={key}>{errors[key]}</ListItem>
      ))
      showError({
        title: t('chores:edit.validation.resolveErrors'),
        message: <List>{errorList}</List>,
      })
      return false
    }

    return true
  }

  const handleDueDateChange = e => {
    const dateValue = e.target.value // YYYY-MM-DD format
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
  const HandleSaveChore = () => {
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
    const chore = {
      id: Number(newChoreId),
      name: name,
      description: description,
      assignees: assignees,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      frequencyType: frequencyType,
      frequency: Number(frequency),
      frequencyMetadata: frequencyMetadata,
      assignedTo: assignStrategy === 'no_assignee' ? null : assignedTo,
      assignStrategy: assignStrategy,
      isRolling: isRolling,
      isActive: isActive,
      notification: isNotificable,
      labels: labels.map(l => l.name),
      labelsV2: labelsV2,
      subTasks: subTasks,
      notificationMetadata: notificationMetadata,
      thingTrigger: thingTrigger,
      points: points < 0 ? null : points,
      requireApproval: requireApproval,
      isPrivate: isPrivate,
      completionWindow:
        // if completionWindow is -1 then set it to null or dueDate is null
        completionWindow < 0 || dueDate === null ? null : completionWindow,
      deadlineOffset: deadlineOffset < 0 ? null : deadlineOffset,
      priority: priority,
      projectId: projectId === 'default' ? null : projectId,
    }
    let SaveFunction = createChoreMutation.mutateAsync
    if (newChoreId > 0) {
      SaveFunction = updateChoreMutation.mutateAsync
    }

    SaveFunction(chore)
      .then(() => {
        showSuccess({
          title: t('chores:edit.saveSuccessTitle'),
          message: t('chores:edit.saveSuccessMessage'),
        })
        Navigate('/chores')
      })
      .catch(error => {
        console.error('Failed to save chore:', error)
        showError({
          title: t('chores:edit.saveFailedTitle'),
          message: t('chores:edit.saveFailedMessage'),
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

      const defaultAssigneeSetting = localStorage.getItem(
        'defaultAssigneeSetting',
      )
      if (defaultAssigneeSetting !== null) {
        const savedAssignees = JSON.parse(defaultAssigneeSetting)
        setAssignees(savedAssignees)
      }
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = event => {
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
        window.history.back()
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
  }, [HandleSaveChore])

  useEffect(() => {
    if (isChoreLoading === false && choreData && choreId) {
      const data = choreData
      const isCloneMode = searchParams.get('clone') === 'true'

      setChore(data.res)
      setName(data.res.name ? data.res.name : '')
      setDescription(data.res.description ? data.res.description : '')
      setAssignees(data.res.assignees ? data.res.assignees : [])
      setAssignedTo(data.res.assignedTo)
      setFrequencyType(data.res.frequencyType ? data.res.frequencyType : 'once')

      setFrequencyMetadata(data.res.frequencyMetadata)
      setFrequency(data.res.frequency)

      setNotificationMetadata(data.res.notificationMetadata)
      setPoints(data.res.points && data.res.points > -1 ? data.res.points : -1)
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
          : ASSIGN_STRATEGIES[2],
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
        setDueDate(dueDateMoment.format('YYYY-MM-DDTHH:mm:00'))

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
  }, [frequencyType])

  useEffect(() => {
    if (assignees.length === 0) {
      setAssignStrategy('no_assignee')
      setAssignedTo(null)
    } else if (assignees.length === 1) {
      setAssignedTo(assignees[0].userId)
      if (assignStrategy === 'no_assignee') {
        setAssignStrategy(ASSIGN_STRATEGIES[2]) // default to least_completed
      }
    }
  }, [assignees, assignStrategy])

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
  }, [assignees, name, frequencyMetadata, attemptToSave, dueDate])

  const handleDelete = () => {
    setConfirmModelConfig({
      isOpen: true,
      title: t('chores:edit.deleteTitle'),
      confirmText: t('common:actions.delete'),
      cancelText: t('common:actions.cancel'),
      message: t('chores:edit.deleteMessage'),
      onClose: isConfirmed => {
        if (isConfirmed === true) {
          deleteChores.mutate([choreId], {
            onSuccess: () => {
              Navigate('/chores')
            },
            onError: error => {
              showError({
                title: t('chores:edit.deleteFailedTitle'),
                message: `Failed to delete chore: ${error.message}`,
              })
            },
          })
        }
        setConfirmModelConfig({})
      },
    })
  }
  if (
    (isChoreLoading && choreId) ||
    isUserLabelsLoading ||
    isUserProfileLoading ||
    isMemberDataLoading ||
    isProjectsLoading
  ) {
    return <LoadingComponent />
  }
  return (
    <Container maxWidth='md'>
      {/* Section 1: Basic Information */}
      <Box mb={4}>
        {/* <Typography
          level='h4'
          mb={2}
          sx={{ borderBottom: '2px solid', borderColor: 'primary.main', pb: 1 }}
        >
          Basic Information
        </Typography> */}

        <Box mb={3}>
          <FormControl error={errors.name}>
            <Typography level='h4'>{t('common:labels.name')}</Typography>
            <Typography level='body-md'>{t('chores:edit.nameQuestion')}</Typography>
            <Input value={name} onChange={e => setName(e.target.value)} />
            <FormHelperText error>{errors.name}</FormHelperText>
          </FormControl>
        </Box>

        <Box mb={3}>
          <FormControl error={errors.description}>
            <Typography level='h4'>{t('common:labels.description')}</Typography>
            <Typography level='body-md'>{t('chores:edit.descriptionQuestion')}</Typography>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              entityId={choreId}
              entityType={'chore_description'}
            />
            <FormHelperText error>{errors.description}</FormHelperText>
          </FormControl>
        </Box>

        <Box mb={3}>
          <Typography level='h4'>{t('common:labels.priority')}</Typography>
          <Typography level='body-md'>{t('chores:edit.priorityQuestion')}</Typography>

          {/* Priority Chip Selection */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              mt: 2,
            }}
          >
            {/* Priority Chips P1-P4 */}
            {Priorities.map(priorityItem => (
              <Chip
                key={priorityItem.value}
                variant={priority === priorityItem.value ? 'solid' : 'outlined'}
                color={
                  priority === priorityItem.value
                    ? priorityItem.color || 'primary'
                    : 'neutral'
                }
                size='lg'
                onClick={() => setPriority(priorityItem.value)}
                startDecorator={priorityItem.icon}
                sx={{
                  fontWeight: 'md',
                  cursor: 'pointer',
                  minHeight: 34,
                }}
              >
                {priorityItem.name}
              </Chip>
            ))}
            {/* No Priority Chip */}
            <Chip
              variant={priority === 0 ? 'solid' : 'outlined'}
              color='neutral'
              size='lg'
              onClick={() => setPriority(0)}
              startDecorator={<HorizontalRule />}
              sx={{
                fontWeight: 'md',
                cursor: 'pointer',
                minHeight: 34,
              }}
            >
              {t('chores:labels.noPriority')}
            </Chip>
          </Box>
        </Box>

        {/* Project Selection - Show only if there are multiple projects */}
        {projects.length >= 1 && (
          <Box mb={3}>
            <Typography level='h4'>{t('common:labels.project')}</Typography>
            <Typography level='body-md'>{t('chores:edit.projectQuestion')}</Typography>
            <Select
              value={projectId}
              onChange={(event, newValue) => setProjectId(newValue)}
              defaultValue='default'
              sx={{ minWidth: '15rem' }}
            >
              {/*               id: 'default',
              name: 'Default Project',
              color: LABEL_COLORS[0].value,
              icon: 'FolderOpen',
               */}
              <Option key='default' value='default'>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    size='sm'
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: '#1976d2',
                    }}
                  >
                    {(() => {
                      const IconComponent = getIconComponent('FolderOpen')
                      return (
                        <IconComponent
                          sx={{
                            fontSize: 14,
                            color: getTextColorFromBackgroundColor('#1976d2'),
                          }}
                        />
                      )
                    })()}
                  </Avatar>
                  {t('common:labels.defaultProject')}
                </Box>
              </Option>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          const IconComponent = getIconComponent(project.icon)
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

        <Box mb={3}>
          <Typography level='h4'>{t('common:labels.labelsLabel')}</Typography>
          <Typography level='body-md'>{t('chores:edit.labelsQuestion')}</Typography>
          <Select
            multiple
            onChange={(event, newValue) => {
              setLabelsV2(userLabels.filter(l => newValue.indexOf(l.name) > -1))
            }}
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
            sx={{ minWidth: '15rem' }}
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
              {t('chores:edit.addNewLabel')}
            </MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography level='h4'>{t('common:labels.subtasks')}</Typography>
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
      </Box>

      {/* Section 2: Assignment & Responsibility */}
      <Box mb={4}>
        <Box mb={3}>
          <Typography level='h4'>{t('common:labels.assignees')}</Typography>
          <Typography level='body-md'>{t('chores:edit.whoCanDoTask')}</Typography>
          <Card>
            <List
              orientation='horizontal'
              wrap
              sx={{
                '--List-gap': '8px',
                '--ListItem-radius': '20px',
              }}
            >
              {/* add one for Anyone if no specific assignee is selected */}

              <ListItem key={'anyone'}>
                <Checkbox
                  checked={assignees.length === 0}
                  onClick={() => {
                    setAssignees([])
                    setIsPrivate(false)
                  }}
                  overlay
                  disableIcon
                  variant='soft'
                  label={t('common:status.anyone')}
                />
              </ListItem>

              {performers?.map((item, index) => (
                <ListItem key={item.id}>
                  <Checkbox
                    checked={
                      assignees.find(a => a.userId == item.userId) != null
                    }
                    onClick={() => {
                      if (assignees.some(a => a.userId === item.userId)) {
                        const newAssignees = assignees.filter(
                          a => a.userId !== item.userId,
                        )
                        setAssignees(newAssignees)
                      } else {
                        setAssignees([...assignees, { userId: item.userId }])
                      }
                      setShowSaveAssigneeDefault(true)
                    }}
                    overlay
                    disableIcon
                    variant='soft'
                    label={item.displayName}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
          <FormControl error={Boolean(errors.assignee)}>
            <FormHelperText error>{Boolean(errors.assignee)}</FormHelperText>
          </FormControl>

          {showSaveAssigneeDefault && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'start' }}>
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
                    'defaultAssigneeSetting',
                    JSON.stringify(assignees),
                  )
                  setShowSaveAssigneeDefault(false)
                }}
              >
                {t('common:actions.rememberForFutureTasks')}
              </Button>
            </Box>
          )}
        </Box>

        {assignees.length > 1 && (
          <>
            <Box mb={3}>
              <Typography level='h4'>{t('chores:edit.whoIsAssignedNext')}</Typography>
              <Typography level='body-md'>{t('chores:edit.whoIsAssignedNext')}</Typography>
              <Select
                placeholder={
                  assignees.length === 0
                    ? t('chores:edit.noAssigneesAvailable')
                    : t('chores:edit.selectAssignee')
                }
                disabled={assignees.length === 0}
                value={assignedTo > -1 ? assignedTo : null}
              >
                {performers
                  ?.filter(p => assignees.find(a => a.userId == p.userId))
                  .map((item, index) => (
                    <Option
                      value={item.userId}
                      key={item.displayName}
                      onClick={() => {
                        setAssignedTo(item.userId)
                      }}
                    >
                      {item.displayName}
                    </Option>
                  ))}
              </Select>
            </Box>

            <Box>
              <Typography level='h4'>{t('common:labels.assignmentStrategy')}</Typography>
              <Typography level='body-md'>{t('chores:edit.assignmentStrategyQuestion')}</Typography>
              <Card>
                <List
                  orientation='horizontal'
                  wrap
                  sx={{
                    '--List-gap': '8px',
                    '--ListItem-radius': '20px',
                  }}
                >
                  {ASSIGN_STRATEGIES.map((item, idx) => (
                    <ListItem key={item}>
                      <Checkbox
                        checked={assignStrategy === item}
                        onClick={() => setAssignStrategy(item)}
                        overlay
                        disableIcon
                        variant='soft'
                        label={t(`chores:edit.assignStrategies.${item}`)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Card>
            </Box>
          </>
        )}
      </Box>

      {/* Section 3: Schedule & Timing */}
      <Box mb={4}>
        <RepeatSection
          frequency={frequency}
          onFrequencyUpdate={setFrequency}
          frequencyType={frequencyType}
          onFrequencyTypeUpdate={setFrequencyType}
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

        <Box mt={3} mb={3}>
          <Typography level='h4'>
            {REPEAT_ON_TYPE.includes(frequencyType)
              ? t('common:labels.startDate')
              : t('common:labels.dueDate')}
          </Typography>
          {frequencyType === 'trigger' && !dueDate && (
            <Typography level='body-sm'>
              {t('chores:edit.triggerDueDateHint')}
            </Typography>
          )}

          {NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) && (
            <FormControl sx={{ mt: 1 }}>
              <Checkbox
                onChange={e => {
                  if (e.target.checked) {
                    const today = moment(new Date()).format('YYYY-MM-DD')
                    setDueDateOnly(today)
                    setDueDate(
                      moment(today).endOf('day').format('YYYY-MM-DDTHH:mm:59'),
                    )
                    setUseCustomTime(false)
                    setDueTime(null)
                  } else {
                    setDueDate(null)
                    setDueDateOnly(null)
                    setUseCustomTime(false)
                    setDueTime(null)
                  }
                }}
                defaultChecked={dueDate !== null}
                checked={dueDate !== null}
                overlay
                label={t('chores:edit.giveTaskDueDate')}
              />
              <FormHelperText>
                {t('chores:edit.dueDateHelper')}
              </FormHelperText>
            </FormControl>
          )}
          {dueDate && (
            <>
              <FormControl error={Boolean(errors.dueDate)} sx={{ mt: 2 }}>
                <Typography level='body-md'>
                  {REPEAT_ON_TYPE.includes(frequencyType)
                    ? t('chores:edit.startDateQuestion')
                    : t('chores:edit.nextDueQuestion')}
                </Typography>
                <Input
                  type='date'
                  value={dueDateOnly || ''}
                  onChange={handleDueDateChange}
                />
                <FormHelperText>{errors.dueDate}</FormHelperText>
              </FormControl>

              {/* Optional time picker */}
              <FormControl sx={{ mt: 2 }}>
                <Checkbox
                  checked={useCustomTime}
                  onChange={e => handleUseCustomTimeChange(e.target.checked)}
                  overlay
                  label={t('chores:edit.setSpecificTime')}
                />
                <FormHelperText>
                  {useCustomTime
                    ? t('chores:edit.specificTimeHelper')
                    : t('chores:edit.endOfDayHelper')}
                </FormHelperText>
              </FormControl>

              {useCustomTime && (
                <Box sx={{ mt: 2, ml: 4 }}>
                  <Typography level='body-sm' mb={1}>
                    {t('common:labels.time')}:
                  </Typography>
                  <Input
                    type='time'
                    value={dueTime || '18:00'}
                    onChange={handleDueTimeChange}
                    sx={{ maxWidth: 200 }}
                  />
                </Box>
              )}
            </>
          )}
        </Box>

        {dueDate && (
          <Box mb={3}>
            <Typography level='h4'>{t('common:labels.taskWindow')}</Typography>
            <Typography level='body-md'>{t('chores:edit.taskWindowDescription')}</Typography>

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
                label={t('chores:edit.setEarliestCompletionTime')}
              />
              <FormHelperText>
                {t('chores:edit.completionWindowHelper')}
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
                  <Typography level='body-sm'>{t('common:labels.hours')}:</Typography>
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
                    placeholder={t('common:placeholders.hours')}
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
                <Typography level='body-sm'>{t('chores:edit.afterDueDate')}</Typography>
              </Box>
            )}
          </Box>
        )}

        {!['once', 'no_repeat'].includes(frequencyType) && (
          <Box>
            <Typography level='h4'>{t('chores:edit.schedulingPreferences')}</Typography>
            <Typography level='body-md'>{t('chores:edit.schedulingPreferencesQuestion')}</Typography>
            <RadioGroup name='tiers' sx={{ gap: 1, '& > div': { p: 1 } }}>
              <FormControl>
                <Radio
                  overlay
                  checked={!isRolling}
                  onClick={() => setIsRolling(false)}
                  label={t('chores:edit.rescheduleFromDueDate')}
                />
                <FormHelperText>
                  {t('chores:edit.rescheduleFromDueDateHelper')}
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
                  label={t('chores:edit.rescheduleFromCompletionDate')}
                />
                <FormHelperText>
                  {t('chores:edit.rescheduleFromCompletionDateHelper')}
                </FormHelperText>
              </FormControl>
            </RadioGroup>
          </Box>
        )}
        {/* Section 3.1: Notifications */}

        <Box mb={3}>
          <Typography level='h4'>{t('common:labels.notifications')}</Typography>
          {!isPlusAccount(userProfile) && (
            <Typography level='body-sm' color='warning' sx={{ mb: 1 }}>
              {t('chores:edit.notificationsBasicPlan')}
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
              disabled={!isPlusAccount(userProfile)}
              overlay
              label={t('chores:edit.notifyForTask')}
            />
            <FormHelperText
              sx={{
                opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
              }}
            >
              {t('chores:edit.notifyForTaskHelper')}
            </FormHelperText>
          </FormControl>
        </Box>

        {isNotificable && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Card variant='outlined'>
              <Typography level='h4' mb={2}>
                {t('chores:edit.notificationSchedule')}
              </Typography>
              <Box sx={{ p: 0.5 }}>
                <NotificationTemplate
                  onChange={metadata => {
                    const newTemplates = metadata.notifications
                    if (notificationMetadata?.templates !== newTemplates) {
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
                {t('chores:edit.whoToNotify')}
              </Typography>
              <FormControl>
                <Checkbox
                  overlay
                  disabled={true}
                  checked={true}
                  label={t('common:labels.allAssignees')}
                />
                <FormHelperText>{t('chores:edit.notifyAllAssignees')}</FormHelperText>
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
                  label={t('common:labels.specificGroup')}
                />
                <FormHelperText>{t('chores:edit.notifySpecificGroup')}</FormHelperText>
              </FormControl>

              {notificationMetadata?.circleGroup && (
                <Box
                  sx={{
                    mt: 0,
                    ml: 4,
                  }}
                >
                  <Typography level='body-sm'>{t('common:labels.telegramGroupId')}:</Typography>
                  <Input
                    type='number'
                    value={notificationMetadata?.circleGroupID}
                    placeholder={t('common:placeholders.telegramGroupId')}
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
      </Box>

      {/* Section 4: Task Settings */}
      <Box mb={4}>
        <Typography
          level='h3'
          mb={2}
          sx={{
            borderColor: 'primary.main',
            pb: 1,
          }}
        >
          {t('chores:edit.taskSettings')}
        </Typography>

        <Box mb={3}>
          <Typography level='h4'>{t('common:labels.pointsLabel')}</Typography>
          <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                if (e.target.checked) {
                  setPoints(1)
                } else {
                  setPoints(-1)
                }
              }}
              checked={points > -1}
              overlay
              label={t('chores:edit.assignPoints')}
            />
            <FormHelperText>
              {t('chores:edit.pointsHelper')}
            </FormHelperText>
          </FormControl>
          {points != -1 && (
            <Card variant='outlined' sx={{ mt: 2 }}>
              <Box
                sx={{
                  mt: 0,
                  ml: 4,
                }}
              >
                <Typography level='body-sm'>{t('common:labels.pointsLabel')}:</Typography>
                <Input
                  type='number'
                  value={points}
                  sx={{ maxWidth: 100 }}
                  slotProps={{
                    input: {
                      min: 0,
                      max: 1000,
                    },
                  }}
                  placeholder={t('common:labels.pointsLabel')}
                  onChange={e => {
                    setPoints(parseInt(e.target.value))
                  }}
                />
              </Box>
            </Card>
          )}
        </Box>

        <Box mb={3}>
          <Typography level='h4'>{t('chores:edit.approvalRequirement')}</Typography>
          <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                setRequireApproval(e.target.checked)
              }}
              checked={requireApproval}
              overlay
              label={t('chores:edit.requireAdminApproval')}
            />
            <FormHelperText>
              {t('chores:edit.requireAdminApprovalHelper')}
            </FormHelperText>
          </FormControl>
        </Box>

        <Box>
          <Typography level='h4'>{t('common:labels.privacySettings')}</Typography>
          <Typography level='body-md'>{t('chores:edit.privacyQuestion')}</Typography>
          <RadioGroup
            name='isPrivate'
            value={isPrivate}
            onChange={event => {
              const newValue = event.target.value === 'true' ? true : false
              setIsPrivate(newValue)
              setShowSavePrivacyDefault(true)
            }}
            sx={{
              '& > div': { py: 1 },
            }}
          >
            <FormControl>
              <Radio overlay value={false} label={t('common:labels.public')} />
              <FormHelperText>{t('chores:edit.privacyPublicHelper')}</FormHelperText>
            </FormControl>
            <FormControl>
              <Radio
                overlay
                disabled={assignees.length === 0}
                value={true}
                label={t('common:labels.limited')}
              />
              <FormHelperText>
                {t('chores:edit.privacyLimitedHelper')}
                {assignees.length === 0
                  ? ` (${t('chores:edit.privacyLimitedDisabled')})`
                  : ''}
              </FormHelperText>
            </FormControl>
          </RadioGroup>

          {showSavePrivacyDefault && (
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
                {t('common:actions.rememberForFutureTasks')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {choreId > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 3 }}>
          <Sheet
            sx={{
              p: 2,
              borderRadius: 'md',
              boxShadow: 'sm',
            }}
          >
            <Typography level='body1'>
              {t('chores:edit.createdBy')}{' '}
              <Chip variant='solid'>
                {membersData.res.find(f => f.userId === createdBy)?.displayName}
              </Chip>{' '}
              {moment(chore.createdAt).fromNow()}
            </Typography>
            {(chore.updatedAt && updatedBy > 0 && (
              <>
                <Divider sx={{ my: 1 }} />

                <Typography level='body1'>
                  {t('chores:edit.updatedBy')}{' '}
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
        </Box>
      )}

      <Divider sx={{ mb: 9 }} />

      {/* <Box mt={2} alignSelf={'flex-start'} display='flex' gap={2}>
        <Button onClick={SaveChore}>Save</Button>
      </Box> */}
      <Sheet
        variant='outlined'
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2, // padding
          paddingBottom: getSafeBottomPadding(2), // safe area padding for iOS
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
          bgcolor: 'background.body',
          boxShadow: 'md', // Add a subtle shadow
        }}
      >
        {choreId > 0 && (
          <Dropdown>
            <ButtonGroup
              variant='outlined'
              color={isActive ? 'danger' : 'neutral'}
            >
              <Button
                onClick={() => {
                  isActive
                    ? archiveChore.mutate(choreId)
                    : unarchiveChore.mutate(choreId)
                }}
              >
                {isActive
                  ? t('common:actions.archive')
                  : t('common:actions.unarchive')}
              </Button>
              <MenuButton
                slots={{ root: IconButton }}
                slotProps={{
                  root: {
                    variant: 'outlined',
                    color: isActive ? 'danger' : 'neutral',
                  },
                }}
              >
                <ArrowDropDown />
              </MenuButton>
            </ButtonGroup>
            <Menu placement='top-end'>
              <MenuItem color='danger' onClick={handleDelete}>
                {t('common:actions.delete')}
              </MenuItem>
            </Menu>
          </Dropdown>
        )}
        <Button
          color='neutral'
          variant='outlined'
          onClick={() => {
            window.history.back()
          }}
        >
          {t('common:actions.cancel')}
          {showKeyboardShortcuts && (
            <KeyboardShortcutHint shortcut='Esc' sx={{ ml: 1 }} />
          )}
        </Button>
        <Button color='primary' variant='solid' onClick={HandleSaveChore}>
          {choreId > 0 ? t('common:actions.save') : t('common:actions.create')}
          {showKeyboardShortcuts && (
            <KeyboardShortcutHint shortcut='Enter' sx={{ ml: 1 }} />
          )}
        </Button>
      </Sheet>
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
    </Container>
  )
}

export default ChoreEdit
