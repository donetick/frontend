import { CalendarViewDay, Check, Timelapse } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  ListDivider,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  Typography,
} from '@mui/joy'
import moment from 'moment'

export const getCompletedChip = historyEntry => {
  var text = 'No Due Date'
  var color = 'info'
  var icon = <CalendarViewDay />
  // if completed few hours +-6 hours
  if (
    historyEntry.dueDate &&
    historyEntry.completedAt > historyEntry.dueDate - 1000 * 60 * 60 * 6 &&
    historyEntry.completedAt < historyEntry.dueDate + 1000 * 60 * 60 * 6
  ) {
    text = 'On Time'
    color = 'success'
    icon = <Check />
  } else if (
    historyEntry.dueDate &&
    historyEntry.completedAt < historyEntry.dueDate
  ) {
    text = 'On Time'
    color = 'success'
    icon = <Check />
  }

  // if completed after due date then it's late
  else if (
    historyEntry.dueDate &&
    historyEntry.completedAt > historyEntry.dueDate
  ) {
    text = 'Late'
    color = 'warning'
    icon = <Timelapse />
  } else {
    text = 'No Due Date'
    color = 'neutral'
    icon = <CalendarViewDay />
  }

  return (
    <Chip startDecorator={icon} color={color}>
      {text}
    </Chip>
  )
}

const HistoryCard = ({
  allHistory,
  performers,
  historyEntry,
  index,
  onClick,
}) => {
  function formatTimeDifference(startDate, endDate) {
    const diffInMinutes = moment(startDate).diff(endDate, 'minutes')
    let timeValue = diffInMinutes
    let unit = 'minute'

    if (diffInMinutes >= 60) {
      const diffInHours = moment(startDate).diff(endDate, 'hours')
      timeValue = diffInHours
      unit = 'hour'

      if (diffInHours >= 24) {
        const diffInDays = moment(startDate).diff(endDate, 'days')
        timeValue = diffInDays
        unit = 'day'
      }
    }

    return `${timeValue} ${unit}${timeValue !== 1 ? 's' : ''}`
  }

  return (
    <>
      <ListItem sx={{ gap: 1.5, alignItems: 'flex-start' }} onClick={onClick}>
        {' '}
        {/* Adjusted spacing and alignment */}
        <ListItemDecorator>
          <Avatar sx={{ mr: 1 }}>
            {performers
              .find(p => p.userId === historyEntry.completedBy)
              ?.displayName?.charAt(0) || '?'}
          </Avatar>
        </ListItemDecorator>
        <ListItemContent sx={{ my: 0 }}>
          {' '}
          {/* Removed vertical margin */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography level='body1' sx={{ fontWeight: 'md' }}>
              {historyEntry.completedAt
                ? moment(historyEntry.completedAt).format(
                    'ddd MM/DD/yyyy HH:mm',
                  )
                : 'Skipped'}
            </Typography>
            {getCompletedChip(historyEntry)}
          </Box>
          <Typography level='body2' color='text.tertiary'>
            <Chip>
              {
                performers.find(p => p.userId === historyEntry.completedBy)
                  ?.displayName
              }
            </Chip>{' '}
            completed
            {historyEntry.completedBy !== historyEntry.assignedTo && (
              <>
                {', '}
                assigned to{' '}
                <Chip>
                  {
                    performers.find(p => p.userId === historyEntry.assignedTo)
                      ?.displayName
                  }
                </Chip>
              </>
            )}
          </Typography>
          {historyEntry.dueDate && (
            <Typography level='body2' color='text.tertiary'>
              Due: {moment(historyEntry.dueDate).format('ddd MM/DD/yyyy')}
            </Typography>
          )}
          {historyEntry.notes && (
            <Typography level='body2' color='text.tertiary'>
              Note: {historyEntry.notes}
            </Typography>
          )}
        </ListItemContent>
      </ListItem>
      {index < allHistory.length - 1 && (
        <>
          <ListDivider component='li'>
            {/* time between two completion: */}
            {index < allHistory.length - 1 &&
              allHistory[index + 1].completedAt && (
                <Typography level='body3' color='text.tertiary'>
                  {formatTimeDifference(
                    historyEntry.completedAt,
                    allHistory[index + 1].completedAt,
                  )}{' '}
                  before
                </Typography>
              )}
          </ListDivider>
        </>
      )}
    </>
  )
}

export default HistoryCard
