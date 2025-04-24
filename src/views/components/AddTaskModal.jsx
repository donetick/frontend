import { Add } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Input,
  Modal,
  ModalDialog,
  ModalOverflow,
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
import { UserContext } from '../../contexts/UserContext'
import { useCreateChore } from '../../queries/ChoreQueries'
import { useAllUsers } from '../../queries/UserQueries'
import useDebounce from '../../utils/Debounce'
import { isPlusAccount } from '../../utils/Helpers'
import { useLabels } from '../Labels/LabelQueries'
import SmartTaskTitleInput from '../TestView/SmartTaskTitleInput'
import { parseLabels, parsePriority, parseRepeatV2 } from './CustomParsers'
import LearnMoreButton from './LearnMore'
import SubTasks from './SubTask'

const TaskInput = ({ autoFocus, onChoreUpdate, isModalOpen, onClose }) => {
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: allUsers, isLoading: isAllUserLoading } = useAllUsers()
  const createChoreMutation = useCreateChore()

  const { userProfile } = useContext(UserContext)
  const navigate = useNavigate()
  const [taskText, setTaskText] = useState('')
  const debounceParsing = useDebounce(taskText, 30)
  const [taskTitle, setTaskTitle] = useState('')
  const [renderedParts, setRenderedParts] = useState([])

  const textareaRef = useRef(null)
  const mainInputRef = useRef(null)
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState(null)
  const [description, setDescription] = useState(null)
  const [assignedTo, setAssignedTo] = useState(userProfile?.id)
  const [assignees, setAssignees] = useState([])
  const [labelsV2, setLabelsV2] = useState([])
  const [frequency, setFrequency] = useState(null)
  const [frequencyHumanReadable, setFrequencyHumanReadable] = useState(null)
  const [subTasks, setSubTasks] = useState(null)
  const [hasDescription, setHasDescription] = useState(false)
  const [hasSubTasks, setHasSubTasks] = useState(false)

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

  useEffect(() => {
    if (!isModalOpen || userLabelsLoading || isAllUserLoading) {
      return
    }

    processText(taskText)
  }, [taskText, userLabelsLoading, isAllUserLoading])

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
    setHasDescription(false)
    setDescription(null)
    setSubTasks(null)
    setHasSubTasks(false)
    setLabelsV2([])
  }

  const handleSubmit = () => {
    createChore()
    handleCloseModal()
    setTaskText('')
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
    const priority = parsePriority(sentence)
    if (priority.result) setPriority(priority.result)
    cleanedSentence = priority.cleanedSentence
    const labels = parseLabels(sentence, userLabels)
    if (labels.result) {
      cleanedSentence = labels.cleanedSentence
      setLabelsV2(labels.result)
    }

    const repeat = parseRepeatV2(sentence)
    if (repeat.result) {
      setFrequency(repeat.result)
      setFrequencyHumanReadable(repeat.name)
      cleanedSentence = repeat.cleanedSentence
    }
    // const assignees = parseAssignees(sentence)
    // if (assignees.result) {
    //   cleanedSentence = assignees.cleanedSentence
    //   set
    // }
    const parsedDueDate = chrono.parse(sentence, new Date(), {
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

    setTaskText(sentence)
    setTaskTitle(cleanedSentence.trim())
    const rendered = renderText(
      sentence,
      repeat.highlight,
      priority.highlight,
      labels.highlight,
      parsedDueDate && parsedDueDate[0]
        ? {
            start: parsedDueDate[0].index,
            end: parsedDueDate[0].index + parsedDueDate[0].text.length,
            text: parsedDueDate[0].text,
          }
        : null,
    )

    setRenderedParts(rendered)
  }
  const renderText = (
    sentence,
    repeatHighlight,
    priorityHighlight,
    labelsHighlight,
    dueDateHighlight,
  ) => {
    const parts = []
    let lastIndex = 0

    // Combine all highlight ranges and sort them by their start index
    const allHighlights = []
    if (repeatHighlight) {
      repeatHighlight.forEach(h =>
        allHighlights.push({ ...h, type: 'repeat', priority: 40 }),
      )
    }
    if (priorityHighlight) {
      priorityHighlight.forEach(h =>
        allHighlights.push({ ...h, type: 'priority', priority: 30 }),
      )
    }
    if (labelsHighlight) {
      labelsHighlight.forEach(h =>
        allHighlights.push({ ...h, type: 'label', priority: 20 }),
      )
    }
    if (dueDateHighlight) {
      allHighlights.push({ ...dueDateHighlight, type: 'dueDate', priority: 10 })
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
        // No overlap, add the current highlight
        resolvedHighlights.push(current)
      }
    }
    for (const highlight of resolvedHighlights) {
      // Add the text before the highlight
      if (highlight.start > lastIndex) {
        parts.push(sentence.substring(lastIndex, highlight.start))
      }

      // Determine the class name based on the highlight type
      let className = ''
      switch (highlight.type) {
        case 'repeat':
          className = 'highlight-repeat'
          break
        case 'priority':
          className = 'highlight-priority'
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

      // Add the highlighted span
      parts.push(
        <span
          key={highlight.start}
          className={className}
          style={{
            // text underline:
            textDecoration: 'underline',
            // textDecorationColor: 'red',
            textDecorationThickness: '2px',
            textDecorationStyle: 'dashed',
          }}
        >
          {sentence.substring(highlight.start, highlight.end)}
        </span>,
      )

      // Update the last index to the end of the current highlight
      lastIndex = highlight.end
    }

    // Add any remaining text after the last highlight
    if (lastIndex < sentence.length) {
      parts.push(sentence.substring(lastIndex))
    }

    return parts
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
      labelsV2: labelsV2,
      priority: priority ? Number(priority) : 0,
      status: 0,
      frequencyType: 'once',
      frequencyMetadata: {},
      notificationMetadata: {},
      subTasks: subTasks?.length > 0 ? subTasks : null,
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
    if (!frequency && dueDate) {
      // use dueDate converted to UTC:
      chore.nextDueDate = new Date(dueDate).toUTCString()
    }

    createChoreMutation
      .mutateAsync(chore)
      .then(resp => {
        resp.json().then(data => {
          if (resp.status !== 200) {
            console.error('Error creating chore:', data)
            return
          } else {
            onChoreUpdate({
              ...chore,
              id: data.res,
              nextDueDate: chore.dueDate,
            })

            handleCloseModal(false)
          }
        })
      })
      .catch(error => {
        if (error?.queued) {
          handleCloseModal(true)
        }
      })
  }
  if (userLabelsLoading || isAllUserLoading) {
    return <></>
  }

  return (
    <Modal open={isModalOpen} onClose={handleCloseModal}>
      <ModalOverflow>
        <ModalDialog size='lg' sx={{ minWidth: '80%' }}>
          <Typography level='h4'>Create new task</Typography>
          <Chip startDecorator='🚧' variant='soft' color='warning' size='sm'>
            Experimental Feature
          </Chip>
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
                        <strong>Priority:</strong>For highest priority any of
                        the following keyword <em>P1</em>, <em>Urgent</em>,{' '}
                        <em>Important</em>, or <em>ASAP</em>. For lower
                        priorities, use <em>P2</em>, <em>P3</em>, or <em>P4</em>
                        .
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
                '!': ['P1', 'P2', 'P3', 'P4'],
                '@': {
                  // value: 'userId',
                  // display: 'displayName',
                  // options: allUsers ? allUsers : [],
                  value: 'id',
                  display: 'name',
                  options: [
                    { id: userProfile.id, name: userProfile.displayName },
                  ],
                },
              }}
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
          <Box>
            {!hasDescription && (
              <Button
                startDecorator={<Add />}
                variant='plain'
                size='sm'
                onClick={() => setHasDescription(true)}
              >
                Description
              </Button>
            )}
            {!hasSubTasks && (
              <Button
                startDecorator={<Add />}
                variant='plain'
                size='sm'
                onClick={() => setHasSubTasks(true)}
              >
                Subtasks
              </Button>
            )}
            {!dueDate && (
              <Button
                startDecorator={<Add />}
                variant='plain'
                size='sm'
                onClick={() => {
                  setDueDate(
                    moment().add(1, 'day').format('YYYY-MM-DDTHH:00:00'),
                  )
                }}
              >
                Due Date
              </Button>
            )}
          </Box>

          {hasDescription && (
            <Box>
              <Typography level='body-sm'>Description:</Typography>
              <Textarea
                minRows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </Box>
          )}
          {hasSubTasks && (
            <Box>
              <Typography level='body-sm'>Subtasks:</Typography>
              <SubTasks
                editMode={true}
                tasks={subTasks ? subTasks : []}
                setTasks={setSubTasks}
              />
            </Box>
          )}

          <Box
            sx={{
              marginTop: 2,
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
            }}
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
            {dueDate && (
              <FormControl>
                <Typography level='body-sm'>Due Date</Typography>
                <Input
                  type='datetime-local'
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  sx={{ width: '100%', fontSize: '16px' }}
                />
              </FormControl>
            )}
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
      </ModalOverflow>
    </Modal>
  )
}

export default TaskInput
