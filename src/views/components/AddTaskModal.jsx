import { Add } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import * as chrono from 'chrono-node'
import moment from 'moment'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useCreateChore } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { isPlusAccount } from '../../utils/Helpers'
import { useLabels } from '../Labels/LabelQueries'
import { useProjects } from '../Projects/ProjectQueries'
import {
  parseAssignees,
  parseDueDate,
  parseLabels,
  parsePoints,
  parsePriority,
  parseRepeatV2,
} from './CustomParsers'
import SmartTaskTitleInput from './SmartTaskTitleInput'

import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import { TASK_COLOR } from '../../utils/Colors'
import AssigneePickerField from './AssigneePickerField'
import AttachmentPickerField from './AttachmentPickerField'
import DueDatePickerField from './DueDatePickerField'
import LabelsPickerField from './LabelsPickerField'
import LearnMoreButton from './LearnMore'
import NotificationPickerField from './NotificationPickerField'
import PriorityPickerField from './PriorityPickerField'
import RepeatPickerField from './RepeatPickerField'
import RichTextEditor from './RichTextEditor'
import SubTasks from './SubTask'
const getDefaultNotification = () => {
  const storedDefault = localStorage.getItem('defaultNotificationTemplate')
  if (storedDefault) {
    return JSON.parse(storedDefault)
  }
  const defaultNotification = [
    { value: 1, unit: 'days', type: 'before' },
    { value: 0, unit: 'minutes', type: 'ondue' },
    { value: 1, unit: 'days', type: 'after' },
  ]

  localStorage.setItem(
    'defaultNotification',
    JSON.stringify(defaultNotification),
  )
  return defaultNotification
}

const TaskInput = ({ autoFocus, onChoreUpdate, isModalOpen, onClose }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const pickerEmptyDisplay = isMobile ? 'icon' : 'icon-text'
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: circleMembers, isLoading: isCircleMembersLoading } =
    useCircleMembers()
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects()
  const createChoreMutation = useCreateChore()

  const { data: userProfile } = useUserProfile()

  // Get initial project from localStorage (current active project)
  const getInitialProject = () => {
    const saved = localStorage.getItem('selectedProject')
    if (saved) {
      try {
        const project = JSON.parse(saved)
        return project?.id || 'default'
      } catch {
        return 'default'
      }
    }
    return 'default'
  }

  const [taskText, setTaskText] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [renderedParts, setRenderedParts] = useState([])

  const textareaRef = useRef(null)
  const mainInputRef = useRef(null)
  const richTextEditorRef = useRef(null)
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState(null)
  const [description, setDescription] = useState(null)
  const [assignees, setAssignees] = useState([])
  const [labelsV2, setLabelsV2] = useState([])
  const [frequency, setFrequency] = useState(null)
  const [notificationMetadata, setNotificationMetadata] = useState({
    templates: getDefaultNotification(),
  })
  const [frequencyHumanReadable, setFrequencyHumanReadable] = useState(null)
  const [subTasks, setSubTasks] = useState(null)
  const [points, setPoints] = useState(-1)
  const [isAnyoneTask, setIsAnyoneTask] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const [hasSubTasks, setHasSubTasks] = useState(false)
  const [hasDeadline, setHasDeadline] = useState(false)
  const [deadlineOffset, setDeadlineOffset] = useState(-1)
  const [dueDateOnly, setDueDateOnly] = useState(null)
  const [dueTime, setDueTime] = useState(null)
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [projectId, setProjectId] = useState(getInitialProject())
  const [attachments, setAttachments] = useState([])

  // Priority colors
  const priorityColors = {
    0: TASK_COLOR.NO_PRIORITY,
    1: TASK_COLOR.PRIORITY_1,
    2: TASK_COLOR.PRIORITY_2,
    3: TASK_COLOR.PRIORITY_3,
    4: TASK_COLOR.PRIORITY_4,
  }

  const priorityLabels = {
    0: '--',
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4',
  }

  // set showKeyboardShortcuts true as soon as the user hold ctrl or cmd key:
  useEffect(() => {
    if (hasDescription && richTextEditorRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        richTextEditorRef.current.focus()
      }, 100)
    }
  }, [hasDescription])

  // set showKeyboardShortcuts true as soon as the user hold ctrl or cmd key:
  useEffect(() => {
    const handleKeyDown = event => {
      const isHoldingCmd = event.ctrlKey || event.metaKey
      if (isHoldingCmd) {
        // event.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      if (
        isHoldingCmd &&
        event.key.toLowerCase() === 'e' &&
        isModalOpen &&
        !hasDescription
      ) {
        setHasDescription(true)
        setShowKeyboardShortcuts(false)
      }
      if (isHoldingCmd && event.key.toLowerCase() === 'j' && isModalOpen) {
        // add subtask:
        setHasSubTasks(true)
        setShowKeyboardShortcuts(false)
        // set focus on the first subtask input:
      }
      if (
        isHoldingCmd &&
        event.key.toLowerCase() === 'b' &&
        isModalOpen &&
        !dueDate
      ) {
        // add due date:
        const tomorrow = moment().add(1, 'day')
        setDueDateOnly(tomorrow.format('YYYY-MM-DD'))
        setDueDate(tomorrow.endOf('day').format('YYYY-MM-DDTHH:mm:59'))
        setUseCustomTime(false)
        setDueTime(null)
        setShowKeyboardShortcuts(false)
      }
      // Enter key to create task
      if (
        event.key === 'Enter' &&
        (event.ctrlKey || event.metaKey) &&
        isModalOpen
      ) {
        event.preventDefault()
        createChore()
        return
      }
      // Escape key to cancel/close modal
      if (event.key === 'Escape' && isModalOpen) {
        event.preventDefault()
        handleCloseModal()
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
  }, [])

  useEffect(() => {
    if (isModalOpen && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value?.length
      textareaRef.current.selectionEnd = textareaRef.current.value?.length
    }
  }, [isModalOpen])

  useEffect(() => {
    if (autoFocus > 0 && mainInputRef.current) {
      mainInputRef.current.focus()
      mainInputRef.current.selectionStart = mainInputRef.current.value?.length
      mainInputRef.current.selectionEnd = mainInputRef.current.value?.length
    }
  }, [autoFocus])

  const renderHighlightedSentence = useCallback(
    (
      sentence,
      repeatHighlight,
      priorityHighlight,
      labelsHighlight,
      dueDateHighlight,
      pointsHighlight,
      assigneesHighlight,
    ) => {
      const parts = []
      let lastIndex = 0
      let plainText = ''

      // Combine all highlight ranges and sort them by their start index
      const allHighlights = []
      if (repeatHighlight) {
        repeatHighlight.forEach(h =>
          allHighlights.push({ ...h, type: 'repeat', priority: 60 }),
        )
      }
      if (priorityHighlight) {
        priorityHighlight.forEach(h =>
          allHighlights.push({ ...h, type: 'priority', priority: 50 }),
        )
      }
      if (pointsHighlight) {
        pointsHighlight.forEach(h =>
          allHighlights.push({ ...h, type: 'points', priority: 45 }),
        )
      }
      if (assigneesHighlight) {
        assigneesHighlight.forEach(h =>
          allHighlights.push({ ...h, type: 'assignee', priority: 40 }),
        )
      }
      if (labelsHighlight) {
        labelsHighlight.forEach(h =>
          allHighlights.push({ ...h, type: 'label', priority: 30 }),
        )
      }
      if (dueDateHighlight) {
        allHighlights.push({
          ...dueDateHighlight,
          type: 'dueDate',
          priority: 20,
        })
      }

      allHighlights.sort((a, b) => a.start - b.start)
      const resolvedHighlights = []
      for (let i = 0; i < allHighlights.length; i++) {
        const current = allHighlights[i]
        const previous = resolvedHighlights[resolvedHighlights.length - 1]

        if (previous && current.start < previous.end) {
          if (current.priority > previous.priority) {
            resolvedHighlights.pop()
            resolvedHighlights.push(current)
          }
        } else {
          resolvedHighlights.push(current)
        }
      }

      for (const highlight of resolvedHighlights) {
        if (highlight.start > lastIndex) {
          const textBefore = sentence.substring(lastIndex, highlight.start)
          parts.push(textBefore)
          plainText += textBefore
        }

        let className = ''
        switch (highlight.type) {
          case 'repeat':
            className = 'highlight-repeat'
            break
          case 'priority':
            className = 'highlight-priority'
            break
          case 'points':
            className = 'highlight-points'
            break
          case 'assignee':
            className = 'highlight-assignee'
            break
          case 'label':
            className = 'highlight-label'
            break
          case 'dueDate':
            className = 'highlight-date'
            break
          default:
            break
        }

        const highlightedText = sentence.substring(
          highlight.start,
          highlight.end,
        )
        parts.push(
          <span
            key={highlight.start}
            className={className}
            style={{
              textDecoration: 'underline',
              textDecorationThickness: '2px',
              textDecorationStyle: 'dashed',
            }}
          >
            {highlightedText}
          </span>,
        )

        lastIndex = highlight.end
      }

      if (lastIndex < sentence.length) {
        const remainingText = sentence.substring(lastIndex)
        parts.push(remainingText)
        plainText += remainingText
      }

      return {
        parts,
        plainText,
      }
    },
    [],
  )

  const processText = useCallback(
    sentence => {
      const priority = parsePriority(sentence)
      const pointsParsed = parsePoints(sentence)
      const labels = parseLabels(sentence, userLabels || [])

      const circleMembersList = circleMembers?.res || []
      const assigneesForParsing = circleMembersList.map(member => ({
        userId: member.userId,
        username:
          member.username ||
          member.displayName?.toLowerCase().replace(/\s+/g, ''),
        displayName: member.displayName,
        name: member.displayName,
        id: member.userId,
      }))

      const assigneesResult = parseAssignees(sentence, assigneesForParsing)
      const repeat = parseRepeatV2(sentence)
      const dueDateParsed = parseDueDate(sentence, chrono)

      // Set all the parsed values
      if (priority.result) setPriority(parseInt(priority.result, 10))
      if (pointsParsed.result) setPoints(pointsParsed.result)
      if (labels.result) {
        // parseLabels returns array of label objects, extract their IDs
        const labelIds = labels.result
          .filter(label => label.id) // Only labels with IDs (existing labels)
          .map(label => label.id)
        setLabelsV2(labelIds)
      }

      if (assigneesResult.isAnyone) {
        // @Anyone was used - set empty assignees (anyone can do the task)
        setIsAnyoneTask(true)
        setAssignees([])
      } else if (assigneesResult.result && assigneesResult.result.length > 0) {
        setIsAnyoneTask(false)
        const parsedAssignees = assigneesResult.result.map(assignee => ({
          userId: assignee.userId,
        }))
        setAssignees(parsedAssignees)
      } else {
        // Only assign to current user if no @ mentions found and userProfile exists
        setIsAnyoneTask(false)
        if (userProfile?.id) {
          setAssignees([
            {
              userId: userProfile.id,
            },
          ])
        }
      }

      if (repeat.result) {
        setFrequency(repeat.result)
        setFrequencyHumanReadable(repeat.name)
      }

      const syncDueDateStates = parsedDate => {
        const m = moment(parsedDate)
        const dateOnly = m.format('YYYY-MM-DD')
        const timeOnly = m.format('HH:mm')
        setDueDateOnly(dateOnly)
        setDueDate(m.format('YYYY-MM-DDTHH:mm:ss'))
        if (timeOnly !== '23:59') {
          setUseCustomTime(true)
          setDueTime(timeOnly)
        } else {
          setUseCustomTime(false)
          setDueTime(null)
        }
      }

      let dueDateHighlight = null
      if (dueDateParsed.result) {
        syncDueDateStates(dueDateParsed.result)
        dueDateHighlight = dueDateParsed.highlight[0]
      }

      // Create the cleaned sentence by sequentially applying all cleanups
      let cleanedSentence = sentence
      if (priority.result) cleanedSentence = priority.cleanedSentence
      if (pointsParsed.result) {
        // Apply points cleaning to the current cleaned sentence
        const pointsReparse = parsePoints(cleanedSentence)
        if (pointsReparse.result)
          cleanedSentence = pointsReparse.cleanedSentence
      }
      if (labels.result) {
        // Apply labels cleaning to the current cleaned sentence
        const labelsReparse = parseLabels(cleanedSentence, userLabels || [])
        if (labelsReparse.result)
          cleanedSentence = labelsReparse.cleanedSentence
      }
      if (assigneesResult.result) {
        // Apply assignees cleaning to the current cleaned sentence
        const assigneesReparse = parseAssignees(
          cleanedSentence,
          assigneesForParsing,
        )
        if (assigneesReparse.result)
          cleanedSentence = assigneesReparse.cleanedSentence
      }
      if (repeat.result) {
        // Apply repeat cleaning to the current cleaned sentence
        const repeatReparse = parseRepeatV2(cleanedSentence)
        if (repeatReparse.result)
          cleanedSentence = repeatReparse.cleanedSentence
      }
      if (dueDateParsed.result) {
        // Apply date cleaning to the current cleaned sentence
        const dueDateReparse = parseDueDate(cleanedSentence, chrono)
        if (dueDateReparse.result)
          cleanedSentence = dueDateReparse.cleanedSentence
      }

      setTaskText(sentence)
      setTaskTitle(cleanedSentence.trim())

      // Generate highlights for rendering using original sentence positions
      const { parts } = renderHighlightedSentence(
        sentence,
        repeat.highlight,
        priority.highlight,
        labels.highlight,
        dueDateHighlight,
        pointsParsed.highlight,
        assigneesResult.highlight,
      )

      setRenderedParts(parts)
    },
    [userLabels, renderHighlightedSentence, circleMembers, userProfile],
  )

  useEffect(() => {
    if (
      !isModalOpen ||
      userLabelsLoading ||
      isCircleMembersLoading ||
      !userProfile
    ) {
      return
    }

    processText(taskText)
  }, [
    taskText,
    userLabelsLoading,
    isCircleMembersLoading,
    isModalOpen,
    userProfile,
    processText,
  ])

  const handleDueDateChange = e => {
    const dateValue = e.target.value
    setDueDateOnly(dateValue)
    if (useCustomTime && dueTime) {
      setDueDate(
        moment(`${dateValue}T${dueTime}`).format('YYYY-MM-DDTHH:mm:00'),
      )
    } else {
      setUseCustomTime(false)
      setDueTime(null)
      setDueDate(moment(dateValue).endOf('day').format('YYYY-MM-DDTHH:mm:ss'))
    }
  }

  const handleDueTimeChange = e => {
    const timeValue = e.target.value
    setDueTime(timeValue)
    if (dueDateOnly) {
      if (timeValue) {
        setUseCustomTime(true)
        setDueDate(
          moment(`${dueDateOnly}T${timeValue}`).format('YYYY-MM-DDTHH:mm:00'),
        )
      } else {
        setUseCustomTime(false)
        setDueDate(
          moment(dueDateOnly).endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        )
      }
    }
  }

  const handleUseCustomTimeChange = checked => {
    setUseCustomTime(checked)
    if (checked) {
      const defaultTime = dueTime || '18:00'
      if (!dueTime) {
        setDueTime(defaultTime)
      }
      if (dueDateOnly) {
        setDueDate(
          moment(`${dueDateOnly}T${defaultTime}`).format('YYYY-MM-DDTHH:mm:00'),
        )
      }
    } else {
      setDueTime(null)
      if (dueDateOnly) {
        setDueDate(
          moment(dueDateOnly).endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        )
      }
    }
  }

  const handleEnterPressed = () => {
    createChore()
  }

  const handleCloseModal = forceRefetch => {
    onClose(forceRefetch)
    setTaskText('')
    setTaskTitle('')
    setDueDate(null)
    setFrequency(null)
    setFrequencyHumanReadable(null)
    setPriority(0)
    setPoints(-1)
    setIsAnyoneTask(false)
    setHasDescription(false)
    setDescription(null)
    setSubTasks(null)
    setHasSubTasks(false)
    setLabelsV2([])
    setAssignees([])
    setProjectId(getInitialProject())
    setHasDeadline(false)
    setDeadlineOffset(-1)
    setDueDateOnly(null)
    setDueTime(null)
    setUseCustomTime(false)
  }

  const createChore = () => {
    // Handle different assignee scenarios
    let finalAssignees = assignees
    let finalAssignedTo = null
    let finalAssignStrategy = 'random'

    if (isAnyoneTask) {
      // @Anyone was explicitly used - anyone can do the task
      finalAssignees = []
      finalAssignedTo = null
      finalAssignStrategy = 'no_assignee'
    } else if (assignees.length === 0) {
      // No assignees and no @Anyone - fallback to current user
      finalAssignees = [{ userId: userProfile?.id }]
      finalAssignedTo = userProfile?.id
      finalAssignStrategy = 'keep_last_assigned'
    } else if (assignees.length === 1) {
      // Single assignee
      finalAssignedTo = assignees[0].userId
      finalAssignStrategy = 'keep_last_assigned'
    } else {
      // Multiple assignees
      finalAssignedTo = null
      finalAssignStrategy = 'random'
    }

    const chore = {
      name: taskTitle,
      description: description,
      assignees: finalAssignees,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assignedTo: finalAssignedTo,
      assignStrategy: finalAssignStrategy,
      isRolling: false,
      labelsV2: labelsV2,
      priority: priority ? Number(priority) : 0,
      points: points > -1 ? points : null,
      deadlineOffset: deadlineOffset < 0 ? null : deadlineOffset,
      status: 0,
      frequencyType: 'once',
      frequencyMetadata: {},
      notificationMetadata: {},
      subTasks: subTasks?.length > 0 ? subTasks : null,
      projectId: projectId === 'default' ? null : projectId,
      attachments: attachments.length > 0 ? attachments : null,
    }

    if (frequency) {
      chore.frequencyType = frequency.frequencyType
      chore.frequencyMetadata = frequency.frequencyMetadata
      chore.frequency = frequency.frequency
      if (isPlusAccount(userProfile)) {
        chore.notification = true
        chore.notificationMetadata = notificationMetadata
      }
    }
    if (!frequency && dueDate) {
      // use dueDate converted to UTC:
      chore.nextDueDate = new Date(dueDate).toUTCString()
      chore.notificationMetadata = notificationMetadata
    }

    createChoreMutation
      .mutateAsync(chore)
      .then(result => {
        const choreData = result
        if (choreData?._pendingCreate) {
          // Offline: task queued, add temp chore to UI immediately
          onChoreUpdate(choreData)
        } else {
          // Online: choreData is the created chore object returned by the mutation
          onChoreUpdate({
            ...chore,
            ...choreData,
            id: choreData?.id,
            nextDueDate: chore.dueDate,
          })
        }
        setTaskText('')
      })
      .catch(error => {
        console.error('Error creating chore:', error)
      })
    handleCloseModal(false)
  }
  if (isCircleMembersLoading || isProjectsLoading) {
    return <></>
  }

  return (
    <ResponsiveModal
      open={isModalOpen}
      onClose={handleCloseModal}
      size='lg'
      fullWidth={true}
      title='Create new task'
      footer={
        <Box
          sx={{
            marginTop: 2,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'end',
            gap: 1,
          }}
        >
          <Button
            size='lg'
            variant='outlined'
            color='neutral'
            onClick={handleCloseModal}
          >
            Cancel
            {showKeyboardShortcuts && (
              <KeyboardShortcutHint
                shortcut='Esc'
                sx={{ ml: 1 }}
                withCtrl={false}
              />
            )}
          </Button>
          <Button
            size='lg'
            variant='solid'
            color='primary'
            onClick={createChore}
          >
            Create
            {showKeyboardShortcuts && (
              <KeyboardShortcutHint shortcut='Enter' sx={{ ml: 1 }} />
            )}
          </Button>
        </Box>
      }
    >
      <Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Typography level='body-sm'>Task in a sentence:</Typography>
          <LearnMoreButton
            content={
              <>
                <Typography level='body-sm' sx={{ mb: 1 }}>
                  This feature lets you create a task simply by typing a
                  sentence. It attempt parses the sentence to identify the
                  task&apos;s due date, priority, and frequency.
                </Typography>

                <Typography level='body-sm' sx={{ fontWeight: 'bold', mt: 2 }}>
                  Examples:
                </Typography>

                <Typography
                  level='body-sm'
                  component='ul'
                  sx={{ pl: 2, mt: 1, listStyle: 'disc' }}
                >
                  <li>
                    <strong>Priority:</strong>For highest priority any of the
                    following keyword <em>P1</em>, <em>Urgent</em>,{' '}
                    <em>Important</em>, or <em>ASAP</em>. For lower priorities,
                    use <em>P2</em>, <em>P3</em>, or <em>P4</em>.
                  </li>
                  <li>
                    <strong>Due date:</strong> Specify dates with phrases like{' '}
                    <em>tomorrow</em>, <em>next week</em>, <em>Monday</em>, or{' '}
                    <em>August 1st at 12pm</em>.
                  </li>
                  <li>
                    <strong>Frequency:</strong> Set recurring tasks with terms
                    like <em>daily</em>, <em>weekly</em>, <em>monthly</em>,{' '}
                    <em>yearly</em>, or patterns such as{' '}
                    <em>every Tuesday and Thursday</em>.
                  </li>
                </Typography>
              </>
            }
          />
        </Box>

        <SmartTaskTitleInput
          autoFocus
          value={taskText}
          placeholder='Type your full text here...'
          onChange={text => {
            setTaskText(text)
          }}
          customRenderer={renderedParts}
          onEnterPressed={handleEnterPressed}
          suggestions={{
            '#': {
              value: 'id',
              display: 'name',
              options: userLabels ? userLabels : [],
            },
            '!': {
              value: 'id',
              display: 'name',
              options: [
                { id: '1', name: 'P1' },
                { id: '2', name: 'P2' },
                { id: '3', name: 'P3' },
                { id: '4', name: 'P4' },
              ],
            },
            '@': {
              value: 'userId',
              display: 'displayName',
              options: [
                { userId: 'anyone', displayName: 'Anyone' },
                ...(circleMembers?.res || []),
              ],
            },
            '*': {
              value: 'id',
              display: 'name',
              options: [
                { id: '1', name: '1 point' },
                { id: '5', name: '5 points' },
                { id: '10', name: '10 points' },
                { id: '25', name: '25 points' },
                { id: '50', name: '50 points' },
                { id: '100', name: '100 points' },
              ],
            },
          }}
        />
      </Box>
      <Box
        sx={{
          paddingTop: 2,
          display: 'flex',
          flexDirection: 'row',
          gap: 2,

          // scrollable horizontally but hide the scrollbar:
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        <DueDatePickerField
          emptyDisplay={pickerEmptyDisplay}
          dueDateOnly={dueDateOnly}
          dueTime={dueTime}
          useCustomTime={useCustomTime}
          onDueDateChange={handleDueDateChange}
          onDueTimeChange={handleDueTimeChange}
          onUseCustomTimeChange={handleUseCustomTimeChange}
          onClear={() => {
            setDueDate(null)
            setDueDateOnly(null)
            setDueTime(null)
            setUseCustomTime(false)
          }}
        />
        <RepeatPickerField
          emptyDisplay={pickerEmptyDisplay}
          value={frequency}
          onChange={setFrequency}
          onClear={() => setFrequency(null)}
        />
        <PriorityPickerField
          value={priority}
          onChange={setPriority}
          onClear={() => setPriority(0)}
          emptyDisplay={pickerEmptyDisplay}
          priorityColors={priorityColors}
          priorityLabels={priorityLabels}
        />
        <AssigneePickerField
          emptyDisplay={pickerEmptyDisplay}
          value={assignees?.[0]?.userId || null}
          onChange={userId => {
            if (!userId) {
              setAssignees([])
            } else {
              setAssignees([{ userId }])
            }
          }}
          onClear={() => setAssignees([])}
          currentUserId={userProfile?.id}
          members={circleMembers?.res || []}
        />

        <LabelsPickerField
          emptyDisplay={pickerEmptyDisplay}
          values={labelsV2 || []}
          onChange={setLabelsV2}
          onClear={() => setLabelsV2([])}
          labels={userLabels || []}
          // emptyDisplay='icon-text'
        />
        {/* <ProjectPickerField
          value={projectId}
          onChange={setProjectId}
          // onClear={() => setProjectId(getInitialProject())} there should be no option to unselect a project, so we don't need an onClear handler
          projects={projects || []}
          emptyDisplay={pickerEmptyDisplay}
        /> */}
        <AttachmentPickerField
          attachments={attachments}
          onChange={setAttachments}
          onClear={() => setAttachments([])}
          emptyDisplay={pickerEmptyDisplay}
          entityType='chore_attachment'
        />
        <NotificationPickerField
          value={notificationMetadata}
          onChange={setNotificationMetadata}
          onClear={() => setNotificationMetadata({ templates: [] })}
          emptyDisplay={pickerEmptyDisplay}
        />
      </Box>
      {/* <Box>
              <Typography level='body-sm'>Title:</Typography>
              <Input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                sx={{ width: '100%', fontSize: '16px' }}
              />
            </Box> */}

      <Box mt={2} sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
        {!hasDescription && (
          <Button
            startDecorator={<Add />}
            variant='outlined'
            color='neutral'
            size='md'
            onClick={() => {
              setHasDescription(true)
              // Focus will be handled by the useEffect hook
            }}
            endDecorator={
              showKeyboardShortcuts && <KeyboardShortcutHint shortcut='E' />
            }
          >
            Description
          </Button>
        )}

        {!hasSubTasks && (
          <Button
            startDecorator={<Add />}
            variant='outlined'
            color='neutral'
            size='md'
            onClick={() => {
              setHasSubTasks(true)
            }}
            endDecorator={
              showKeyboardShortcuts && <KeyboardShortcutHint shortcut='J' />
            }
          >
            Subtasks
          </Button>
        )}

        {/* {!hasDeadline && dueDate && (
          <Button
            startDecorator={<Add />}
            variant='plain'
            size='sm'
            onClick={() => {
              setHasDeadline(true)
              setDeadlineOffset(86400)
            }}
          >
            Set Deadline
          </Button>
        )} */}
      </Box>

      {hasDescription && (
        <Box>
          <Typography level='body-sm'>Description:</Typography>
          <div>
            <RichTextEditor
              ref={richTextEditorRef}
              onChange={setDescription}
              entityType={'chore_description'}
            />
          </div>
        </Box>
      )}
      {hasSubTasks && (
        <Box>
          <Typography level='body-sm'>Subtasks:</Typography>
          <SubTasks
            editMode={true}
            tasks={subTasks ? subTasks : []}
            setTasks={setSubTasks}
            shouldFocus={true}
          />
        </Box>
      )}

      {/* {projects.length >= 1 && (
        <FormControl>
          <Typography level='body-sm'>Project</Typography>
          <Select
            value={projectId}
            onChange={(event, newValue) => setProjectId(newValue)}
            sx={{ minWidth: '15rem' }}
          >
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
                Default Project
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
        </FormControl>
      )} */}
      <Box
        sx={{
          marginTop: 2,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'start',
          gap: 2,
        }}
      >
        {/* <FormControl>
              <Typography level='body-sm'>Assignees</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {assignees.length > 0 ? (
                  assignees.map((assignee, index) => (
                    <Chip
                      key={assignee.userId || index}
                      variant='soft'
                      size='lg'
                      color='primary'
                    >
                      {assignee.displayName || assignee.username}
                    </Chip>
                  ))
                ) : (
                  <Chip variant='soft' size='sm' color='neutral'>
                    {userProfile.displayName}
                  </Chip>
                )}
              </Box>
            </FormControl> */}
        {/* {hasDeadline && dueDate && (
          <Box
            sx={{
              flexDirection: 'column',
              alignItems: 'start',
            }}
          >
            <Typography level='body-sm'>Deadline</Typography>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
            >
              <DurationInput
                value={deadlineOffset}
                onChange={setDeadlineOffset}
                size='sm'
                minValue={0}
              />
              <Typography level='body-sm'>after due date</Typography>
            </Box>
          </Box>
        )} */}
      </Box>
    </ResponsiveModal>
  )
}

export default TaskInput
