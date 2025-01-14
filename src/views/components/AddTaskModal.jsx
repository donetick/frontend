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
import { CreateChore } from '../../utils/Fetcher'
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
  const { userProfile } = useContext(UserContext)
  const navigate = useNavigate()
  const [taskText, setTaskText] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const textareaRef = useRef(null)
  const mainInputRef = useRef(null)
  const [priority, setPriority] = useState('0')
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
        regex: /(every day|daily)$/i,
        name: 'Every day',
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
        name: 'Every {days} of the week',
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

        case 'interval:every_other':
        case 'interval:2week':
          result.frequency = 2
          result.frequencyMetadata.unit = 'weeks'
          result.frequencyType = 'interval'
          return {
            result,
            name: pattern.name,
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
      }
    }
    return { result: null, name: null, cleanedSentence: inputSentence }
  }

  const handleTextChange = e => {
    if (!e.target.value) {
      setTaskText('')
      setOpenModal(false)
      setDueDate(null)
      setFrequency(null)
      setFrequencyHumanReadable(null)
      setPriority(0)
      return
    }

    let cleanedSentence = e.target.value
    const priority = parsePriority(cleanedSentence)
    if (priority.result) setPriority(priority.result)
    cleanedSentence = priority.cleanedSentence

    const parsedDueDate = chrono.parse(cleanedSentence, new Date(), {
      forwardDate: true,
    })
    if (parsedDueDate[0]?.index > -1) {
      setDueDate(
        moment(parsedDueDate[0].start.date()).format('YYYY-MM-DDTHH:mm:ss'),
      )
      cleanedSentence = cleanedSentence.replace(parsedDueDate[0].text, '')
    }

    const repeat = parseRepeatV2(cleanedSentence)
    if (repeat.result) {
      setFrequency(repeat.result)
      setFrequencyHumanReadable(repeat.name)
      cleanedSentence = repeat.cleanedSentence
    }

    if (priority.result || parsedDueDate[0]?.index > -1 || repeat.result) {
      setOpenModal(true)
    }

    setTaskText(e.target.value)
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
      description: description || null,
      labelsV2: [],
      priority: priority || 0,
      status: 0,
    }

    if (frequency) {
      chore.frequencyType = frequency.frequencyType
      chore.frequencyMetadata = frequency.frequencyMetadata
      chore.frequency = frequency.frequency
    }

    CreateChore(chore).then(resp => {
      resp.json().then(data => {
        onChoreUpdate({ ...chore, id: data.res, nextDueDate: chore.dueDate })
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
            Experimental
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
          </Box>
          <Box>
            <Typography level='body-sm'>Title:</Typography>
            <Input
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder='Type your full text here...'
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
              <Select value={'0'}>
                <Option value='0'>Me</Option>
                <Option value='1'>Other</Option>
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
