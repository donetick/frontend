import { KeyboardReturnOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Input,
  Modal,
  ModalDialog,
  Option,
  Select,
  Textarea,
  Typography,
} from '@mui/joy'
import { FormControl } from '@mui/material'
import * as chrono from 'chrono-node'
import moment from 'moment'
import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CSSTransition } from 'react-transition-group'
import { UserContext } from '../../contexts/UserContext'
import useDebounce from '../../utils/Debounce'
import { CreateChore } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import { useLabels } from '../Labels/LabelQueries'
import LearnMoreButton from './LearnMore'
const VALID_DAYS = {
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
  sunday: 'Sunday',
  sun: 'Sunday',
}

const VALID_MONTHS = {
  january: 'January',
  jan: 'January',
  february: 'February',
  feb: 'February',
  march: 'March',
  mar: 'March',
  april: 'April',
  apr: 'April',
  may: 'May',
  june: 'June',
  jun: 'June',
  july: 'July',
  jul: 'July',
  august: 'August',
  aug: 'August',
  september: 'September',
  sep: 'September',
  october: 'October',
  oct: 'October',
  november: 'November',
  nov: 'November',
  december: 'December',
  dec: 'December',
}

const ALL_MONTHS = Object.values(VALID_MONTHS).filter(
  (v, i, a) => a.indexOf(v) === i,
)

const TaskInput = ({ autoFocus, onChoreUpdate }) => {
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { userProfile } = useContext(UserContext)
  const navigate = useNavigate()
  const [taskText, setTaskText] = useState('')
  const debounceParsing = useDebounce(taskText, 30)
  const [taskTitle, setTaskTitle] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const textareaRef = useRef(null)
  const mainInputRef = useRef(null)
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState(null)
  const [description, setDescription] = useState(null)
  const [frequency, setFrequency] = useState(null)
  const [frequencyHumanReadable, setFrequencyHumanReadable] = useState(null)

  useEffect(() => {
    if (openModal && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value?.length
      textareaRef.current.selectionEnd = textareaRef.current.value?.length
    }
  }, [openModal])

  useEffect(() => {
    if (autoFocus > 0 && mainInputRef.current) {
      mainInputRef.current.focus()
      mainInputRef.current.selectionStart = mainInputRef.current.value?.length
      mainInputRef.current.selectionEnd = mainInputRef.current.value?.length
    }
  }, [autoFocus])

  useEffect(() => {
    if (debounceParsing) {
      processText(debounceParsing)
    }
  }, [debounceParsing])

  const handleEnterPressed = e => {
    if (e.key === 'Enter') {
      createChore()
      handleCloseModal()
      setTaskText('')
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false)
    setTaskText('')
  }

  const handleSubmit = () => {
    createChore()
    handleCloseModal()
    setTaskText('')
  }

  const parsePriority = inputSentence => {
    let sentence = inputSentence.toLowerCase()
    const priorityMap = {
      1: ['p1', 'priority 1', 'high priority', 'urgent', 'asap', 'important'],
      2: ['p2', 'priority 2', 'medium priority'],
      3: ['p3', 'priority 3', 'low priority'],
      4: ['p4', 'priority 4'],
    }

    for (const [priority, terms] of Object.entries(priorityMap)) {
      if (terms.some(term => sentence.includes(term))) {
        return {
          result: priority,
          cleanedSentence: terms.reduce(
            (s, t) => s.replace(t, ''),
            inputSentence,
          ),
        }
      }
    }
    return { result: 0, cleanedSentence: inputSentence }
  }
  const parseLabels = inputSentence => {
    let sentence = inputSentence.toLowerCase()
    const currentLabels = []
    // label will always be prefixed #:
    for (const label of userLabels) {
      if (sentence.includes(`#${label.name.toLowerCase()}`)) {
        currentLabels.push(label)
        sentence = sentence.replace(`#${label.name.toLowerCase()}`, '')
      }
    }
    if (currentLabels.length > 0) {
      return {
        result: currentLabels,
        cleanedSentence: sentence,
      }
    }
    return { result: null, cleanedSentence: sentence }
  }
  const parseAssignee = inputSentence => {
    let sentence = inputSentence.toLowerCase()
    const assigneeMap = {}
  }
  const parseRepeatV2 = inputSentence => {
    const sentence = inputSentence.toLowerCase()
    const result = {
      frequency: 1,
      frequencyType: null,
      frequencyMetadata: {
        days: [],
        months: [],
        unit: null,
        time: new Date().toISOString(),
      },
    }

    const patterns = [
      {
        frequencyType: 'day_of_the_month:every',
        regex: /(\d+)(?:th|st|nd|rd)? of every month$/i,
        name: 'Every {day} of every month',
      },
      {
        frequencyType: 'daily',
        regex: /(every day|daily|everyday)$/i,
        name: 'Every day',
      },
      {
        frequencyType: 'daily:time',
        regex: /every (morning|noon|afternoon|evening|night)$/i,
        name: 'Every {time} daily',
      },
      {
        frequencyType: 'weekly',
        regex: /(every week|weekly)$/i,
        name: 'Every week',
      },
      {
        frequencyType: 'monthly',
        regex: /(every month|monthly)$/i,
        name: 'Every month',
      },
      {
        frequencyType: 'yearly',
        regex: /every year$/i,
        name: 'Every year',
      },
      {
        frequencyType: 'monthly',
        regex: /every (?:other )?month$/i,
        name: 'Bi Monthly',
        value: 2,
      },
      {
        frequencyType: 'interval:2week',
        regex: /(bi-?weekly|every other week)/i,
        value: 2,
        name: 'Bi Weekly',
      },
      {
        frequencyType: 'interval',
        regex: /every (\d+) (days?|weeks?|months?|years?).*$/i,
        name: 'Every {frequency} {unit}',
      },
      {
        frequencyType: 'interval:every_other',
        regex: /every other (days?|weeks?|months?|years?)$/i,
        name: 'Every other {unit}',
      },
      {
        frequencyType: 'days_of_the_week',
        regex: /every ([\w, ]+(?:day)?(?:, [\w, ]+(?:day)?)*)$/i,
        name: 'Every {days}',
      },
      {
        frequencyType: 'day_of_the_month',
        regex: /(\d+)(?:st|nd|rd|th)? of ([\w ]+(?:(?:,| and |\s)[\w ]+)*)/i,
        name: 'Every {day} days of {months}',
      },
    ]

    for (const pattern of patterns) {
      const match = sentence.match(pattern.regex)
      if (!match) continue

      result.frequencyType = pattern.frequencyType
      const unitMap = {
        daily: 'days',
        weekly: 'weeks',
        monthly: 'months',
        yearly: 'years',
      }

      switch (pattern.frequencyType) {
        case 'daily':
        case 'weekly':
        case 'monthly':
        case 'yearly':
          result.frequencyType = 'interval'
          result.frequency = pattern.value || 1
          result.frequencyMetadata.unit = unitMap[pattern.frequencyType]
          return {
            result,
            name: pattern.name,
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }

        case 'interval':
          result.frequency = parseInt(match[1], 10)
          result.frequencyMetadata.unit = match[2]
          return {
            result,
            name: pattern.name
              .replace('{frequency}', result.frequency)
              .replace('{unit}', result.frequencyMetadata.unit),
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }

        case 'days_of_the_week':
          result.frequencyMetadata.days = match[1]
            .toLowerCase()
            .split(/ and |,|\s/)
            .map(day => day.trim())
            .filter(day => VALID_DAYS[day])
            .map(day => VALID_DAYS[day])
          if (!result.frequencyMetadata.days.length)
            return { result: null, name: null, cleanedSentence: inputSentence }
          return {
            result,
            name: pattern.name.replace(
              '{days}',
              result.frequencyMetadata.days.join(', '),
            ),
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }

        case 'day_of_the_month':
          result.frequency = parseInt(match[1], 10)
          result.frequencyMetadata.months = match[2]
            .toLowerCase()
            .split(/ and |,|\s/)
            .map(month => month.trim())
            .filter(month => VALID_MONTHS[month])
            .map(month => VALID_MONTHS[month])
          result.frequencyMetadata.unit = 'days'
          return {
            result,
            name: pattern.name
              .replace('{day}', result.frequency)
              .replace('{months}', result.frequencyMetadata.months.join(', ')),
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }
        case 'interval:2week':
          result.frequency = 2
          result.frequencyMetadata.unit = 'weeks'
          result.frequencyType = 'interval'
          return {
            result,
            name: pattern.name,
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }
        case 'daily:time':
          result.frequency = 1
          result.frequencyMetadata.unit = 'days'
          result.frequencyType = 'daily'
          return {
            result,
            name: pattern.name.replace('{time}', match[1]),
            // replace every x with ''

            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }

        case 'day_of_the_month:every':
          result.frequency = parseInt(match[1], 10)
          result.frequencyMetadata.months = ALL_MONTHS
          result.frequencyMetadata.unit = 'days'
          return {
            result,
            name: pattern.name
              .replace('{day}', result.frequency)
              .replace('{months}', result.frequencyMetadata.months.join(', ')),
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }
        case 'interval:every_other':
          result.frequency = 2
          result.frequencyMetadata.unit = match[1]
          result.frequencyType = 'interval'
          return {
            result,
            name: pattern.name.replace('{unit}', result.frequencyMetadata.unit),
            cleanedSentence: inputSentence.replace(match[0], '').trim(),
          }
      }
    }
    return { result: null, name: null, cleanedSentence: inputSentence }
  }

  const handleTextChange = e => {
    if (!e.target.value) {
      setTaskText('')
      setDueDate(null)
      setFrequency(null)
      setFrequencyHumanReadable(null)
      setPriority(0)
      return
    }
    setTaskText(e.target.value)
  }
  const processText = sentence => {
    let cleanedSentence = sentence
    const priority = parsePriority(cleanedSentence)
    if (priority.result) setPriority(priority.result)
    cleanedSentence = priority.cleanedSentence

    const repeat = parseRepeatV2(cleanedSentence)
    if (repeat.result) {
      setFrequency(repeat.result)
      setFrequencyHumanReadable(repeat.name)
      cleanedSentence = repeat.cleanedSentence
    }

    const parsedDueDate = chrono.parse(cleanedSentence, new Date(), {
      forwardDate: true,
    })
    if (parsedDueDate[0]?.index > -1) {
      setDueDate(
        moment(parsedDueDate[0].start.date()).format('YYYY-MM-DDTHH:mm:ss'),
      )
      cleanedSentence = cleanedSentence.replace(parsedDueDate[0].text, '')
    }

    if (repeat.result) {
      // if repeat has result the cleaned sentence will remove the date related info which mean
      // we need to reparse the date again to get the correct due date:
      const parsedDueDate = chrono.parse(sentence, new Date(), {
        forwardDate: true,
      })
      if (parsedDueDate[0]?.index > -1) {
        setDueDate(
          moment(parsedDueDate[0].start.date()).format('YYYY-MM-DDTHH:mm:ss'),
        )
      }
    }

    if (priority.result || parsedDueDate[0]?.index > -1 || repeat.result) {
      setOpenModal(true)
    }

    setTaskText(sentence)
    setTaskTitle(cleanedSentence.trim())
  }

  const createChore = () => {
    const chore = {
      name: taskTitle,
      assignees: [{ userId: userProfile.id }],
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assignedTo: userProfile.id,
      assignStrategy: 'random',
      isRolling: false,
      notification: false,
      description: description || null,
      labelsV2: [],
      priority: priority || 0,
      status: 0,
      frequencyType: 'once',
      frequencyMetadata: {},
      notificationMetadata: {},
    }

    if (frequency) {
      chore.frequencyType = frequency.frequencyType
      chore.frequencyMetadata = frequency.frequencyMetadata
      chore.frequency = frequency.frequency
      if (isPlusAccount()) {
        chore.notification = true
        chore.notificationMetadata = { dueDate: true }
      }
    }

    CreateChore(chore).then(resp => {
      resp.json().then(data => {
        if (resp.status !== 200) {
          console.error('Error creating chore:', data)
          return
        } else {
          onChoreUpdate({ ...chore, id: data.res, nextDueDate: chore.dueDate })
        }
      })
    })
  }

  return (
    <>
      {!openModal && (
        <CSSTransition in={!openModal} timeout={300} classNames='fade'>
          <Input
            autoFocus={autoFocus > 0}
            ref={mainInputRef}
            placeholder='Add a task...'
            value={taskText}
            onChange={handleTextChange}
            sx={{
              fontSize: '16px',
              mt: 1,
              mb: 1,
              borderRadius: 24,
              height: 24,
              borderColor: 'text.disabled',
              padding: 1,
              width: '100%',
            }}
            onKeyUp={handleEnterPressed}
            endDecorator={
              <IconButton
                variant='outlined'
                sx={{ borderRadius: 24, marginRight: -0.5 }}
              >
                <KeyboardReturnOutlined />
              </IconButton>
            }
          />
        </CSSTransition>
      )}

      <Modal open={openModal} onClose={handleCloseModal}>
        <ModalDialog>
          {/* <Button
            size='sm'
            onClick={() => navigate(`/chores/create`)}
            variant='outlined'
            sx={{ position: 'absolute', right: 20 }}
            startDecorator={<OpenInFull />}
          >
            Full Editor
          </Button> */}
          <Typography level='h4'>Create new task</Typography>
          <Chip startDecorator='🚧' variant='soft' color='warning' size='sm'>
            Experimental Feature
          </Chip>
          <Box>
            <Typography level='body-sm'>Task in a sentence:</Typography>
            <Input
              autoFocus
              ref={textareaRef}
              value={taskText}
              onChange={handleTextChange}
              onKeyUp={handleEnterPressed}
              placeholder='Type your full text here...'
              sx={{ width: '100%', fontSize: '16px' }}
            />
            <LearnMoreButton
              content={
                <>
                  <Typography level='body-sm' sx={{ mb: 1 }}>
                    This feature lets you create a task simply by typing a
                    sentence. It attempt parses the sentence to identify the
                    task's due date, priority, and frequency.
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
                      <strong>Priority:</strong>For highest priority any of the
                      following keyword <em>P1</em>, <em>Urgent</em>,{' '}
                      <em>Important</em>, or <em>ASAP</em>. For lower
                      priorities, use <em>P2</em>, <em>P3</em>, or <em>P4</em>.
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
          <Box>
            <Typography level='body-sm'>Title:</Typography>
            <Input
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              sx={{ width: '100%', fontSize: '16px' }}
            />
          </Box>
          <Box>
            <Typography level='body-sm'>Description:</Typography>
            <Textarea
              minRows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Box>

          <Box
            sx={{ marginTop: 2, display: 'flex', flexDirection: 'row', gap: 2 }}
          >
            <FormControl>
              <Typography level='body-sm'>Priority</Typography>
              <Select
                defaultValue={0}
                value={priority}
                onChange={(e, value) => setPriority(value)}
              >
                <Option value='0'>No Priority</Option>
                <Option value='1'>P1</Option>
                <Option value='2'>P2</Option>
                <Option value='3'>P3</Option>
                <Option value='4'>P4</Option>
              </Select>
            </FormControl>
            <FormControl>
              <Typography level='body-sm'>Due Date</Typography>
              <Input
                type='datetime-local'
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                sx={{ width: '100%', fontSize: '16px' }}
              />
            </FormControl>
          </Box>
          <Box
            sx={{
              marginTop: 2,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'start',
              gap: 2,
            }}
          >
            <FormControl>
              <Typography level='body-sm'>Assignee</Typography>
              <Select value={'0'} disabled>
                <Option value='0'>Me</Option>
                {/* <Option value='1'>Other</Option> */}
              </Select>
            </FormControl>
            <FormControl>
              <Typography level='body-sm'>Frequency</Typography>
              <Input value={frequencyHumanReadable || 'Once'} variant='plain' />
            </FormControl>
          </Box>
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
              variant='outlined'
              color='neutral'
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button variant='solid' color='primary' onClick={handleSubmit}>
              Create
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </>
  )
}

export default TaskInput
