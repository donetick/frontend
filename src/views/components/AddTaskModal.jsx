import { Add, KeyboardArrowDown } from '@mui/icons-material'
import {
  Box,
  Button,
  Dropdown,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Typography,
} from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import * as chrono from 'chrono-node'
import moment from 'moment'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import ModalActions from '../../components/common/ModalActions'
import { useDocumentScanner } from '../../hooks/useDocumentScanner'
import { useFileUpload } from '../../hooks/useFileUpload'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useCreateChore } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { localAIService } from '../../service/LocalAIService'
import { voiceInputService } from '../../service/VoiceInputService'
import LABEL_COLORS, { TASK_COLOR } from '../../utils/Colors'
import { CreateLabel } from '../../utils/Fetcher'
import { imageSourceToFile } from '../../utils/FileConvert'
import { isPlusAccount } from '../../utils/Helpers'
import { getIconComponent } from '../../utils/ProjectIcons'
import { generateUUID } from '../../utils/UUID'
import { useLabels } from '../Labels/LabelQueries'
import { useProjects } from '../Projects/ProjectQueries'
import AdvancedOptionsSection, {
  AdvancedOptionsTrigger,
} from './AdvancedOptionsSection'
import AssigneePickerField from './AssigneePickerField'
import AttachmentPickerField from './AttachmentPickerField'
import {
  parseAssignees,
  parseDueDate,
  parseLabels,
  parsePoints,
  parsePriority,
  parseRepeatV2,
} from './CustomParsers'
import DueDatePickerField from './DueDatePickerField'
import LabelsPickerField from './LabelsPickerField'
import NotificationPickerField from './NotificationPickerField'
import PriorityPickerField from './PriorityPickerField'
import RepeatPickerField from './RepeatPickerField'
import RichTextEditor from './RichTextEditor'
import ScanPanel from './ScanToTask/ScanPanel'
import SmartTaskTitleInput from './SmartTaskTitleInput'
import SubTasks from './SubTask'
import { buildChorePayload, parseVoiceTask } from './VoiceToTask/parseVoiceTask'
import VoicePanel from './VoiceToTask/VoicePanel'
// Canonical reminder template shape, shared with NotificationTemplate and
// LocalNotificationScheduler: a signed value plus 'm' | 'h' | 'd'. Negative is
// before due, positive is after, zero is on due.
const DEFAULT_NOTIFICATION_TEMPLATES = [
  { value: -1, unit: 'd' },
  { value: 0, unit: 'm' },
  { value: 1, unit: 'd' },
]

const UNIT_ALIASES = {
  minute: 'm',
  minutes: 'm',
  hour: 'h',
  hours: 'h',
  day: 'd',
  days: 'd',
}

// Earlier builds stored {value: 1, unit: 'days', type: 'before'}. Nothing reads
// `type`, and the scheduler's unit switch falls through on 'days', so those
// entries fired at the due time (or collided on id) instead of offsetting.
const normalizeTemplate = template => {
  const unit = UNIT_ALIASES[template.unit] || template.unit
  const value = Number(template.value) || 0
  if (!template.type) return { value, unit }
  if (template.type === 'ondue') return { value: 0, unit }
  return {
    value: template.type === 'before' ? -Math.abs(value) : Math.abs(value),
    unit,
  }
}

const getDefaultNotification = () => {
  const storedDefault = localStorage.getItem('defaultNotificationTemplate')
  if (storedDefault) {
    try {
      const parsed = JSON.parse(storedDefault)
      if (Array.isArray(parsed)) {
        // An empty list is a deliberate "no reminders by default", not a
        // missing value — respect it instead of re-seeding.
        const normalized = parsed.map(normalizeTemplate)
        if (JSON.stringify(normalized) !== storedDefault) {
          localStorage.setItem(
            'defaultNotificationTemplate',
            JSON.stringify(normalized),
          )
        }
        return normalized
      }
    } catch {
      // fall through and reset to the defaults below
    }
  }

  localStorage.setItem(
    'defaultNotificationTemplate',
    JSON.stringify(DEFAULT_NOTIFICATION_TEMPLATES),
  )
  return DEFAULT_NOTIFICATION_TEMPLATES
}

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

const DEFAULT_PROJECT = {
  id: 'default',
  name: 'Default Project',
  color: '#9CA3AF',
  icon: 'FolderOpen',
}

const PRIORITY_COLORS = {
  0: TASK_COLOR.NO_PRIORITY,
  1: TASK_COLOR.PRIORITY_1,
  2: TASK_COLOR.PRIORITY_2,
  3: TASK_COLOR.PRIORITY_3,
  4: TASK_COLOR.PRIORITY_4,
}

const PRIORITY_LABELS = {
  0: '--',
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
}

// Static option sets for the smart input's trigger suggestions
const PRIORITY_SUGGESTIONS = {
  value: 'id',
  display: 'name',
  options: [
    { id: '1', name: 'P1' },
    { id: '2', name: 'P2' },
    { id: '3', name: 'P3' },
    { id: '4', name: 'P4' },
  ],
}

const POINTS_SUGGESTIONS = {
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
}

// Delay between the last keystroke and the smart-input parse. Parsing (chrono
// especially) is too heavy to run per keystroke; submitChore flushes a pending
// parse so a fast type-then-Enter never creates from stale parsed state.
const PARSE_DEBOUNCE_MS = 150

const TaskInput = ({ initialMode, isModalOpen, onChoreUpdate, onClose }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const pickerEmptyDisplay = isMobile ? 'icon' : 'icon-text'
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: circleMembers, isLoading: isCircleMembersLoading } =
    useCircleMembers()
  const { data: projects, isLoading: isProjectsLoading } = useProjects()
  const createChoreMutation = useCreateChore()
  const queryClient = useQueryClient()

  const { data: userProfile } = useUserProfile()

  // Stable identities for the voice panel: these queries are undefined while
  // loading, and a fresh [] each render would churn the panel's parse context
  const voiceLabels = useMemo(() => userLabels || [], [userLabels])
  const voiceMembers = useMemo(() => circleMembers?.res || [], [circleMembers])

  const handleCreateLabel = useCallback(
    name => {
      const color =
        LABEL_COLORS[1 + Math.floor(Math.random() * (LABEL_COLORS.length - 1))]
          .value
      CreateLabel({ name, color })
        .then(() => queryClient.invalidateQueries(['labels']))
        .catch(error => console.error('Error creating label:', error))
    },
    [queryClient],
  )

  const smartInputSuggestions = useMemo(
    () => ({
      '#': {
        value: 'id',
        display: 'name',
        options: userLabels || [],
        creatable: true,
        onCreate: handleCreateLabel,
      },
      '!': PRIORITY_SUGGESTIONS,
      '@': {
        value: 'userId',
        display: 'displayName',
        options: [
          { userId: 'anyone', displayName: 'Anyone' },
          ...(circleMembers?.res || []),
        ],
      },
      '*': POINTS_SUGGESTIONS,
    }),
    [userLabels, circleMembers, handleCreateLabel],
  )

  const [taskText, setTaskText] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  // Highlight spans paired with the text they were computed from: the parse
  // is debounced, so while typing these lag behind taskText
  const [renderedParts, setRenderedParts] = useState({ text: '', parts: [] })

  // What the smart input overlay shows. While a parse is pending, keep every
  // highlight span that precedes the edit point and render the rest as plain
  // text — existing token styles must not flicker away on each keystroke.
  const displayedParts = useMemo(() => {
    const { parts, text } = renderedParts
    if (text === taskText) return parts

    let prefixLen = 0
    const max = Math.min(text.length, taskText.length)
    while (prefixLen < max && text[prefixLen] === taskText[prefixLen]) {
      prefixLen++
    }

    const kept = []
    let consumed = 0
    for (const part of parts) {
      const partText = typeof part === 'string' ? part : part.props.children
      if (consumed + partText.length > prefixLen) break
      kept.push(part)
      consumed += partText.length
    }
    kept.push(taskText.slice(consumed))
    return kept
  }, [renderedParts, taskText])

  const richTextEditorRef = useRef(null)
  const latestRef = useRef({})
  // Picker edits made on a voice task card, applied once after the reparse
  // that follows landing the spoken text in the smart input
  const pendingVoiceOverridesRef = useRef(null)
  // True while the current assignees came from an @mention in the text, so a
  // reparse without mentions only resets what a mention set — never a
  // selection made directly in the assignee picker
  const assigneesFromMentionRef = useRef(false)
  // Pending debounced parse of the smart input text, if any
  const parseTimerRef = useRef(null)
  // Identities (type + text) of the highlights from the previous parse, so
  // the appear animation only plays for tokens detected just now
  const prevHighlightKeysRef = useRef(new Set())
  // Which capture method last populated the form, for chore_created's
  // analytics `source` property. Reset to 'quick_add' whenever the modal
  // closes — this is the AddTaskModal popup, distinct from the full-page
  // create flow in ChoreEdit.jsx.
  const taskSourceRef = useRef('quick_add')
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState(null)
  const [description, setDescription] = useState(null)
  const [assignees, setAssignees] = useState([])
  const [labelsV2, setLabelsV2] = useState([])
  const [frequency, setFrequency] = useState(null)
  // Lazy initializers: these read localStorage, which must not happen on
  // every render
  const [notificationMetadata, setNotificationMetadata] = useState(() => ({
    templates: getDefaultNotification(),
  }))
  const [subTasks, setSubTasks] = useState(null)
  const [points, setPoints] = useState(-1)
  const [isAnyoneTask, setIsAnyoneTask] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const [hasSubTasks, setHasSubTasks] = useState(false)
  const [deadlineOffset, setDeadlineOffset] = useState(-1)
  const [requireApproval, setRequireApproval] = useState(false)
  const [completionWindow, setCompletionWindow] = useState(-1)
  const [assignStrategy, setAssignStrategy] = useState('keep_last_assigned')
  const [isPrivate, setIsPrivate] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dueDateOnly, setDueDateOnly] = useState(null)
  const [dueTime, setDueTime] = useState(null)
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [projectId, setProjectId] = useState(getInitialProject)
  const selectedProject = useMemo(
    () =>
      (projectId !== 'default' &&
        projects?.find(project => project.id === projectId)) ||
      DEFAULT_PROJECT,
    [projects, projectId],
  )
  const SelectedProjectIcon = useMemo(
    () => getIconComponent(selectedProject.icon),
    [selectedProject],
  )
  const [attachments, setAttachments] = useState([])

  const [draftId, setDraftId] = useState(() => generateUUID())
  const [showScan, setShowScan] = useState(false)
  const [scanAutoCapture, setScanAutoCapture] = useState(false)
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState(null)
  const [isAttachingScan, setIsAttachingScan] = useState(false)
  const [llmAvailable, setLlmAvailable] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [voiceAvailable, setVoiceAvailable] = useState(false)
  // Voice capture state, reported up by VoicePanel so the modal footer owns
  // the confirm action instead of the panel having its own button row
  const [voiceState, setVoiceState] = useState({
    segments: [],
    isListening: false,
  })
  const [creatingVoiceTasks, setCreatingVoiceTasks] = useState(false)
  // Reminder default the voice cards start from — read once so the array
  // identity stays stable across renders of the panel
  const voiceDefaultNotificationTemplates = useMemo(
    () => getDefaultNotification(),
    [],
  )
  // Same arrangement for the scan panel: it reports the action for its
  // current phase and the modal footer renders it
  const [scanState, setScanState] = useState({
    phase: 'idle',
    primaryAction: null,
  })
  const { isNativeScanner } = useDocumentScanner()
  const { uploadFile } = useFileUpload({
    entityType: 'chore_attachment_draft',
    draftId,
  })

  useEffect(() => {
    localAIService.isAvailable().then(setLlmAvailable)
    voiceInputService.isSupported().then(setVoiceAvailable)
  }, [])

  // Quick-capture widget entry points (donetick://chores/add?mode=voice|scan)
  // land here: open straight into the requested panel, once per modal open so
  // backing out of the panel doesn't bounce the user right back into it.
  const appliedInitialModeRef = useRef(false)
  useEffect(() => {
    if (!isModalOpen) {
      appliedInitialModeRef.current = false
      return
    }
    if (appliedInitialModeRef.current) return

    // Availability resolves async — wait for the answer before deciding; if it
    // never turns true the modal simply stays in plain text mode.
    if (initialMode === 'voice') {
      if (!voiceAvailable) return
      appliedInitialModeRef.current = true
      setShowVoice(true)
    } else if (initialMode === 'scan') {
      if (!llmAvailable) return
      appliedInitialModeRef.current = true
      setScanAutoCapture(true)
      setShowScan(true)
    }
  }, [isModalOpen, initialMode, voiceAvailable, llmAvailable])

  // set showKeyboardShortcuts true as soon as the user hold ctrl or cmd key:
  useEffect(() => {
    if (hasDescription && richTextEditorRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        richTextEditorRef.current.focus()
      }, 100)
    }
  }, [hasDescription])

  useEffect(() => {
    const handleKeyDown = event => {
      const {
        dueDate,
        handleCloseModal,
        hasDescription,
        isModalOpen,
        submitChore,
      } = latestRef.current
      const isHoldingCmd = event.ctrlKey || event.metaKey
      if (isHoldingCmd) {
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
        setHasSubTasks(true)
        setShowKeyboardShortcuts(false)
      }
      if (
        isHoldingCmd &&
        event.key.toLowerCase() === 'b' &&
        isModalOpen &&
        !dueDate
      ) {
        const tomorrow = moment().add(1, 'day')
        setDueDateOnly(tomorrow.format('YYYY-MM-DD'))
        setDueDate(tomorrow.endOf('day').format('YYYY-MM-DDTHH:mm:59'))
        setUseCustomTime(false)
        setDueTime(null)
        setShowKeyboardShortcuts(false)
      }
      if (
        event.key === 'Enter' &&
        (event.ctrlKey || event.metaKey) &&
        isModalOpen
      ) {
        event.preventDefault()
        submitChore()
        return
      }
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

      const seenHighlightKeys = new Set()
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
        const highlightKey = `${highlight.type}:${highlightedText.toLowerCase()}`
        const isNewHighlight = !prevHighlightKeysRef.current.has(highlightKey)
        seenHighlightKeys.add(highlightKey)
        parts.push(
          <span
            key={highlight.start}
            className={`${className}${isNewHighlight ? ' highlight-appear' : ''}`}
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
      prevHighlightKeysRef.current = seenHighlightKeys

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

  // Rebuilt only when the member list actually changes, so a query refetch
  // with identical data doesn't re-trigger the parse effect below
  const assigneesForParsing = useMemo(
    () =>
      (circleMembers?.res || []).map(member => ({
        userId: member.userId,
        username:
          member.username ||
          member.displayName?.toLowerCase().replace(/\s+/g, ''),
        displayName: member.displayName,
        name: member.displayName,
        id: member.userId,
      })),
    [circleMembers],
  )

  const processText = useCallback(
    sentence => {
      const priority = parsePriority(sentence)
      const pointsParsed = parsePoints(sentence)
      const labels = parseLabels(sentence, userLabels || [])

      const assigneesResult = parseAssignees(sentence, assigneesForParsing)
      const repeat = parseRepeatV2(sentence)
      const dueDateParsed = parseDueDate(sentence, chrono)

      // Set all the parsed values
      if (priority.result) setPriority(parseInt(priority.result, 10))
      if (pointsParsed.result) setPoints(pointsParsed.result)
      if (labels.result) {
        // parseLabels only returns #mentions matched to an existing label
        setLabelsV2(labels.result)
      }

      if (assigneesResult.isAnyone) {
        // @Anyone was used - set empty assignees (anyone can do the task)
        setIsAnyoneTask(true)
        setAssignees([])
        assigneesFromMentionRef.current = true
      } else if (assigneesResult.result && assigneesResult.result.length > 0) {
        setIsAnyoneTask(false)
        const parsedAssignees = assigneesResult.result.map(assignee => ({
          userId: assignee.userId,
        }))
        setAssignees(parsedAssignees)
        assigneesFromMentionRef.current = true
      } else if (assigneesFromMentionRef.current) {
        // The @mention that set the current assignees was deleted — fall back
        // to the implicit self default. Picker selections stay untouched.
        assigneesFromMentionRef.current = false
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
      } else if (repeat.dueDate) {
        syncDueDateStates(repeat.dueDate)
      }

      // Create the cleaned sentence by sequentially applying all cleanups.
      // Each stage only needs a reparse when an earlier cleanup actually
      // changed the sentence; otherwise the first-pass result (computed on the
      // identical string) is reused as-is.
      let cleanedSentence = sentence
      if (priority.result) cleanedSentence = priority.cleanedSentence
      if (pointsParsed.result) {
        const pointsReparse =
          cleanedSentence === sentence
            ? pointsParsed
            : parsePoints(cleanedSentence)
        if (pointsReparse.result)
          cleanedSentence = pointsReparse.cleanedSentence
      }
      if (labels.result) {
        const labelsReparse =
          cleanedSentence === sentence
            ? labels
            : parseLabels(cleanedSentence, userLabels || [])
        if (labelsReparse.result)
          cleanedSentence = labelsReparse.cleanedSentence
      }
      if (assigneesResult.result) {
        const assigneesReparse =
          cleanedSentence === sentence
            ? assigneesResult
            : parseAssignees(cleanedSentence, assigneesForParsing)
        if (assigneesReparse.result)
          cleanedSentence = assigneesReparse.cleanedSentence
      }
      if (repeat.result) {
        const repeatReparse =
          cleanedSentence === sentence ? repeat : parseRepeatV2(cleanedSentence)
        if (repeatReparse.result)
          cleanedSentence = repeatReparse.cleanedSentence
      }
      if (dueDateParsed.result) {
        const dueDateReparse =
          cleanedSentence === sentence
            ? dueDateParsed
            : parseDueDate(cleanedSentence, chrono)
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

      setRenderedParts({ text: sentence, parts })

      const overrides = pendingVoiceOverridesRef.current
      if (overrides) {
        pendingVoiceOverridesRef.current = null
        if ('priority' in overrides) setPriority(overrides.priority || 0)
        if ('frequency' in overrides) setFrequency(overrides.frequency)
        if ('labelIds' in overrides) setLabelsV2(overrides.labelIds || [])
        if ('notificationMetadata' in overrides) {
          setNotificationMetadata(
            overrides.notificationMetadata || { templates: [] },
          )
        }
        if ('assignees' in overrides || 'isAnyone' in overrides) {
          setIsAnyoneTask(!!overrides.isAnyone)
          setAssignees(overrides.assignees || [])
          assigneesFromMentionRef.current = false
        }
        if ('dueDate' in overrides) {
          if (overrides.dueDate) {
            syncDueDateStates(overrides.dueDate)
          } else {
            setDueDate(null)
            setDueDateOnly(null)
            setDueTime(null)
            setUseCustomTime(false)
          }
        }
      }
    },
    [userLabels, renderHighlightedSentence, assigneesForParsing, userProfile],
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

    // Debounced so fast typing doesn't run the full parse pipeline per
    // keystroke; submitChore flushes a pending parse before creating.
    parseTimerRef.current = setTimeout(() => {
      parseTimerRef.current = null
      processText(taskText)
    }, PARSE_DEBOUNCE_MS)
    return () => {
      clearTimeout(parseTimerRef.current)
      parseTimerRef.current = null
    }
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
    submitChore()
  }

  // The scan keeps its source image when asked: upload it against the draft so
  // the server promotes it onto the chore the same way manual uploads are.
  const attachScannedImage = async imageSource => {
    // Creating the chore promotes whatever draft attachments exist at that
    // moment, so Create waits on this upload rather than orphaning it.
    setIsAttachingScan(true)
    try {
      const file = await imageSourceToFile(
        imageSource,
        `scan-${Date.now()}.jpg`,
      )
      if (!file) return
      const uploaded = await uploadFile(file)
      if (!uploaded) return
      setAttachments(prev => [
        ...prev,
        { url: uploaded.url, path: uploaded.path, name: uploaded.fileName },
      ])
    } finally {
      setIsAttachingScan(false)
    }
  }

  const handleTaskExtracted = ({
    attachmentImage,
    description: extractedDesc,
    dueDate: extractedDue,
    taskName,
  }) => {
    taskSourceRef.current = 'scan'
    if (attachmentImage) {
      attachScannedImage(attachmentImage)
    }
    if (taskName) {
      processText(taskName)
    }
    if (extractedDesc) {
      setDescription(extractedDesc)
      setHasDescription(true)
    }
    if (extractedDue) {
      const m = moment(new Date(extractedDue))
      if (m.isValid()) {
        setDueDateOnly(m.format('YYYY-MM-DD'))
        setDueDate(m.endOf('day').format('YYYY-MM-DDTHH:mm:ss'))
      }
    }
  }

  // Single voice-captured task: land it in the smart input so the user
  // reviews it with the normal pickers before creating.
  const handleVoiceSingle = (text, overrides = {}) => {
    setShowVoice(false)
    taskSourceRef.current = 'voice'
    if (Object.keys(overrides).length > 0) {
      pendingVoiceOverridesRef.current = overrides
    }
    setTaskText(text)
  }

  // Multiple voice-captured tasks: they were reviewed as cards in the panel,
  // so create them all directly.
  const handleVoiceCreateMany = async parsedTasks => {
    setCreatingVoiceTasks(true)
    const notificationTemplates = getDefaultNotification()
    for (const parsed of parsedTasks) {
      const chore = buildChorePayload(parsed, {
        userProfile,
        projectId,
        notificationTemplates,
      })
      chore.source = 'voice'
      try {
        const result = await createChoreMutation.mutateAsync(chore)
        if (result?._pendingCreate) {
          onChoreUpdate(result)
        } else {
          onChoreUpdate({
            ...chore,
            ...result,
            id: result?.id,
            nextDueDate: chore.dueDate,
          })
        }
      } catch (error) {
        console.error('Error creating voice task:', error)
      }
    }
    setCreatingVoiceTasks(false)
    handleCloseModal(false)
  }

  // Footer confirm while the voice panel is open: one task lands in the smart
  // input for review, several are created straight away.
  const handleVoiceConfirm = () => {
    const { segments } = voiceState
    if (segments.length === 1) {
      handleVoiceSingle(segments[0].text, segments[0].overrides || {})
    } else if (segments.length > 1) {
      // Parse only at confirm time — the cards already parse for their own
      // display, so there's no need to keep a parsed copy in modal state
      const parseCtx = {
        userLabels: voiceLabels,
        members: voiceMembers,
        currentUserId: userProfile?.id,
      }
      handleVoiceCreateMany(
        segments.map(segment => ({
          ...parseVoiceTask(segment.text, parseCtx),
          ...(segment.overrides || {}),
        })),
      )
    }
  }

  const handleCloseModal = forceRefetch => {
    onClose(forceRefetch)
    setShowScan(false)
    setShowVoice(false)
    setVoiceState({ segments: [], isListening: false })
    setScanState({ phase: 'idle', primaryAction: null })
    setCreatingVoiceTasks(false)
    setIsAttachingScan(false)
    setTaskText('')
    setTaskTitle('')
    setDueDate(null)
    setFrequency(null)
    setPriority(0)
    setPoints(-1)
    setIsAnyoneTask(false)
    setHasDescription(false)
    setDescription(null)
    setSubTasks(null)
    setHasSubTasks(false)
    setLabelsV2([])
    setAssignees([])
    assigneesFromMentionRef.current = false
    // The modal closes without a final parse, so drop the highlight identities
    // here or nothing would animate on the next open
    prevHighlightKeysRef.current = new Set()
    setProjectId(getInitialProject())
    setDeadlineOffset(-1)
    setRequireApproval(false)
    setCompletionWindow(-1)
    setAssignStrategy('keep_last_assigned')
    setIsPrivate(false)
    setShowAdvanced(false)
    setDueDateOnly(null)
    setDueTime(null)
    setUseCustomTime(false)
    setAttachments([])
    setDraftId(generateUUID())
    taskSourceRef.current = 'quick_add'
  }

  const createChore = () => {
    // A scanned attachment still uploading would be orphaned by the create
    if (isAttachingScan) return

    // Handle different assignee scenarios
    let finalAssignees = assignees
    let finalAssignedTo = null
    let finalAssignStrategy = assignStrategy

    if (isAnyoneTask) {
      finalAssignees = []
      finalAssignedTo = null
      finalAssignStrategy = 'no_assignee'
    } else if (assignees.length === 0) {
      finalAssignees = [{ userId: userProfile?.id }]
      finalAssignedTo = userProfile?.id
      finalAssignStrategy = assignStrategy
    } else {
      finalAssignedTo = assignees[0].userId
      finalAssignStrategy = assignStrategy
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
      completionWindow:
        completionWindow < 0 || !dueDate ? null : completionWindow,
      requireApproval: requireApproval,
      isPrivate: isPrivate,
      status: 0,
      frequencyType: 'once',
      frequencyMetadata: {},
      notification: false,
      notificationMetadata: {},
      subTasks: subTasks?.length > 0 ? subTasks : null,
      projectId: projectId === 'default' ? null : projectId,
      draftId: draftId,
      source: taskSourceRef.current,
    }

    // Reminders are a Plus feature and only make sense when the user kept at
    // least one template; without the flag the backend never schedules them.
    const hasReminders =
      isPlusAccount(userProfile) && notificationMetadata?.templates?.length > 0

    if (frequency) {
      chore.frequencyType = frequency.frequencyType
      chore.frequencyMetadata = frequency.frequencyMetadata
      chore.frequency = frequency.frequency
    }
    if (dueDate) {
      // Use RFC3339/ISO-8601 format expected by backend. The backend only
      // derives NextDueDate from what's sent on create (handler.go never
      // computes it from frequencyType), so this must be sent whether or
      // not the task also repeats — otherwise a recurring task created with
      // a due date lands with nextDueDate: null.
      chore.nextDueDate = new Date(dueDate).toISOString()
    }
    if (hasReminders && (frequency || dueDate)) {
      chore.notification = true
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

  // All submit paths (Enter, Cmd+Enter, footer button) go through here: a
  // debounce may still be holding the parse of the latest text, and creating
  // from pre-parse state would drop the tail of what the user typed.
  const submitChore = () => {
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
      parseTimerRef.current = null
      flushSync(() => processText(taskText))
    }
    // Read through latestRef: after the flush, this render's createChore
    // closure is stale
    latestRef.current.createChore()
  }

  latestRef.current = {
    isModalOpen,
    hasDescription,
    dueDate,
    createChore,
    submitChore,
    handleCloseModal,
  }

  if (isCircleMembersLoading || isProjectsLoading) {
    return <></>
  }

  return (
    <>
      <ResponsiveModal
        open={isModalOpen}
        onClose={handleCloseModal}
        size='lg'
        fullWidth={true}
        title='Create new task'
        footer={
          <ModalActions>
            {!showScan && !showVoice && projects?.length >= 1 && (
              <Dropdown>
                <MenuButton
                  variant='plain'
                  color='neutral'
                  size='sm'
                  startDecorator={
                    <SelectedProjectIcon
                      sx={{ fontSize: 18, color: selectedProject.color }}
                    />
                  }
                  endDecorator={<KeyboardArrowDown sx={{ fontSize: 16 }} />}
                  sx={{
                    mr: 'auto',
                    color: 'text.secondary',
                    fontWeight: 'normal',
                  }}
                >
                  {selectedProject.name}
                </MenuButton>
                <Menu
                  placement='top-start'
                  sx={{ minWidth: 200, zIndex: Z_INDEX.MODAL_POPOVER }}
                >
                  {[DEFAULT_PROJECT, ...projects].map(project => {
                    const ProjectIcon = getIconComponent(project.icon)
                    return (
                      <MenuItem
                        key={project.id}
                        selected={projectId === project.id}
                        onClick={() => setProjectId(project.id)}
                      >
                        <ListItemDecorator>
                          <ProjectIcon
                            sx={{ fontSize: 18, color: project.color }}
                          />
                        </ListItemDecorator>
                        {project.name}
                      </MenuItem>
                    )
                  })}
                </Menu>
              </Dropdown>
            )}
            <Button
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
            {showVoice && (
              <Button
                variant='solid'
                color='primary'
                loading={creatingVoiceTasks}
                disabled={
                  voiceState.segments.length === 0 || voiceState.isListening
                }
                onClick={handleVoiceConfirm}
              >
                {creatingVoiceTasks
                  ? 'Creating…'
                  : voiceState.segments.length > 1
                    ? `Create ${voiceState.segments.length} Tasks`
                    : 'Use Task'}
              </Button>
            )}
            {showScan && scanState.primaryAction && (
              <Button
                variant='solid'
                color='primary'
                startDecorator={scanState.primaryAction.icon}
                onClick={scanState.primaryAction.onClick}
              >
                {scanState.primaryAction.label}
              </Button>
            )}
            {showScan && scanState.phase === 'processing' && (
              <Button variant='solid' color='primary' loading disabled>
                Processing
              </Button>
            )}
            {!showScan && !showVoice && (
              <Button
                variant='solid'
                color='primary'
                loading={isAttachingScan}
                disabled={!taskTitle.trim() || isAttachingScan}
                onClick={submitChore}
              >
                Create
                {showKeyboardShortcuts && (
                  <KeyboardShortcutHint shortcut='Enter' sx={{ ml: 1 }} />
                )}
              </Button>
            )}
          </ModalActions>
        }
      >
        {!showScan && !showVoice && (
          <>
            <Box sx={{ mt: 1 }}>
              {/* <Box
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

                      <Typography
                        level='body-sm'
                        sx={{ fontWeight: 'bold', mt: 2 }}
                      >
                        Examples:
                      </Typography>

                      <Typography
                        level='body-sm'
                        component='ul'
                        sx={{ pl: 2, mt: 1, listStyle: 'disc' }}
                      >
                        <li>
                          <strong>Priority:</strong>For highest priority any of
                          the following keyword <em>P1</em>, <em>Urgent</em>,{' '}
                          <em>Important</em>, or <em>ASAP</em>. For lower
                          priorities, use <em>P2</em>, <em>P3</em>, or{' '}
                          <em>P4</em>.
                        </li>
                        <li>
                          <strong>Due date:</strong> Specify dates with phrases
                          like <em>tomorrow</em>, <em>next week</em>,{' '}
                          <em>Monday</em>, or <em>August 1st at 12pm</em>.
                        </li>
                        <li>
                          <strong>Frequency:</strong> Set recurring tasks with
                          terms like <em>daily</em>, <em>weekly</em>,{' '}
                          <em>monthly</em>, <em>yearly</em>, or patterns such as{' '}
                          <em>every Tuesday and Thursday</em>.
                        </li>
                      </Typography>
                    </>
                  }
                />
              </Box> */}

              <SmartTaskTitleInput
                autoFocus
                value={taskText}
                isNativeScanner={isNativeScanner}
                onScanClick={
                  llmAvailable
                    ? () => {
                        setScanAutoCapture(true)
                        setShowScan(true)
                      }
                    : undefined
                }
                onPhotoSelected={
                  llmAvailable
                    ? dataUrl => {
                        setScanAutoCapture(false)
                        setPendingPhotoUrl(dataUrl)
                        setShowScan(true)
                      }
                    : undefined
                }
                onVoiceClick={
                  voiceAvailable ? () => setShowVoice(true) : undefined
                }
                placeholder='Type your task...'
                onChange={text => {
                  setTaskText(text)
                  if (!text) setTaskTitle('')
                }}
                customRenderer={displayedParts}
                onEnterPressed={handleEnterPressed}
                onShiftEnterPressed={() => {
                  if (!hasDescription) {
                    setHasDescription(true)
                  }
                  setTimeout(() => richTextEditorRef.current?.focus(), 50)
                }}
                suggestions={smartInputSuggestions}
              />
            </Box>

            <Box
              sx={{
                paddingTop: 2,
                paddingBottom: 1,
                display: 'flex',
                flexDirection: 'row',
                gap: 1.5,
                overflowX: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
                flexWrap: isMobile ? 'nowrap' : 'wrap',
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
                priorityColors={PRIORITY_COLORS}
                priorityLabels={PRIORITY_LABELS}
              />
              <AssigneePickerField
                emptyDisplay={pickerEmptyDisplay}
                values={assignees.map(a => a.userId)}
                isAnyone={isAnyoneTask}
                onChange={userIds => {
                  if (userIds.includes('anyone')) {
                    setIsAnyoneTask(true)
                    setAssignees([])
                  } else {
                    setIsAnyoneTask(false)
                    setAssignees(userIds.map(userId => ({ userId })))
                  }
                }}
                onClear={() => {
                  setIsAnyoneTask(false)
                  setAssignees([])
                }}
                currentUserId={userProfile?.id}
                members={circleMembers?.res || []}
              />
              <LabelsPickerField
                emptyDisplay={pickerEmptyDisplay}
                values={(labelsV2 || []).map(label => label.id)}
                onChange={ids =>
                  setLabelsV2(
                    (userLabels || []).filter(label => ids.includes(label.id)),
                  )
                }
                onClear={() => setLabelsV2([])}
                labels={userLabels || []}
              />
              <AttachmentPickerField
                attachments={attachments}
                onChange={setAttachments}
                onClear={() => setAttachments([])}
                emptyDisplay={pickerEmptyDisplay}
                entityType='chore_attachment_draft'
                draftId={draftId}
              />
              <NotificationPickerField
                value={notificationMetadata}
                onChange={setNotificationMetadata}
                onClear={() => setNotificationMetadata({ templates: [] })}
                emptyDisplay={pickerEmptyDisplay}
              />
            </Box>

            <Box
              sx={{
                mt: 1,
                display: 'flex',
                flexDirection: 'row',
                gap: 1.5,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {!hasDescription && (
                <Button
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  onClick={() => setHasDescription(true)}
                  endDecorator={
                    showKeyboardShortcuts && (
                      <KeyboardShortcutHint shortcut='E' />
                    )
                  }
                  sx={{
                    borderRadius: '128px',
                    minHeight: 40,
                    px: 1.25,
                    gap: 1,
                    transition: 'all 0.25s ease-in-out',
                  }}
                >
                  <Add sx={{ fontSize: 20 }} />
                  <Typography level='body-sm'>Description</Typography>
                </Button>
              )}
              {!hasSubTasks && (
                <Button
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  onClick={() => setHasSubTasks(true)}
                  endDecorator={
                    showKeyboardShortcuts && (
                      <KeyboardShortcutHint shortcut='J' />
                    )
                  }
                  sx={{
                    borderRadius: '128px',
                    minHeight: 40,
                    px: 1.25,
                    gap: 1,
                    transition: 'all 0.25s ease-in-out',
                  }}
                >
                  <Add sx={{ fontSize: 20 }} />
                  <Typography level='body-sm'>Subtasks</Typography>
                </Button>
              )}
              <AdvancedOptionsTrigger
                open={showAdvanced}
                onToggle={() => setShowAdvanced(v => !v)}
                activeCount={
                  [
                    points > -1,
                    requireApproval,
                    completionWindow > -1,
                    deadlineOffset > -1,
                  ].filter(Boolean).length
                }
                emptyDisplay={pickerEmptyDisplay}
              />
            </Box>

            <AdvancedOptionsSection
              open={showAdvanced}
              points={points}
              onPointsChange={setPoints}
              requireApproval={requireApproval}
              onRequireApprovalChange={setRequireApproval}
              completionWindow={completionWindow}
              onCompletionWindowChange={setCompletionWindow}
              deadlineOffset={deadlineOffset}
              onDeadlineOffsetChange={setDeadlineOffset}
              assignStrategy={assignStrategy}
              onAssignStrategyChange={setAssignStrategy}
              hasDueDate={!!dueDate}
              hasMultipleAssignees={assignees.length > 1}
              // Empty assignees still implicitly assigns the current user at
              // create time; only an "Anyone" task truly has no assignee
              hasAssignees={!isAnyoneTask}
              isPrivate={isPrivate}
              onIsPrivateChange={setIsPrivate}
            />

            {hasDescription && (
              <Box>
                <Typography level='body-sm'>Description:</Typography>
                <div>
                  <RichTextEditor
                    ref={richTextEditorRef}
                    onChange={setDescription}
                    value={description || ''}
                    entityType={'chore_description'}
                    draftId={draftId}
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
          </>
        )}

        {showVoice && (
          <VoicePanel
            userLabels={voiceLabels}
            members={voiceMembers}
            userProfile={userProfile}
            defaultNotificationTemplates={voiceDefaultNotificationTemplates}
            onStateChange={setVoiceState}
          />
        )}

        {showScan && (
          <ScanPanel
            open
            autoCapture={scanAutoCapture}
            canKeepImage={isPlusAccount(userProfile)}
            onTaskExtracted={handleTaskExtracted}
            initialImageUrl={pendingPhotoUrl}
            onStateChange={setScanState}
            onClose={() => {
              setShowScan(false)
              setScanAutoCapture(false)
              setPendingPhotoUrl(null)
              setScanState({ phase: 'idle', primaryAction: null })
            }}
          />
        )}
      </ResponsiveModal>
    </>
  )
}

export default TaskInput
