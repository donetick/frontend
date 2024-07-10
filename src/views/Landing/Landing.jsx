import { Container, Grid } from '@mui/joy'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DemoAssignee from './DemoAssignee'
import DemoHistory from './DemoHistory'
import DemoMyChore from './DemoMyChore'
import DemoScheduler from './DemoScheduler'
import FeaturesSection from './FeaturesSection'
import HomeHero from './HomeHero'
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

        <DemoHistory />
      </Grid>
      <FeaturesSection />
      {/* <PricingSection /> */}
    </Container>
  )
}

export default Landing
