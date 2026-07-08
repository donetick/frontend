import {
  EventBusy,
  EventNote,
  HourglassEmpty,
  PriorityHigh,
  TrendingUp,
  WatchLater,
} from '@mui/icons-material'
import { Box, Button, Chip, Sheet, Typography } from '@mui/joy'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TASK_COLOR } from '../../utils/Colors'

// Static insight filter definitions – used for URL restoration
export const INSIGHT_FILTER_DEFS = {
  overdue: {
    name: 'Overdue',
    filter: {
      conditions: [{ type: 'dueDate', operator: 'isOverdue', value: null }],
      operator: 'AND',
    },
  },
  'due-today': {
    name: 'Due Today',
    filter: {
      conditions: [{ type: 'dueDate', operator: 'isDueToday', value: null }],
      operator: 'AND',
    },
  },
  'pending-approval': {
    name: 'Pending Approval',
    filter: {
      conditions: [{ type: 'status', operator: 'is', value: 3 }],
      operator: 'AND',
    },
  },
  'due-this-week': {
    name: 'Due This Week',
    filter: {
      conditions: [{ type: 'dueDate', operator: 'isDueThisWeek', value: null }],
      operator: 'AND',
    },
  },
  'high-priority': {
    name: 'High Priority',
    filter: {
      conditions: [{ type: 'priority', operator: 'is', value: [1, 2] }],
      operator: 'AND',
    },
  },
  'no-due-date': {
    name: 'No Due Date',
    filter: {
      conditions: [{ type: 'dueDate', operator: 'hasNoDueDate', value: null }],
      operator: 'AND',
    },
  },
}

const SmartInsightsCard = ({
  chores,
  applyTempFilter,
  clearTempFilter,
  tempFilter,
}) => {
  const { t } = useTranslation('chores')
  // Detect all possible insights from chores
  const insights = useMemo(() => {
    if (!chores || chores.length === 0) return []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const detectedInsights = []

    // 1. Overdue tasks (Highest Priority)
    const overdueTasks = chores.filter(
      chore => chore.nextDueDate && new Date(chore.nextDueDate) < now,
    )
    if (overdueTasks.length > 0) {
      detectedInsights.push({
        id: 'overdue',
        priority: 1,
        count: overdueTasks.length,
        title: t('sidepanel.insights.items.overdue.title'),
        description: t('sidepanel.insights.items.overdue.description', {
          count: overdueTasks.length,
        }),
        color: 'danger',
        bgColor: TASK_COLOR.OVERDUE,
        icon: <WatchLater />,
        filter: {
          conditions: [
            {
              type: 'dueDate',
              operator: 'isOverdue',
              value: null,
            },
          ],
          operator: 'AND',
        },
      })
    }

    // 2. Due today (High Priority)
    const dueTodayTasks = chores.filter(
      chore =>
        chore.nextDueDate &&
        new Date(chore.nextDueDate).toDateString() === today.toDateString(),
    )
    if (dueTodayTasks.length > 0) {
      detectedInsights.push({
        id: 'due-today',
        priority: 2,
        count: dueTodayTasks.length,
        title: t('sidepanel.insights.items.dueToday.title'),
        description: t('sidepanel.insights.items.dueToday.description', {
          count: dueTodayTasks.length,
        }),
        color: 'warning',
        bgColor: '#FFA500',
        icon: <EventNote />,
        filter: {
          conditions: [
            {
              type: 'dueDate',
              operator: 'isDueToday',
              value: null,
            },
          ],
          operator: 'AND',
        },
      })
    }

    // 3. Pending approval (High Priority)
    const pendingApprovalTasks = chores.filter(chore => chore.status === 3)
    if (pendingApprovalTasks.length > 0) {
      detectedInsights.push({
        id: 'pending-approval',
        priority: 3,
        count: pendingApprovalTasks.length,
        title: t('sidepanel.insights.items.pendingApproval.title'),
        description: t(
          'sidepanel.insights.items.pendingApproval.description',
          {
            count: pendingApprovalTasks.length,
          },
        ),
        color: 'neutral',
        bgColor: TASK_COLOR.PENDING_REVIEW,
        icon: <HourglassEmpty />,
        filter: {
          conditions: [
            {
              type: 'status',
              operator: 'is',
              value: 3,
            },
          ],
          operator: 'AND',
        },
      })
    }

    // 4. Due this week (excluding today) (Medium Priority)
    const dueThisWeekTasks = chores.filter(chore => {
      if (!chore.nextDueDate) return false
      const dueDate = new Date(chore.nextDueDate)
      return dueDate >= tomorrow && dueDate < nextWeek
    })
    if (dueThisWeekTasks.length > 0) {
      detectedInsights.push({
        id: 'due-this-week',
        priority: 4,
        count: dueThisWeekTasks.length,
        title: t('sidepanel.insights.items.dueThisWeek.title'),
        description: t('sidepanel.insights.items.dueThisWeek.description', {
          count: dueThisWeekTasks.length,
        }),
        color: 'primary',
        bgColor: TASK_COLOR.IN_PROGRESS,
        icon: <TrendingUp />,
        filter: {
          conditions: [
            {
              type: 'dueDate',
              operator: 'isDueThisWeek',
              value: null,
            },
          ],
          operator: 'AND',
        },
      })
    }

    // 5. High priority tasks (Medium Priority)
    const highPriorityTasks = chores.filter(
      chore => chore.priority === 1 || chore.priority === 2,
    )
    if (highPriorityTasks.length > 0) {
      detectedInsights.push({
        id: 'high-priority',
        priority: 5,
        count: highPriorityTasks.length,
        title: t('sidepanel.insights.items.highPriority.title'),
        description: t('sidepanel.insights.items.highPriority.description', {
          count: highPriorityTasks.length,
        }),
        color: 'warning',
        bgColor: '#FF6B6B',
        icon: <PriorityHigh />,
        filter: {
          conditions: [
            {
              type: 'priority',
              operator: 'is',
              value: [1, 2],
            },
          ],
          operator: 'AND',
        },
      })
    }

    // 6. No due date (Lower Priority)
    const noDueDateTasks = chores.filter(
      chore => !chore.nextDueDate || chore.nextDueDate === null,
    )
    if (noDueDateTasks.length > 0) {
      detectedInsights.push({
        id: 'no-due-date',
        priority: 6,
        count: noDueDateTasks.length,
        title: t('sidepanel.insights.items.noDueDate.title'),
        description: t('sidepanel.insights.items.noDueDate.description', {
          count: noDueDateTasks.length,
        }),
        color: 'neutral',
        bgColor: '#9E9E9E',
        icon: <EventBusy />,
        filter: {
          conditions: [
            {
              type: 'dueDate',
              operator: 'hasNoDueDate',
              value: null,
            },
          ],
          operator: 'AND',
        },
      })
    }

    // Sort by priority and return top 3
    return detectedInsights.sort((a, b) => a.priority - b.priority).slice(0, 3)
  }, [chores, t])

  const handleInsightClick = insight => {
    // Toggle: if already active, clear it; otherwise apply it
    if (isInsightActive(insight)) {
      clearTempFilter()
    } else {
      applyTempFilter(insight.filter, {
        id: insight.id,
        name: insight.title,
        description: insight.description,
        icon: insight.icon,
        color: insight.color,
      })
    }
  }

  const isInsightActive = insight => {
    if (!tempFilter || !tempFilter.conditions) return false
    return (
      JSON.stringify(tempFilter.conditions) ===
      JSON.stringify(insight.filter.conditions)
    )
  }

  if (insights.length === 0) {
    return null
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
        width: '315px',
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
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp color='' />
            <Typography level='title-md'>
              {t('sidepanel.insights.title')}
            </Typography>
          </Box>
          {tempFilter && (
            <Chip size='sm' variant='solid' color='primary'>
              {t('sidepanel.insights.active')}
            </Chip>
          )}
        </Box>
        <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.secondary' }}>
          {tempFilter
            ? t('sidepanel.insights.clearHint')
            : t('sidepanel.insights.description')}
        </Typography>
      </Box>

      {/* Insight Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {insights.map(insight => {
          const isActive = isInsightActive(insight)
          return (
            <Button
              key={insight.id}
              variant={isActive ? 'outlined' : 'soft'}
              color='neutral'
              onClick={() => handleInsightClick(insight)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                p: 1.5,
                height: 'auto',
                borderRadius: 12,
                transition: 'all 0.2s ease',
                border: isActive ? '2px solid' : '2px solid transparent',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  mb: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {insight.icon}
                  <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                    {insight.title}
                  </Typography>
                </Box>
                <Chip
                  size='sm'
                  variant='solid'
                  color={insight.color}
                  sx={{
                    minWidth: 32,
                    fontWeight: 700,
                  }}
                >
                  {insight.count}
                </Chip>
              </Box>
              <Typography
                level='body-xs'
                sx={{
                  textAlign: 'left',
                  opacity: 0.9,
                }}
              >
                {isActive ? `✓ ${insight.description}` : insight.description}
              </Typography>
            </Button>
          )
        })}
      </Box>
    </Sheet>
  )
}

export default SmartInsightsCard
