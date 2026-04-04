import {
  CheckCircle,
  EventNote,
  HourglassEmpty,
  Notes,
  Person,
  Redo,
  Refresh,
  ThumbDown,
  Timelapse,
  Toll,
  WatchLater,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChores, useChoresHistory } from '../../queries/ChoreQueries'
import { useCircleMembers } from '../../queries/UserQueries'
import { resolvePhotoURL } from '../../utils/Helpers'
import NoteViewerModal from '../Modals/Inputs/NoteViewerModal'

const ActivityItem = ({ activity, members, onViewNote }) => {
  const { t } = useTranslation(['chores', 'common'])
  // Find the member who completed the activity
  const completedByMember = members?.find(
    member => member.userId === activity.completedBy,
  )

  // Strip HTML tags from notes for plain text display
  const stripHtmlTags = html => {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  const plainTextNotes = activity.notes ? stripHtmlTags(activity.notes) : ''

  // Calculate if notes should be truncated (more than 2 lines in the UI, which is roughly 100 characters)
  const shouldTruncate = plainTextNotes && plainTextNotes.length > 80

  const getTimeDisplay = dateToDisplay => {
    const now = moment()
    const completed = moment(dateToDisplay)
    const diffInHours = now.diff(completed, 'hours')
    const diffInDays = now.diff(completed, 'days')

    if (diffInHours < 1) {
      return t('chores:sidepanel.activities.justNow')
    } else if (diffInHours < 24) {
      return t('chores:sidepanel.activities.hoursAgo', { count: diffInHours })
    } else if (diffInDays < 7) {
      return t('chores:sidepanel.activities.daysAgo', { count: diffInDays })
    } else {
      return completed.format('MMM DD')
    }
  }

  const getStatusInfo = activity => {
    if (activity.status === 0) {
      return {
        color: 'primary',
        text: t('chores:sidepanel.activities.status.started'),
        icon: <Timelapse />,
      }
    } else if (activity.status === 1) {
      const wasOnTime =
        !activity.dueDate ||
        moment(activity.performedAt).isSameOrBefore(moment(activity.dueDate))

      if (wasOnTime) {
        return {
          color: 'success',
          text: t('chores:sidepanel.activities.status.done'),
          icon: <CheckCircle />,
        }
      } else {
        return {
          color: 'primary',
          text: t('chores:sidepanel.activities.status.late'),
          icon: <WatchLater />,
        }
      }
    } else if (activity.status === 2) {
      return {
        color: 'warning',
        text: t('chores:sidepanel.activities.status.skipped'),
        icon: <Redo />,
      }
    } else if (activity.status === 3) {
      return {
        color: 'neutral',
        text: t('chores:sidepanel.activities.status.pendingApproval'),
        icon: <HourglassEmpty />,
      }
    } else if (activity.status === 4) {
      return {
        color: 'danger',
        text: t('chores:sidepanel.activities.status.rejected'),
        icon: <ThumbDown />,
      }
    }

    // Fallback for completed status
    return {
      color: 'success',
      text: t('chores:sidepanel.activities.status.completed'),
      icon: <CheckCircle />,
    }
  }

  return (
    <ListItem sx={{ alignItems: 'flex-start', py: 0.5 }}>
      <ListItemDecorator sx={{ mt: 0.5 }}>
        <Avatar
          size='sm'
          src={resolvePhotoURL(completedByMember?.image)}
          sx={{ width: 32, height: 32 }}
        >
          {completedByMember?.displayName?.charAt(0) ||
            completedByMember?.name?.charAt(0) || <Person />}
        </Avatar>
      </ListItemDecorator>

      <ListItemContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Activity header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography level='title-sm' sx={{ flex: 1 }}>
              {activity.choreName}
            </Typography>
            <Typography level='body-xs' color='text.secondary'>
              {getTimeDisplay(
                activity.performedAt ||
                  activity.updatedAt ||
                  activity.createdAt,
              )}
            </Typography>
          </Box>

          {/* Who completed it */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Status chip */}

            <Chip
              size='sm'
              variant='soft'
              color={getStatusInfo(activity).color}
              startDecorator={getStatusInfo(activity).icon}
            >
              {getStatusInfo(activity).text}
            </Chip>
            <Typography level='body-xs' color='text.secondary' sx={{ ml: 0 }}>
              {t('chores:sidepanel.activities.by')}{' '}
              {completedByMember?.displayName ||
                completedByMember?.name ||
                t('common:status.unknown')}
            </Typography>
            {/* Points chip */}
            {activity.points && activity.points > 0 && (
              <Chip
                size='sm'
                variant='soft'
                color='success'
                startDecorator={<Toll />}
              >
                {t('chores:sidepanel.activities.points', {
                  count: activity.points,
                })}
              </Chip>
            )}
          </Box>

          {/* Status, Points, and Notes */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mt: 0.5,
              ml: 2.5,
            }}
          ></Box>

          {/* Notes */}
          {plainTextNotes && (
            <Box sx={{ mt: 0.5, ml: 2.5 }}>
              <Typography
                level='body-xs'
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5,
                  fontStyle: 'italic',
                  color: 'text.secondary',
                }}
              >
                <Notes sx={{ fontSize: 14, mt: 0.1, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    level='body-xs'
                    sx={{
                      fontStyle: 'italic',
                      color: 'text.secondary',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: shouldTruncate ? 2 : 'unset',
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                    }}
                  >
                    {plainTextNotes}
                  </Typography>
                  {shouldTruncate && (
                    <Link
                      level='body-xs'
                      onClick={() => onViewNote(activity.notes)}
                      sx={{
                        cursor: 'pointer',
                        mt: 0.25,
                        display: 'inline-block',
                      }}
                    >
                      {t('chores:sidepanel.activities.showMore')}
                    </Link>
                  )}
                </Box>
              </Typography>
            </Box>
          )}
        </Box>
      </ListItemContent>
    </ListItem>
  )
}

const groupActivitiesByDate = activities => {
  const groups = {}

  activities.forEach(activity => {
    const date = moment(
      activity.performedAt || activity.updatedAt || activity.createdAt,
    ).format('YYYY-MM-DD')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
  })

  return groups
}

const ActivitiesCard = ({ title }) => {
  const { t } = useTranslation(['chores', 'common'])
  const [noteViewerConfig, setNoteViewerConfig] = useState({ isOpen: false })
  const resolvedTitle = title || t('chores:sidepanel.activities.title')

  // Use hooks to fetch data
  const {
    data: choresData,
    isLoading: isChoresLoading,
    refetch: refetchChores,
  } = useChores(true) // Include archived chores

  const {
    data: choreHistory,
    isLoading: isChoresHistoryLoading,
    refetch: refetchHistory,
  } = useChoresHistory(10, true) // Limit to 10 items, include members

  const {
    data: circleMembersData,
    isLoading: isCircleMembersLoading,
    refetch: refetchMembers,
  } = useCircleMembers()

  // Extract data from responses
  const chores = choresData?.res || []
  const members = circleMembersData?.res || []

  // Refresh function to refetch all data
  const handleRefresh = async () => {
    await Promise.all([refetchChores(), refetchHistory, refetchMembers])
  }

  // Show loading state
  if (isChoresLoading || isChoresHistoryLoading || isCircleMembersLoading) {
    return (
      <Sheet
        variant='plain'
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'sm',
          borderRadius: 20,
          width: '310px',
          minHeight: 300,
          maxHeight: 400,
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography level='title-md'>{resolvedTitle}</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 200,
          }}
        >
          <Typography level='body-sm' color='neutral'>
            {t('chores:sidepanel.activities.loading')}
          </Typography>
        </Box>
      </Sheet>
    )
  }

  // Enrich history with chore names
  const enrichedHistory =
    choreHistory?.map(history => {
      const chore = chores?.find(c => c.id === history.choreId)
      return {
        ...history,
        choreName:
          chore?.name || t('chores:sidepanel.activities.unknownChore'),
      }
    }) || []

  // Sort by completion date (most recent first)
  const sortedHistory = enrichedHistory
    .sort(
      (a, b) =>
        moment(b.performedAt || b.updatedAt).valueOf() -
        moment(a.performedAt || a.updatedAt).valueOf(),
    )
    .slice(0, 10) // Show only latest 10 activities

  const groupedActivities = groupActivitiesByDate(sortedHistory)

  if (!sortedHistory.length) {
    return (
      <Sheet
        variant='plain'
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'sm',
          borderRadius: 20,
          width: '310px',
          minHeight: 300,
          maxHeight: 400,
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EventNote color='' />
          <Typography level='title-md'>{resolvedTitle}</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            color: 'text.secondary',
          }}
        >
          <EventNote sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
          <Typography level='body-sm'>
            {t('chores:sidepanel.activities.empty')}
          </Typography>
        </Box>
      </Sheet>
    )
  }

  return (
    <Sheet
      variant='plain'
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'sm',
        borderRadius: 20,
        width: '310px',
        minHeight: 300,
        maxHeight: 400,
        mb: 1,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventNote color='' />
            <Typography level='title-md'>{resolvedTitle}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size='sm' variant='soft' color='neutral'>
              {sortedHistory.length}
            </Chip>
            <IconButton
              size='sm'
              variant='soft'
              color='neutral'
              onClick={handleRefresh}
              sx={{ minHeight: 24, minWidth: 24 }}
            >
              <Refresh sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Scrollable activity list */}
      <Box sx={{ maxHeight: 280, overflowY: 'auto', flex: 1 }}>
        {Object.entries(groupedActivities).map(([date, activities]) => {
          const isToday = moment(date).isSame(moment(), 'day')
          const isYesterday = moment(date).isSame(
            moment().subtract(1, 'day'),
            'day',
          )

          let dateLabel
          if (isToday) {
            dateLabel = t('common:calendar.today')
          } else if (isYesterday) {
            dateLabel = t('common:calendar.yesterday')
          } else {
            dateLabel = moment(date).format('MMM DD')
          }

          return (
            <Box key={date} sx={{ mb: 1 }}>
              {/* Date separator */}
              <Box sx={{ display: 'flex', alignItems: 'center', my: 1, px: 1 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography
                  level='body-xs'
                  sx={{
                    px: 1,
                    pr: 1,
                    mt: -1,
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {dateLabel}
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              {/* Activities for this date */}
              <List sx={{ py: 0 }}>
                {activities.map(activity => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    members={members}
                    onViewNote={notes => {
                      setNoteViewerConfig({
                        isOpen: true,
                        title: t('chores:sidepanel.activities.noteTitle', {
                          name: activity.choreName,
                        }),
                        content: notes,
                        onClose: () => setNoteViewerConfig({ isOpen: false }),
                      })
                    }}
                  />
                ))}
              </List>
            </Box>
          )
        })}
      </Box>

      <NoteViewerModal config={noteViewerConfig} />
    </Sheet>
  )
}

export default ActivitiesCard
