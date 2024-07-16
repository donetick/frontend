import { Box, CircularProgress, Container } from '@mui/joy'
import { Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import Logo from '../../Logo'

const LoadingComponent = () => {
  const [message, setMessage] = useState('Loading...')
  const [subMessage, setSubMessage] = useState('')
  useEffect(() => {
    // if loading took more than 5 seconds update submessage to mention there might be an error:
    const timeout = setTimeout(() => {
      setSubMessage(
        'This is taking longer than usual. There might be an issue.',
      )
    }, 5000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <Container className='flex h-full items-center justify-center'>
      <Box
        className='flex flex-col items-center justify-center'
        sx={{
          minHeight: '80vh',
        }}
      >
        <CircularProgress
          color='success'
          sx={{ '--CircularProgress-size': '200px' }}
        >
          <Logo />
        </CircularProgress>
        <Box
          className='flex items-center gap-2'
          sx={{
            fontWeight: 700,
            fontSize: 24,
            mt: 2,
          }}
        >
          {message}
        </Box>
        <Typography level='h2' fontWeight={500} textAlign={'center'}>
          {subMessage}
        </Typography>
      </Box>
    </Container>
  )
}

export default LoadingComponent
