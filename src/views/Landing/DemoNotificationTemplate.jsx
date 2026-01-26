import { Card, Grid, Typography } from '@mui/joy'
import NotificationTemplate from '../../components/NotificationTemplate'

const DemoNotificationTemplate = () => {
  const demoNotifications = [
    { value: -3, unit: 'd' }, // 3 days before
    { value: 0, unit: 'm' }, // On due
    { value: 1, unit: 'd' }, // 1 day after
  ]

  const handleNotificationChange = data => {
    // Demo handler - doesn't need to do anything
    console.log('Demo notification change:', data)
  }

  return (
    <>
      <Grid item xs={12} sm={7} data-aos-notification-template-list>
        <div
          data-aos-delay={100}
          data-aos-anchor='[data-aos-notification-template-list]'
          data-aos='fade-up'
        >
          <NotificationTemplate
            value={{ templates: demoNotifications }}
            onChange={handleNotificationChange}
            maxNotifications={5}
            showTimeline={false}
          />
        </div>
      </Grid>
      <Grid item xs={12} sm={5} data-aos-notification-demo-section>
        <Card
          sx={{
            p: 4,
            py: 6,
            height: 'fit-content',
          }}
          data-aos-delay={200}
          data-aos-anchor='[data-aos-notification-demo-section]'
          data-aos='fade-left'
        >
          <Typography level='h3' textAlign='center' sx={{ mt: 2, mb: 4 }}>
            Smart Notification Scheduling
          </Typography>
          <Typography level='body-lg' textAlign='center' sx={{ mb: 4 }}>
            Set up intelligent reminders for your tasks with flexible timing
            options. Get notified before, on, or after due dates with
            customizable intervals.
          </Typography>
        </Card>
      </Grid>
    </>
  )
}

export default DemoNotificationTemplate
