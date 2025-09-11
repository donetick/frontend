import { Box, Sheet } from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'
import { useChoresHistory } from '../../queries/ChoreQueries'
import { ChoresGrouper } from '../../utils/Chores'
import { getSidepanelConfig } from '../../utils/SidepanelConfig'
import CalendarCard from '../components/CalendarCard'
import ActivitiesCard from './ActivitesCard'
import TasksByAssigneeCard from './TasksByAssigneeCard'
import UserSwitcher from './UserSwitcher'

const Sidepanel = ({ chores }) => {
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('lg'))
  const [dueDatePieChartData, setDueDatePieChartData] = useState([])
  const [sidepanelConfig, setSidepanelConfig] = useState([])
  const {
    data: choresHistory,
    isChoresHistoryLoading,
    handleLimitChange: refetchHistory,
  } = useChoresHistory(7, true)

  useEffect(() => {
    setDueDatePieChartData(generateChoreDuePieChartData(chores))
    setSidepanelConfig(getSidepanelConfig())
  }, [])

  useEffect(() => {
    const handleConfigChange = () => {
      setSidepanelConfig(getSidepanelConfig())
    }

    window.addEventListener('sidepanelConfigChanged', handleConfigChange)
    return () => {
      window.removeEventListener('sidepanelConfigChanged', handleConfigChange)
    }
  }, [])

  const generateChoreDuePieChartData = chores => {
    const groups = ChoresGrouper('due_date', chores, null)
    return groups
      .map(group => {
        return {
          label: group.name,
          value: group.content.length,
          color: group.color,
          id: group.name,
        }
      })
      .filter(item => item.value > 0)
  }

  const renderCard = cardConfig => {
    if (!cardConfig.enabled) return null

    switch (cardConfig.id) {
      case 'welcome':
        return <UserSwitcher key='welcome' chores={chores} />
      case 'assignees':
        return <TasksByAssigneeCard key='assignees' chores={chores} />
      case 'calendar':
        return (
          <Sheet
            key='calendar'
            variant='plain'
            sx={{
              my: 1,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mr: 10,
              justifyContent: 'space-between',
              boxShadow: 'sm',
              borderRadius: 20,
              width: '315px',
            }}
          >
            <Box
              sx={{ width: '100%', overflowY: 'hidden', overflowX: 'hidden' }}
            >
              <CalendarCard chores={chores} />
            </Box>
          </Sheet>
        )
      case 'activities':
        return (
          <ActivitiesCard
            key='activities'
            chores={chores}
            choreHistory={choresHistory}
          />
        )

      default:
        return null
    }
  }

  if (!isLargeScreen) {
    return null
  }

  const sortedCards = [...sidepanelConfig].sort((a, b) => a.order - b.order)

  return <Box>{sortedCards.map(cardConfig => renderCard(cardConfig))}</Box>
}

export default Sidepanel
