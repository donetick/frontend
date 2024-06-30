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
  Input,
  List,
  ListItem,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
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
import FreeSoloCreateOption from '../components/AutocompleteSelect'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import RepeatSection from './RepeatSection'
const ASSIGN_STRATEGIES = [
  'random',
  'least_assigned',
  'least_completed',
  'keep_last_assigned',
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
  const [allUserThings, setAllUserThings] = useState([])
  const [thingTrigger, setThingTrigger] = useState({})
  const [isThingValid, setIsThingValid] = useState(false)

  const [notificationMetadata, setNotificationMetadata] = useState({})

  const [isRolling, setIsRolling] = useState(false)
  const [isNotificable, setIsNotificable] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [updatedBy, setUpdatedBy] = useState(0)
  const [createdBy, setCreatedBy] = useState(0)
  const [errors, setErrors] = useState({})
  const [attemptToSave, setAttemptToSave] = useState(false)

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
    if (frequencyType === 'interval' && frequency < 1) {
      errors.frequency = 'Frequency is required'
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
      return false
    }
    return true
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
      labels: labels,
      notificationMetadata: notificationMetadata,
      thingTrigger: thingTrigger,
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
    GetAllCircleMembers()
      .then(response => response.json())
      .then(data => {
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
          setLabels(data.res.labels ? data.res.labels.split(',') : [])

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
          <Typography level='h4'>Descritpion :</Typography>
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
                  checked={assignees.find(a => a.userId == item.id) != null}
                  onClick={() => {
                    if (assignees.find(a => a.userId == item.id)) {
                      setAssignees(assignees.filter(i => i.userId !== item.id))
                    } else {
                      setAssignees([...assignees, { userId: item.id }])
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
                    value={item.id}
                    key={item.displayName}
                    onClick={() => {
                      setAssignedTo(item.id)
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
              onChange={e => {
                setDueDate(e.target.value)
              }}
            />
            <FormHelperText>{errors.dueDate}</FormHelperText>
          </FormControl>
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
            Receive notifications for this task
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
              {
                title: 'Overdue',
                description: 'A notification when a task is overdue',
              },
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
          </Card>
        </Box>
      )}
      <Box mt={2}>
        <Typography level='h4'>Labels :</Typography>
        <Typography level='h5'>
          Things to remember about this chore or to tag it
        </Typography>
        <FreeSoloCreateOption
          options={labels}
          onSelectChange={changes => {
            const newLabels = []
            changes.map(change => {
              // if type is string :
              if (typeof change === 'string') {
                // add the change to the labels array:
                newLabels.push(change)
              } else {
                newLabels.push(change.inputValue)
              }
            })
            setLabels(newLabels)
          }}
        />
      </Box>
      {choreId > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
      {/* <ChoreHistory ChoreHistory={choresHistory} UsersData={performers} /> */}
    </Container>
  )
}

export default ChoreEdit
