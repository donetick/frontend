import { Add } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  List,
  ListItem,
  MenuItem,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import { getTextColorFromBackgroundColor } from '../../utils/Colors.jsx'
import {
  CreateChore,
  DeleteChore,
  GetAllCircleMembers,
  GetChoreByID,
  GetChoreHistory,
  GetThings,
  SaveChore,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import LabelModal from '../Modals/Inputs/LabelModal'
import RepeatSection from './RepeatSection'
const ASSIGN_STRATEGIES = [
  'random',
  'least_assigned',
  'least_completed',
  'keep_last_assigned',
  'random_except_last_assigned',
]
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']

const NO_DUE_DATE_REQUIRED_TYPE = ['no_repeat', 'once']
const NO_DUE_DATE_ALLOWED_TYPE = ['trigger']
const ChoreEdit = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [chore, setChore] = useState([])
  const [choresHistory, setChoresHistory] = useState([])
  const [userHistory, setUserHistory] = useState({})
  const { choreId } = useParams()
  const [name, setName] = useState('')
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const [assignees, setAssignees] = useState([])
  const [performers, setPerformers] = useState([])
  const [assignStrategy, setAssignStrategy] = useState(ASSIGN_STRATEGIES[2])
  const [dueDate, setDueDate] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [completedDate, setCompletedDate] = useState('')
  const [assignedTo, setAssignedTo] = useState(-1)
  const [frequencyType, setFrequencyType] = useState('once')
  const [frequency, setFrequency] = useState(1)
  const [frequencyMetadata, setFrequencyMetadata] = useState({})
  const [labels, setLabels] = useState([])
  const [labelsV2, setLabelsV2] = useState([])
  const [points, setPoints] = useState(-1)
  const [completionWindow, setCompletionWindow] = useState(-1)
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
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarColor, setSnackbarColor] = useState('warning')
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false)
  const { data: userLabelsRaw, isLoading: isUserLabelsLoading } = useLabels()

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
      errors.name = 'Name is required'
    }
    if (assignees.length === 0) {
      errors.assignees = 'At least 1 assignees is required'
    }
    if (assignedTo < 0) {
      errors.assignedTo = 'Assigned to is required'
    }
    if (frequencyType === 'interval' && !frequency > 0) {
      errors.frequency = `Invalid frequency, the ${frequencyMetadata.unit} should be > 0`
    }
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata['days']?.length === 0
    ) {
      errors.frequency = 'At least 1 day is required'
    }
    if (
      frequencyType === 'day_of_the_month' &&
      frequencyMetadata['months']?.length === 0
    ) {
      errors.frequency = 'At least 1 month is required'
    }
    if (
      dueDate === null &&
      !NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) &&
      !NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)
    ) {
      if (REPEAT_ON_TYPE.includes(frequencyType)) {
        errors.dueDate = 'Start date is required'
      } else {
        errors.dueDate = 'Due date is required'
      }
    }
    if (frequencyType === 'trigger') {
      if (!isThingValid) {
        errors.thingTrigger = 'Thing trigger is invalid'
      }
    }

    // if there is any error then return false:
    setErrors(errors)
    if (Object.keys(errors).length > 0) {
      // generate a list with error and set it in snackbar:

      const errorList = Object.keys(errors).map(key => (
        <ListItem key={key}>{errors[key]}</ListItem>
      ))
      setSnackbarMessage(
        <Stack spacing={0.5}>
          <Typography level='title-md'>
            Please resolve the following errors:
          </Typography>
          <List>{errorList}</List>
        </Stack>,
      )
      setSnackbarColor('danger')
      setIsSnackbarOpen(true)
      return false
    }

    return true
  }

  const handleDueDateChange = e => {
    setDueDate(e.target.value)
  }
  const HandleSaveChore = () => {
    setAttemptToSave(true)
    if (!HandleValidateChore()) {
      console.log('validation failed')
      console.log(errors)
      return
    }
    const chore = {
      id: Number(choreId),
      name: name,
      assignees: assignees,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      frequencyType: frequencyType,
      frequency: Number(frequency),
      frequencyMetadata: frequencyMetadata,
      assignedTo: assignedTo,
      assignStrategy: assignStrategy,
      isRolling: isRolling,
      isActive: isActive,
      notification: isNotificable,
      labels: labels.map(l => l.name),
      labelsV2: labelsV2,
      notificationMetadata: notificationMetadata,
      thingTrigger: thingTrigger,
      points: points < 0 ? null : points,
      completionWindow: completionWindow < 0 ? null : completionWindow,
    }
    let SaveFunction = CreateChore
    if (choreId > 0) {
      SaveFunction = SaveChore
    }

    SaveFunction(chore).then(response => {
      if (response.status === 200) {
        Navigate(`/my/chores`)
      } else {
        alert('Failed to save chore')
      }
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
    // fetch chores:
    if (choreId > 0) {
      GetChoreByID(choreId)
        .then(response => {
          if (response.status !== 200) {
            alert('You are not authorized to view this chore.')
            Navigate('/my/chores')
            return null
          } else {
            return response.json()
          }
        })
        .then(data => {
          setChore(data.res)
          setName(data.res.name ? data.res.name : '')
          setAssignees(data.res.assignees ? data.res.assignees : [])
          setAssignedTo(data.res.assignedTo)
          setFrequencyType(
            data.res.frequencyType ? data.res.frequencyType : 'once',
          )

          setFrequencyMetadata(JSON.parse(data.res.frequencyMetadata))
          setFrequency(data.res.frequency)

          setNotificationMetadata(JSON.parse(data.res.notificationMetadata))
          setPoints(
            data.res.points && data.res.points > -1 ? data.res.points : -1,
          )
          setCompletionWindow(
            data.res.completionWindow && data.res.completionWindow > -1
              ? data.res.completionWindow
              : -1,
          )

          setLabelsV2(data.res.labelsV2)
          setAssignStrategy(
            data.res.assignStrategy
              ? data.res.assignStrategy
              : ASSIGN_STRATEGIES[2],
          )
          setIsRolling(data.res.isRolling)
          setIsActive(data.res.isActive)
          // parse the due date to a string from this format "2021-10-10T00:00:00.000Z"
          // use moment.js or date-fns to format the date for to be usable in the input field:
          setDueDate(
            data.res.nextDueDate
              ? moment(data.res.nextDueDate).format('YYYY-MM-DDTHH:mm:ss')
              : null,
          )
          setUpdatedBy(data.res.updatedBy)
          setCreatedBy(data.res.createdBy)
          setIsNotificable(data.res.notification)
          setThingTrigger(data.res.thingChore)
          // setDueDate(data.res.dueDate)
          // setCompleted(data.res.completed)
          // setCompletedDate(data.res.completedDate)
        })

      // fetch chores history:
      GetChoreHistory(choreId)
        .then(response => response.json())
        .then(data => {
          setChoresHistory(data.res)
          const newUserChoreHistory = {}
          data.res.forEach(choreHistory => {
            if (newUserChoreHistory[choreHistory.completedBy]) {
              newUserChoreHistory[choreHistory.completedBy] += 1
            } else {
              newUserChoreHistory[choreHistory.completedBy] = 1
            }
          })

          setUserHistory(newUserChoreHistory)
        })
    }
    // set focus on the first input field:
    else {
      // new task/ chore set focus on the first input field:
      document.querySelector('input').focus()
    }
  }, [])

  // useEffect(() => {
  //   if (userLabels && userLabels.length == 0 && labelsV2.length == 0) {
  //     return
  //   }
  //   const labelIds = labelsV2.map(l => l.id)
  //   setLabelsV2(userLabels.filter(l => labelIds.indexOf(l.id) > -1))
  // }, [userLabels, labelsV2])

  useEffect(() => {
    // if frequancy type change to somthing need a due date then set it to the current date:
    if (!NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) && !dueDate) {
      setDueDate(moment(new Date()).format('YYYY-MM-DDTHH:mm:00'))
    }
    if (NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)) {
      setDueDate(null)
    }
  }, [frequencyType])

  useEffect(() => {
    if (assignees.length === 1) {
      setAssignedTo(assignees[0].userId)
    }
  }, [assignees])

  useEffect(() => {
    if (performers.length > 0 && assignees.length === 0) {
      setAssignees([
        {
          userId: userProfile.id,
        },
      ])
    }
  }, [performers])

  // if user resolve the error trigger validation to remove the error message from the respective field
  useEffect(() => {
    if (attemptToSave) {
      HandleValidateChore()
    }
  }, [assignees, name, frequencyMetadata, attemptToSave, dueDate])

  const handleDelete = () => {
    setConfirmModelConfig({
      isOpen: true,
      title: 'Delete Chore',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: 'Are you sure you want to delete this chore?',
      onClose: isConfirmed => {
        if (isConfirmed === true) {
          DeleteChore(choreId).then(response => {
            if (response.status === 200) {
              Navigate('/my/chores')
            } else {
              alert('Failed to delete chore')
            }
          })
        }
        setConfirmModelConfig({})
      },
    })
  }

  return (
    <Container maxWidth='md'>
      {/* <Typography level='h3' mb={1.5}>
        Edit Chore
      </Typography> */}
      <Box>
        <FormControl error={errors.name}>
          <Typography level='h4'>Title :</Typography>
          <Typography level='h5'>What is this chore about?</Typography>
          <Input value={name} onChange={e => setName(e.target.value)} />
          <FormHelperText error>{errors.name}</FormHelperText>
        </FormControl>
      </Box>
      <Box mt={2}>
        <Typography level='h4'>Assignees :</Typography>
        <Typography level='h5'>Who can do this chore?</Typography>
        <Card>
          <List
            orientation='horizontal'
            wrap
            sx={{
              '--List-gap': '8px',
              '--ListItem-radius': '20px',
            }}
          >
            {performers?.map((item, index) => (
              <ListItem key={item.id}>
                <Checkbox
                  // disabled={index === 0}
                  checked={assignees.find(a => a.userId == item.userId) != null}
                  onClick={() => {
                    if (assignees.some(a => a.userId === item.userId)) {
                      const newAssignees = assignees.filter(
                        a => a.userId !== item.userId,
                      )
                      setAssignees(newAssignees)
                    } else {
                      setAssignees([...assignees, { userId: item.userId }])
                    }
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
      </Box>
      {assignees.length > 1 && (
        // this wrap the details that needed if we have more than one assingee
        // we need to pick the next assignedTo and also the strategy to pick the next assignee.
        // if we have only one then no need to display this section
        <>
          <Box mt={2}>
            <Typography level='h4'>Assigned :</Typography>
            <Typography level='h5'>
              Who is assigned the next due chore?
            </Typography>

            <Select
              placeholder={
                assignees.length === 0
                  ? 'No Assignees yet can perform this chore'
                  : 'Select an assignee for this chore'
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
                    {/* <Chip size='sm' color='neutral' variant='soft'>
                </Chip> */}
                  </Option>
                ))}
            </Select>
          </Box>
          <Box mt={2}>
            <Typography level='h4'>Picking Mode :</Typography>
            <Typography level='h5'>
              How to pick the next assignee for the following chore?
            </Typography>

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
                      // disabled={index === 0}
                      checked={assignStrategy === item}
                      onClick={() => setAssignStrategy(item)}
                      overlay
                      disableIcon
                      variant='soft'
                      label={item
                        .split('_')
                        .map(x => x.charAt(0).toUpperCase() + x.slice(1))
                        .join(' ')}
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Box>
        </>
      )}
      <RepeatSection
        frequency={frequency}
        onFrequencyUpdate={setFrequency}
        frequencyType={frequencyType}
        onFrequencyTypeUpdate={setFrequencyType}
        frequencyMetadata={frequencyMetadata}
        onFrequencyMetadataUpdate={setFrequencyMetadata}
        onFrequencyTimeUpdate={t => {
          setFrequencyMetadata({
            ...frequencyMetadata,
            time: t,
          })
        }}
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

      <Box mt={2}>
        <Typography level='h4'>
          {REPEAT_ON_TYPE.includes(frequencyType) ? 'Start date' : 'Due date'} :
        </Typography>
        {frequencyType === 'trigger' && !dueDate && (
          <Typography level='body-sm'>
            Due Date will be set when the trigger of the thing is met
          </Typography>
        )}

        {NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) && (
          <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                if (e.target.checked) {
                  setDueDate(moment(new Date()).format('YYYY-MM-DDTHH:mm:00'))
                } else {
                  setDueDate(null)
                }
              }}
              defaultChecked={dueDate !== null}
              checked={dueDate !== null}
              value={dueDate !== null}
              overlay
              label='Give this task a due date'
            />
            <FormHelperText>
              task needs to be completed by a specific time.
            </FormHelperText>
          </FormControl>
        )}
        {dueDate && (
          <FormControl error={Boolean(errors.dueDate)}>
            <Typography level='h5'>
              {REPEAT_ON_TYPE.includes(frequencyType)
                ? 'When does this chore start?'
                : 'When is the next first time this chore is due?'}
            </Typography>
            <Input
              type='datetime-local'
              value={dueDate}
              onChange={handleDueDateChange}
            />
            <FormHelperText>{errors.dueDate}</FormHelperText>
          </FormControl>
        )}

        <FormControl
          orientation='horizontal'
          sx={{ width: 400, justifyContent: 'space-between' }}
        >
          <div>
            {/* <FormLabel>Completion window (hours)</FormLabel> */}
            <Typography level='h5'>Completion window (hours)</Typography>

            <FormHelperText sx={{ mt: 0 }}>
              {"Set a time window that task can't be completed before"}
            </FormHelperText>
          </div>
          <Switch
            checked={completionWindow != -1}
            onClick={event => {
              event.preventDefault()
              if (completionWindow != -1) {
                setCompletionWindow(-1)
              } else {
                setCompletionWindow(1)
              }
            }}
            color={completionWindow !== -1 ? 'success' : 'neutral'}
            variant={completionWindow !== -1 ? 'solid' : 'outlined'}
            // endDecorator={points !== -1 ? 'On' : 'Off'}
            slotProps={{
              endDecorator: {
                sx: {
                  minWidth: 24,
                },
              },
            }}
          />
        </FormControl>
        {completionWindow != -1 && (
          <Card variant='outlined'>
            <Box
              sx={{
                mt: 0,
                ml: 4,
              }}
            >
              <Typography level='body-sm'>Hours:</Typography>

              <Input
                type='number'
                value={completionWindow}
                sx={{ maxWidth: 100 }}
                // add min points is 0 and max is 1000
                slotProps={{
                  input: {
                    min: 0,
                    max: 24 * 7,
                  },
                }}
                placeholder='Hours'
                onChange={e => {
                  setCompletionWindow(parseInt(e.target.value))
                }}
              />
            </Box>
          </Card>
        )}
      </Box>
      {!['once', 'no_repeat'].includes(frequencyType) && (
        <Box mt={2}>
          <Typography level='h4'>Scheduling Preferences: </Typography>
          <Typography level='h5'>
            How to reschedule the next due date?
          </Typography>

          <RadioGroup name='tiers' sx={{ gap: 1, '& > div': { p: 1 } }}>
            <FormControl>
              <Radio
                overlay
                checked={!isRolling}
                onClick={() => setIsRolling(false)}
                label='Reschedule from due date'
              />
              <FormHelperText>
                the next task will be scheduled from the original due date, even
                if the previous task was completed late
              </FormHelperText>
            </FormControl>
            <FormControl>
              <Radio
                overlay
                checked={isRolling}
                onClick={() => setIsRolling(true)}
                label='Reschedule from completion date'
              />
              <FormHelperText>
                the next task will be scheduled from the actual completion date
                of the previous task
              </FormHelperText>
            </FormControl>
          </RadioGroup>
        </Box>
      )}
      <Box mt={2}>
        <Typography level='h4'>Notifications : </Typography>
        <Typography level='h5'>
          Get Reminders when this task is due or completed
          {!isPlusAccount(userProfile) && (
            <Chip variant='soft' color='warning'>
              Not available in Basic Plan
            </Chip>
          )}
        </Typography>

        <FormControl sx={{ mt: 1 }}>
          <Checkbox
            onChange={e => {
              setIsNotificable(e.target.checked)
            }}
            defaultChecked={isNotificable}
            checked={isNotificable}
            value={isNotificable}
            disabled={!isPlusAccount(userProfile)}
            overlay
            label='Notify for this task'
          />
          <FormHelperText
            sx={{
              opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
            }}
          >
            When should receive notifications for this task
          </FormHelperText>
        </FormControl>
      </Box>
      {isNotificable && (
        <Box
          ml={4}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,

            '& > div': { p: 2, borderRadius: 'md', display: 'flex' },
          }}
        >
          <Card variant='outlined'>
            <Typography level='h5'>
              What things should trigger the notification?
            </Typography>
            {[
              {
                title: 'Due Date/Time',
                description: 'A simple reminder that a task is due',
                id: 'dueDate',
              },
              // {
              //   title: 'Upon Completion',
              //   description: 'A notification when a task is completed',
              //   id: 'completion',
              // },
              {
                title: 'Predued',
                description: 'before a task is due in few hours',
                id: 'predue',
              },
              // {
              //   title: 'Overdue',
              //   description: 'A notification when a task is overdue',
              //   id: 'overdue',
              // },
              {
                title: 'Nagging',
                description: 'Daily reminders until the task is completed',
                id: 'nagging',
              },
            ].map(item => (
              <FormControl sx={{ mb: 1 }} key={item.id}>
                <Checkbox
                  overlay
                  onClick={() => {
                    setNotificationMetadata({
                      ...notificationMetadata,
                      [item.id]: !notificationMetadata[item.id],
                    })
                  }}
                  checked={
                    notificationMetadata ? notificationMetadata[item.id] : false
                  }
                  label={item.title}
                  key={item.title}
                />
                <FormHelperText>{item.description}</FormHelperText>
              </FormControl>
            ))}

            <Typography level='h5'>
              What things should trigger the notification?
            </Typography>
            <FormControl>
              <Checkbox
                overlay
                disabled={true}
                checked={true}
                label='All Assignees'
              />
              <FormHelperText>Notify all assignees</FormHelperText>
            </FormControl>

            <FormControl>
              <Checkbox
                overlay
                onClick={() => {
                  if (notificationMetadata['circleGroup']) {
                    delete notificationMetadata['circleGroupID']
                  }

                  setNotificationMetadata({
                    ...notificationMetadata,
                    ['circleGroup']: !notificationMetadata['circleGroup'],
                  })
                }}
                checked={
                  notificationMetadata
                    ? notificationMetadata['circleGroup']
                    : false
                }
                label='Specific Group'
              />
              <FormHelperText>Notify a specific group</FormHelperText>
            </FormControl>

            {notificationMetadata['circleGroup'] && (
              <Box
                sx={{
                  mt: 0,
                  ml: 4,
                }}
              >
                <Typography level='body-sm'>Telegram Group ID:</Typography>

                <Input
                  type='number'
                  value={notificationMetadata['circleGroupID']}
                  placeholder='Telegram Group ID'
                  onChange={e => {
                    setNotificationMetadata({
                      ...notificationMetadata,
                      ['circleGroupID']: parseInt(e.target.value),
                    })
                  }}
                />
              </Box>
            )}
          </Card>
        </Box>
      )}
      <Box mt={2}>
        <Typography level='h4'>Labels :</Typography>
        <Typography level='h5'>
          Things to remember about this chore or to tag it
        </Typography>
        <Select
          multiple
          onChange={(event, newValue) => {
            setLabelsV2(userLabels.filter(l => newValue.indexOf(l.name) > -1))
          }}
          value={labelsV2.map(l => l.name)}
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
            userLabels
              // .map(l => l.name)
              .map(label => (
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
            Add New Label
          </MenuItem>
        </Select>
      </Box>

      <Box mt={2}>
        <Typography level='h4' gutterBottom>
          Others :
        </Typography>

        <FormControl
          orientation='horizontal'
          sx={{ width: 400, justifyContent: 'space-between' }}
        >
          <div>
            <FormLabel>Assign Points</FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              Assign points to this task and user will earn points when they
              completed it
            </FormHelperText>
          </div>
          <Switch
            checked={points > -1}
            onClick={event => {
              event.preventDefault()
              if (points > -1) {
                setPoints(-1)
              } else {
                setPoints(1)
              }
            }}
            color={points !== -1 ? 'success' : 'neutral'}
            variant={points !== -1 ? 'solid' : 'outlined'}
            // endDecorator={points !== -1 ? 'On' : 'Off'}
            slotProps={{
              endDecorator: {
                sx: {
                  minWidth: 24,
                },
              },
            }}
          />
        </FormControl>

        {points != -1 && (
          <Card variant='outlined'>
            <Box
              sx={{
                mt: 0,
                ml: 4,
              }}
            >
              <Typography level='body-sm'>Points:</Typography>

              <Input
                type='number'
                value={points}
                sx={{ maxWidth: 100 }}
                // add min points is 0 and max is 1000
                slotProps={{
                  input: {
                    min: 0,
                    max: 1000,
                  },
                }}
                placeholder='Points'
                onChange={e => {
                  setPoints(parseInt(e.target.value))
                }}
              />
            </Box>
          </Card>
        )}
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
              Created by{' '}
              <Chip variant='solid'>
                {performers.find(f => f.id === createdBy)?.displayName}
              </Chip>{' '}
              {moment(chore.createdAt).fromNow()}
            </Typography>
            {(chore.updatedAt && updatedBy > 0 && (
              <>
                <Divider sx={{ my: 1 }} />

                <Typography level='body1'>
                  Updated by{' '}
                  <Chip variant='solid'>
                    {performers.find(f => f.id === updatedBy)?.displayName}
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
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
          bgcolor: 'background.body',
          boxShadow: 'md', // Add a subtle shadow
        }}
      >
        {choreId > 0 && (
          <Button
            color='danger'
            variant='solid'
            onClick={() => {
              // confirm before deleting:
              handleDelete()
            }}
          >
            Delete
          </Button>
        )}
        <Button
          color='neutral'
          variant='outlined'
          onClick={() => {
            window.history.back()
          }}
        >
          Cancel
        </Button>
        <Button color='primary' variant='solid' onClick={HandleSaveChore}>
          {choreId > 0 ? 'Save' : 'Create'}
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
      <Snackbar
        open={isSnackbarOpen}
        onClose={() => {
          setIsSnackbarOpen(false)
          setSnackbarMessage(null)
        }}
        color={snackbarColor}
        autoHideDuration={4000}
        sx={{ bottom: 70 }}
        invertedColors={true}
        variant='soft'
      >
        {snackbarMessage}
      </Snackbar>
    </Container>
  )
}

export default ChoreEdit
