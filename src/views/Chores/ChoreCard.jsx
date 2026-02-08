import {
  Check,
  Group,
  HourglassEmpty,
  Pause,
  PlayArrow,
  Repeat,
  ThumbUp,
  TimesOneMobiledata,
  Toll,
  Webhook,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Card,
  Checkbox,
  Chip,
  Grid,
  IconButton,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { useUserProfile } from '../../queries/UserQueries.jsx'
import { notInCompletionWindow } from '../../utils/Chores.jsx'
import { getTextColorFromBackgroundColor } from '../../utils/Colors.jsx'
import Priorities from '../../utils/Priorities'
import ChoreActionMenu from '../components/ChoreActionMenu'
const ChoreCard = ({
  chore,
  performers,
  sx,
  viewOnly,
  showActions = true,
  onChipClick,
  onAction,
  // Multi-select props
  isMultiSelectMode = false,
  isSelected = false,
  onSelectionToggle,
}) => {
  const { data: userProfile } = useUserProfile()

  const { impersonatedUser } = useImpersonateUser()

  // Check if the current user can approve/reject (admin, manager, or task owner)
  const canApproveReject = () => {
    if (!performers || !chore) return false

    const currentUser = performers.find(
      member => member.userId === (impersonatedUser?.userId || userProfile?.id),
    )

    // User can approve/reject if they are:
    // 1. Admin or manager of the circle
    // 2. Owner/creator of the task
    return (
      currentUser?.role === 'admin' ||
      currentUser?.role === 'manager' ||
      chore.createdBy === (impersonatedUser?.userId || userProfile?.id)
    )
  }

  const getDueDateChipText = nextDueDate => {
    if (chore.nextDueDate === null) return 'No Due Date'
    // if due in next 48 hours, we should it in this format : Tomorrow 11:00 AM
    const diff = moment(nextDueDate).diff(moment(), 'hours')
    if (diff < 48 && diff > 0) {
      return moment(nextDueDate).calendar().replace(' at', '')
    }
    return 'Due ' + moment(nextDueDate).fromNow()
  }
  const getDueDateChipColor = nextDueDate => {
    if (chore.nextDueDate === null) return 'neutral'
    const diff = moment(nextDueDate).diff(moment(), 'hours')
    if (diff < 48 && diff > 0) {
      return 'warning'
    }
    if (diff < 0) {
      return 'danger'
    }

    return 'neutral'
  }

  const getRecurrentChipText = chore => {
    // if chore.frequencyMetadata is type string then parse it otherwise assigned to the metadata:
    const metadata =
      typeof chore.frequencyMetadata === 'string'
        ? JSON.parse(chore.frequencyMetadata)
        : chore.frequencyMetadata

    const dayOfMonthSuffix = n => {
      if (n >= 11 && n <= 13) {
        return 'th'
      }
      switch (n % 10) {
        case 1:
          return 'st'
        case 2:
          return 'nd'
        case 3:
          return 'rd'
        default:
          return 'th'
      }
    }
    if (chore.frequencyType === 'once') {
      return 'Once'
    } else if (chore.frequencyType === 'trigger') {
      return 'Trigger'
    } else if (chore.frequencyType === 'daily') {
      return 'Daily'
    } else if (chore.frequencyType === 'adaptive') {
      return 'Adaptive'
    } else if (chore.frequencyType === 'weekly') {
      return 'Weekly'
    } else if (chore.frequencyType === 'monthly') {
      return 'Monthly'
    } else if (chore.frequencyType === 'yearly') {
      return 'Yearly'
    } else if (chore.frequencyType === 'days_of_the_week') {
      let days = metadata.days
      if (days.length > 4) {
        const allDays = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ]
        const selectedDays = days.map(d => moment().day(d).format('dddd'))
        const notSelectedDay = allDays.filter(
          day => !selectedDays.includes(day),
        )
        const notSelectedShortdays = notSelectedDay.map(d =>
          moment().day(d).format('ddd'),
        )
        return `Daily except ${notSelectedShortdays.join(', ')}`
      } else {
        days = days.map(d => moment().day(d).format('ddd'))
        return days.join(', ')
      }
    } else if (chore.frequencyType === 'day_of_the_month') {
      let months = metadata.months
      if (months.length > 6) {
        const allMonths = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]
        const selectedMonths = months.map(m => moment().month(m).format('MMMM'))
        const notSelectedMonth = allMonths.filter(
          month => !selectedMonths.includes(month),
        )
        const notSelectedShortMonths = notSelectedMonth.map(m =>
          moment().month(m).format('MMM'),
        )
        let result = `Monthly ${chore.frequency}${dayOfMonthSuffix(
          chore.frequency,
        )}`
        if (notSelectedShortMonths.length > 0)
          result += `
        except ${notSelectedShortMonths.join(', ')}`
        return result
      } else {
        let freqData = metadata
        const months = freqData.months.map(m => moment().month(m).format('MMM'))
        return `${chore.frequency}${dayOfMonthSuffix(
          chore.frequency,
        )} of ${months.join(', ')}`
      }
    } else if (chore.frequencyType === 'interval') {
      return `Every ${chore.frequency} ${metadata.unit}`
    } else {
      return chore.frequencyType
    }
  }

  const getFrequencyIcon = chore => {
    if (['once', 'no_repeat'].includes(chore.frequencyType)) {
      return <TimesOneMobiledata />
    } else if (chore.frequencyType === 'trigger') {
      return <Webhook />
    } else {
      return <Repeat />
    }
  }
  const getName = name => {
    const split = Array.from(chore.name)
    // if the first character is emoji then remove it from the name
    if (/\p{Emoji}/u.test(split[0])) {
      return split.slice(1).join('').trim()
    }
    return name
  }
  return (
    <Box key={chore.id + '-box'} minWidth={'100%'}>
      <Chip
        variant='soft'
        sx={{
          position: 'relative',
          top: 10,
          zIndex: 3,
          left: 10,
        }}
        color={getDueDateChipColor(chore.nextDueDate)}
      >
        {getDueDateChipText(chore.nextDueDate)}
      </Chip>

      <Chip
        variant='soft'
        sx={{
          position: 'relative',
          top: 10,
          zIndex: 3,
          ml: 0.4,
          left: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getFrequencyIcon(chore)}
          {getRecurrentChipText(chore)}
        </div>
      </Chip>

      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 20,
        }}
      >
        <Card
          style={viewOnly ? { pointerEvents: 'none' } : {}}
          variant='plain'
          sx={{
            ...sx,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 2,
            boxShadow: 'sm',
            borderRadius: 20,
            key: `${chore.id}-card`,
            position: 'relative',
            backgroundColor: 'background.surface',
            border: '1px solid',
            borderColor: 'divider',
            cursor: isMultiSelectMode ? 'pointer' : 'default',
            '&:hover': {
              boxShadow: 'md',
              borderColor: isMultiSelectMode ? 'primary.500' : 'primary.300',
            },
            // Add padding when in multi-select mode to account for checkbox
            pl: isMultiSelectMode ? 6 : 2,
            // Visual feedback when selected
            ...(isMultiSelectMode &&
              isSelected && {
                borderColor: 'primary.500',
                backgroundColor: 'primary.softBg',
                boxShadow: 'sm',
              }),
          }}
        >
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <Checkbox
              checked={isSelected}
              onChange={onSelectionToggle}
              sx={{
                position: 'absolute',
                top: '50%',
                left: 12,
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'background.surface',
                borderRadius: 'md',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'background.level1',
                  borderColor: 'primary.300',
                },
                '&.Mui-checked': {
                  bgcolor: 'primary.500',
                  borderColor: 'primary.500',
                  color: 'primary.solidColor',
                  '&:hover': {
                    bgcolor: 'primary.600',
                    borderColor: 'primary.600',
                  },
                },
              }}
              onClick={e => e.stopPropagation()}
            />
          )}
          <Grid container>
            <Grid
              xs={9}
              sx={{ cursor: 'pointer' }}
              // onClick={() => {
              //   if (isMultiSelectMode) {
              //     onSelectionToggle()
              //   } else {
              //     navigate(`/chores/${chore.id}`)
              //   }
              // }}
            >
              {/* Box in top right with Chip showing next due date  */}
              <Box display='flex' justifyContent='start' alignItems='center'>
                <Avatar sx={{ mr: 1, fontSize: 22 }}>
                  {Array.from(chore.name)[0]}
                </Avatar>
                <Box display='flex' flexDirection='column'>
                  <Typography level='title-md'>
                    {getName(chore.name)}
                  </Typography>
                  {chore.assignedTo && chore.assignedTo !== userProfile?.id && (
                    <Box display='flex' alignItems='center' gap={0.5}>
                      <Chip
                        variant='outlined'
                        startDecorator={
                          <Avatar
                            src={
                              performers.find(
                                p => p.userId === chore.assignedTo,
                              )?.image
                            }
                          />
                        }
                      >
                        {
                          performers.find(p => p.userId === chore.assignedTo)
                            ?.displayName
                        }
                      </Chip>
                    </Box>
                  )}
                  {chore.assignedTo === null && (
                    <Box display='flex' alignItems='center' gap={0.5}>
                      <Chip variant='outlined' startDecorator={<Group />}>
                        Anyone
                      </Chip>
                    </Box>
                  )}
                  <Box key={`${chore.id}-labels`}>
                    {chore.priority > 0 && (
                      <Chip
                        sx={{
                          position: 'relative',
                          mr: 0.5,
                          top: 2,
                          zIndex: 1,
                        }}
                        color={
                          chore.priority === 1
                            ? 'danger'
                            : chore.priority === 2
                              ? 'warning'
                              : 'neutral'
                        }
                        startDecorator={
                          Priorities.find(p => p.value === chore.priority)?.icon
                        }
                        onClick={e => {
                          e.stopPropagation()
                          onChipClick({ priority: chore.priority })
                        }}
                      >
                        P{chore.priority}
                      </Chip>
                    )}
                    {/* show points chip if there is points assigned */}
                    {chore.points > 0 && (
                      <Chip
                        sx={{
                          position: 'relative',
                          mr: 0.5,
                          top: 2,
                          zIndex: 1,
                        }}
                        color='success'
                        startDecorator={<Toll />}
                      >
                        {chore.points}
                      </Chip>
                    )}
                    {chore.labelsV2?.map((l, index) => {
                      return (
                        <div
                          role='none'
                          tabIndex={0}
                          onClick={e => {
                            e.stopPropagation()
                            onChipClick({ label: l })
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              onChipClick({ label: l })
                            }
                          }}
                          style={{ display: 'inline-block', cursor: 'pointer' }} // Make the wrapper clickable
                          key={`chorecard-${chore.id}-label-${l.id}`}
                        >
                          <Chip
                            variant='solid'
                            color='primary'
                            sx={{
                              position: 'relative',
                              ml: index === 0 ? 0 : 0.5,
                              top: 2,
                              zIndex: 1,
                              backgroundColor: `${l?.color} !important`,
                              color: getTextColorFromBackgroundColor(l?.color),

                              // apply background color for th clickable button:
                            }}
                            // onClick={e => {
                            //   e.stopPropagation()
                            //   onChipClick({ label: l })
                            // }}

                            // startDecorator={getIconForLabel(label)}
                          >
                            {l?.name}
                          </Chip>
                        </div>
                      )
                    })}
                  </Box>
                </Box>
              </Box>
              {/* <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Chip variant='outlined'>
            {chore.nextDueDate === null
              ? '--'
              : 'Due ' + moment(chore.nextDueDate).fromNow()}
          </Chip>
        </Box> */}
            </Grid>
            <Grid
              xs={3}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {showActions && (
                <Box
                  display='flex'
                  justifyContent='flex-end'
                  alignItems='flex-end'
                >
                  {/* <ButtonGroup> */}
                  {chore.status === 3 ? (
                    // Pending approval: Show approve/reject for admins/managers/owners, grayed out for others
                    canApproveReject() ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          variant='soft'
                          color='success'
                          onClick={e => {
                            e.stopPropagation()
                            onAction('approve', chore)
                          }}
                          sx={{
                            borderRadius: '50%',
                            minWidth: 50,
                            height: 50,
                            zIndex: 1,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                            },
                            '&:disabled': {
                              opacity: 0.5,
                              transform: 'none',
                            },
                          }}
                        >
                          <ThumbUp sx={{ fontSize: 18 }} />
                        </IconButton>
                        {/* <IconButton
                        variant='soft'
                        color='danger'
                        onClick={e => {
                          e.stopPropagation()
                          onAction('reject', chore)
                        }}
                        sx={{
                          borderRadius: '50%',
                          minWidth: 40,
                          height: 40,
                          zIndex: 1,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                          },
                          '&:active': {
                            transform: 'scale(0.95)',
                          },
                        }}
                      >
                        <ThumbDown sx={{ fontSize: 18 }} />
                      </IconButton> */}
                      </Box>
                    ) : (
                      <IconButton
                        variant='soft'
                        color='neutral'
                        disabled={true}
                        sx={{
                          borderRadius: '50%',
                          minWidth: 50,
                          height: 50,
                          zIndex: 1,
                          opacity: 0.5,
                        }}
                      >
                        <HourglassEmpty />
                      </IconButton>
                    )
                  ) : (
                    <IconButton
                      variant={chore.status === 0 ? 'solid' : 'soft'}
                      color={chore.status === 0 ? 'success' : 'warning'}
                      onClick={e => {
                        e.stopPropagation()
                        switch (chore.status) {
                          case 0: // Not started
                            onAction('complete', chore)
                            break
                          case 1: // In progress
                            onAction('pause', chore)
                            break
                          case 2: // Paused
                            onAction('start', chore)
                            break
                          default:
                            break
                        }
                      }}
                      disabled={notInCompletionWindow(chore)}
                      sx={{
                        borderRadius: '50%',
                        minWidth: 50,
                        height: 50,
                        zIndex: 1,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                        '&:active': {
                          transform: 'scale(0.95)',
                        },
                        '&:disabled': {
                          opacity: 0.5,
                          transform: 'none',
                        },
                      }}
                    >
                      <div className='relative grid place-items-center'>
                        {chore.status === 0 ? (
                          <Check />
                        ) : chore.status === 1 ? (
                          <Pause />
                        ) : (
                          <PlayArrow />
                        )}
                      </div>
                    </IconButton>
                  )}
                  <ChoreActionMenu
                    chore={chore}
                    onCompleteWithNote={() =>
                      onAction('completeWithNote', chore)
                    }
                    onCompleteWithPastDate={() =>
                      onAction('completeWithPastDate', chore)
                    }
                    onAction={(type, chore, extraData) =>
                      onAction(type, chore, extraData)
                    }
                    onChangeAssignee={() => onAction('changeAssignee', chore)}
                    onChangeDueDate={() => onAction('changeDueDate', chore)}
                    onWriteNFC={() => onAction('writeNFC', chore)}
                    onNudge={() => onAction('nudge', chore)}
                    onDelete={() => onAction('delete', chore)}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Box>
  )
}

export default ChoreCard
