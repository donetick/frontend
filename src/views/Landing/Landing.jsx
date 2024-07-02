import { Container } from '@mui/joy'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FeaturesSection from './FeaturesSection'
import HomeHero from './HomeHero'
const Landing = () => {
  const Navigate = useNavigate()
  const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'))
  }
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(getCurrentUser())

  useEffect(() => {
    AOS.init({
      once: false, // whether animation should happen only once - while scrolling down
    })
  }, [])

  return (
    <Container className='flex h-full items-center justify-center'>
      <HomeHero />
      <FeaturesSection />
      {/* <PricingSection /> */}
    </Container>
  )
}

export default Landing
