/* eslint-disable tailwindcss/no-custom-classname */
// import { StyledButton } from '@/components/styled-button'
import { Button } from '@mui/joy'
import Typography from '@mui/joy/Typography'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import Logo from '@/assets/logo.svg'
import screenShotMyChore from '@/assets/screenshot-my-chore.png'
import { GitHub } from '@mui/icons-material'
import useWindowWidth from '../../hooks/useWindowWidth'

const HomeHero = () => {
  const navigate = useNavigate()
  const windowWidth = useWindowWidth()
  const windowThreshold = 600
  const HERO_TEXT_THAT = [
    // 'Donetick simplifies the entire process, from scheduling and reminders to automatic task assignment and progress tracking.',
    // 'Donetick is the intuitive task and chore management app designed for groups. Take charge of shared responsibilities, automate your workflow, and achieve more together.',
    'An open-source, user-friendly app for managing tasks and chores, featuring customizable options to help you and others stay organized',
  ]

  const [heroTextIndex, setHeroTextIndex] = React.useState(0)

  useEffect(() => {
    // const intervalId = setInterval(
    //   () => setHeroTextIndex(index => index + 1),
    //   4000, // every 4 seconds
    // )
    // return () => clearTimeout(intervalId)
  }, [])

  const Title = () => (
    <Box
      sx={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <img src={Logo} width={'100px'} />
      <Typography level='h1' fontSize={58} fontWeight={800}>
        <span
          data-aos-delay={50 * 1}
          data-aos-anchor='[data-aos-id-hero]'
          data-aos='fade-up'
        >
          Done
        </span>
        <span
          data-aos-delay={100 * 3}
          data-aos-anchor='[data-aos-id-hero]'
          data-aos='fade-up'
          style={{
            color: '#06b6d4',
          }}
        >
          tick
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            position: 'relative',
            top: 12,
            right: 45,
          }}
        >
          Beta
        </span>
      </Typography>
    </Box>
  )

  const Subtitle = () => (
    <Typography
      level='h2'
      fontWeight={500}
      textAlign={'center'}
      className='opacity-70'
      data-aos-delay={100 * 5}
      data-aos-anchor='[data-aos-id-hero]'
      data-aos='zoom-in'
    >
      Simplify Tasks & Chores, Together.
    </Typography>
  )

  const CTAButton = () => (
    <Button
      data-aos-delay={100 * 2}
      data-aos-anchor='[data-aos-id-hero]'
      data-aos='fade-up'
      variant='solid'
      size='lg'
      sx={{
        py: 1.25,
        px: 5,
        fontSize: 20,
        mt: 2,
        borderWidth: 3,
        // boxShadow: '0px 0px 24px rgba(81, 230, 221, 0.5)',
        transition: 'all 0.20s',
      }}
      className='hover:scale-105'
      onClick={() => {
        // if the url is donetick.com then navigate to app.donetick.com/my/chores
        // else navigate to /my/chores
        if (window.location.hostname === 'donetick.com') {
          window.location.href = 'https://app.donetick.com/my/chores'
        } else {
          navigate('/my/chores')
        }
      }}
    >
      Get started
    </Button>
  )

  return (
    // <Box
    //   id='hero'
    //   className='grid min-h-[90vh] w-full place-items-center px-4 py-12'
    //   data-aos-id-hero
    // >
    <Grid container spacing={16} sx={{ py: 12 }}>
      <Grid item xs={12} md={7}>
        <Title />
        <div className='flex flex-col gap-6'>
          <Subtitle />

          <Typography
            level='title-lg'
            textAlign={'center'}
            fontSize={28}
            // textColor={'#06b6d4'}
            color='primary'
            data-aos-delay={100 * 1}
            data-aos-anchor='[data-aos-id-hero]'
            data-aos='fade-up'
          >
            {`"${HERO_TEXT_THAT[heroTextIndex % HERO_TEXT_THAT.length]}"`}
          </Typography>

          <Box className='flex w-full justify-center'>
            <CTAButton />
            <Button
              data-aos-delay={100 * 2.5}
              data-aos-anchor='[data-aos-id-hero]'
              data-aos='fade-up'
              variant='soft'
              size='lg'
              sx={{
                py: 1.25,
                px: 5,
                ml: 2,
                fontSize: 20,
                mt: 2,
                borderWidth: 3,
                // boxShadow: '0px 0px 24px rgba(81, 230, 221, 0.5)',
                transition: 'all 0.20s',
              }}
              className='hover:scale-105'
              onClick={() => {
                // new window open to https://github.com/Donetick:
                window.open('https://github.com/donetick', '_blank')
              }}
              startDecorator={<GitHub />}
            >
              Github
            </Button>
          </Box>
        </div>
      </Grid>
      {windowWidth > windowThreshold && (
        <Grid item xs={12} md={5}>
          <div className='flex justify-center'>
            <img
              src={screenShotMyChore}
              width={'100%'}
              style={{
                maxWidth: 300,
              }}
              height={'auto'}
              alt='Hero img'
              data-aos-delay={100 * 2}
              data-aos-anchor='[data-aos-id-hero]'
              data-aos='fade-left'
            />
          </div>
        </Grid>
      )}
    </Grid>
  )
}

export default HomeHero
