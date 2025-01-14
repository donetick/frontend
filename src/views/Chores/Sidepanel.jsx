import { Box, Sheet } from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'
import { ChoresGrouper } from '../../utils/Chores'
import CalendarView from '../components/CalendarView'

const Sidepanel = ({ chores }) => {
  const isLargeScreen = useMediaQuery(theme => theme.breakpoints.up('md'))
  const [dueDatePieChartData, setDueDatePieChartData] = useState([])

  useEffect(() => {
    setDueDatePieChartData(generateChoreDuePieChartData(chores))
  }, [])

  const generateChoreDuePieChartData = chores => {
    const groups = ChoresGrouper('due_date', chores)
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
    <Sheet
      variant='outlined'
      sx={{
        p: 2,
        // borderRadius: 'sm',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mr: 10,
        justifyContent: 'space-between',
        boxShadow: 'sm',
        borderRadius: 20,

        // minimum height to fit the content:
        height: '80vh',
        width: '290px',
      }}
    >
      {/* <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <PieChart width={200} height={200}>
          <Pie
            data={dueDatePieChartData}
            dataKey='value'
            nameKey='label'
            innerRadius={30}
            paddingAngle={5}
            cornerRadius={5}
          >
            {dueDatePieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>

          <Legend
            layout='horizontal'
            align='center'
            iconType='circle'
            iconSize={8}
            fontSize={12}
            formatter={(label, value) => `${label}: ${value.payload.value}`}
            wrapperStyle={{ paddingTop: 0, marginTop: 0 }} // Adjust padding and margin
          />
          <Tooltip />
        </PieChart>
      </Box> */}
      <Box sx={{ width: '100%' }}>
        <CalendarView chores={chores} />
      </Box>
    </Sheet>
  )
}

export default Sidepanel
