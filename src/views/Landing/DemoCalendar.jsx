import { Card, Grid, Typography } from '@mui/joy'
import moment from 'moment'
import CalendarView from '../components/CalendarView'

const DemoCalendar = () => {
  // Generate sample chore data across different dates
  const generateSampleChores = () => {
    const today = moment()
    const chores = []
    
    // High priority tasks
    chores.push({
      id: 1,
      name: '🧹 Deep Clean Living Room',
      priority: 1,
      nextDueDate: today.clone().add(2, 'days').hour(10).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    chores.push({
      id: 2,
      name: '🚗 Car Maintenance Check',
      priority: 1,
      nextDueDate: today.clone().add(5, 'days').hour(14).minute(30).toISOString(),
      assignedTo: 1,
    })
    
    // Medium priority tasks
    chores.push({
      id: 3,
      name: '🌱 Water Indoor Plants',
      priority: 2,
      nextDueDate: today.clone().add(1, 'days').hour(8).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    chores.push({
      id: 4,
      name: '🛒 Weekly Grocery Shopping',
      priority: 2,
      nextDueDate: today.clone().add(3, 'days').hour(16).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    chores.push({
      id: 5,
      name: '📧 Organize Email Inbox',
      priority: 2,
      nextDueDate: today.clone().add(7, 'days').hour(11).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    // Low priority tasks
    chores.push({
      id: 6,
      name: '📚 Organize Bookshelf',
      priority: 3,
      nextDueDate: today.clone().add(4, 'days').hour(15).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    chores.push({
      id: 7,
      name: '🎨 Paint Bedroom Wall',
      priority: 3,
      nextDueDate: today.clone().add(10, 'days').hour(9).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    // Tasks for today
    chores.push({
      id: 8,
      name: '🍽️ Do Dishes',
      priority: 2,
      nextDueDate: today.clone().hour(19).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    chores.push({
      id: 9,
      name: '🗑️ Take Out Trash',
      priority: 1,
      nextDueDate: today.clone().hour(7).minute(30).toISOString(),
      assignedTo: 1,
    })
    
    // Tasks with no priority
    chores.push({
      id: 10,
      name: '🎵 Practice Guitar',
      priority: null,
      nextDueDate: today.clone().add(6, 'days').hour(18).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    // Multiple tasks on same day
    chores.push({
      id: 11,
      name: '🧺 Do Laundry',
      priority: 2,
      nextDueDate: today.clone().add(2, 'days').hour(12).minute(0).toISOString(),
      assignedTo: 1,
    })
    
    chores.push({
      id: 12,
      name: '🏃 Morning Jog',
      priority: 3,
      nextDueDate: today.clone().add(2, 'days').hour(6).minute(30).toISOString(),
      assignedTo: 1,
    })
    
    return chores
  }

  const sampleChores = generateSampleChores()

  return (
    <>
      <Grid item xs={12} sm={7} data-aos-calendar-demo-section>
        <div
          data-aos-delay={100}
          data-aos-anchor='[data-aos-calendar-demo-section]'
          data-aos='fade-up'
        >
          <CalendarView chores={sampleChores} />
        </div>
      </Grid>
      <Grid item xs={12} sm={5} data-aos-calendar-description>
        <Card
          sx={{
            p: 4,
            py: 6,
            height: 'fit-content',
          }}
          data-aos-delay={200}
          data-aos-anchor='[data-aos-calendar-description]'
          data-aos='fade-left'
        >
          <Typography level='h3' textAlign='center' sx={{ mt: 2, mb: 4 }}>
            Visual Task Calendar
          </Typography>
          <Typography level='body-lg' textAlign='center' sx={{ mb: 4 }}>
            Get a bird's-eye view of all your tasks with the interactive calendar. 
            See priority-coded dots for each day, click to view detailed task lists, 
            and easily track your upcoming responsibilities. The color-coded priority 
            system helps you focus on what matters most.
          </Typography>
        </Card>
      </Grid>
    </>
  )
}

export default DemoCalendar