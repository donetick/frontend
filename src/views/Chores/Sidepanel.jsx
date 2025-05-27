import { Box, Sheet } from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'
import { ChoresGrouper } from '../../utils/Chores'
import CalendarView from '../components/CalendarView'
import WelcomeCard from './WelcomeCard'

const Sidepanel = ({ chores }) => {
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('md'))
  const [dueDatePieChartData, setDueDatePieChartData] = useState([])

  useEffect(() => {
    setDueDatePieChartData(generateChoreDuePieChartData(chores))
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

  if (!isLargeScreen) {
    return null
  }
  return (
    <Box>
      <WelcomeCard chores={chores} />
      <Sheet
        variant='plain'
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mr: 10,
          justifyContent: 'space-between',
          boxShadow: 'sm',
          borderRadius: 20,
          height: '80vh',
          width: '290px',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <CalendarView chores={chores} />
        </Box>
      </Sheet>
    </Box>
  )
}

export default Sidepanel
