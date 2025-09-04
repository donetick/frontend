import { Box, Container, Grid } from '@mui/joy'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CookiePermissionSnackbar from './CookiePermissionSnackbar'
import DemoAssignee from './DemoAssignee'
import DemoHistory from './DemoHistory'
import DemoMyChore from './DemoMyChore'
import DemoNotificationTemplate from './DemoNotificationTemplate'
import DemoScheduler from './DemoScheduler'
import FeaturesSection from './FeaturesSection'
import Footer from './Footer'
import GettingStarted from './GettingStarted'
import HomeHero from './HomeHero'
import TabletInstallationSection from './TabletInstallationSection'
const Landing = () => {
  const Navigate = useNavigate()
  useEffect(() => {
    AOS.init({
      once: false, // whether animation should happen only once - while scrolling down
    })
  }, [])

  return (
    <Container className='flex h-full items-center justify-center'>
      <HomeHero />
      <Grid
        overflow={'hidden'}
        container
        spacing={4}
        sx={{
          mt: 5,
          mb: 5,
          // align item vertically:
          alignItems: 'center',
        }}
      >
        <DemoMyChore />
        <DemoAssignee />
        <DemoScheduler />
        <DemoNotificationTemplate />

        <DemoHistory />
      </Grid>
      <FeaturesSection />
      <TabletInstallationSection />
      <GettingStarted />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: 5,
          mb: 5,
        }}
      ></Box>
      <CookiePermissionSnackbar />
      <Footer />
    </Container>
  )
}

export default Landing
