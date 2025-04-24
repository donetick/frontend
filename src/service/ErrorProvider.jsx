import { Error } from '@mui/icons-material'
import { Box, Button, Snackbar, Typography } from '@mui/joy'
import React, { createContext, useContext, useState } from 'react'

const ErrorContext = createContext()

export const useError = () => useContext(ErrorContext)

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null)

  const showError = error => {
    setError(error)
  }

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        startDecorator={<Error color='danger' />}
        endDecorator={
          <Button
            variant='outlined'
            color='danger'
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        }
      >
        {typeof error === 'string' ? (
          <Typography color='danger' level='body-md'>
            {error}
          </Typography>
        ) : (
          <Box>
            <Typography color='danger' level='title-sm'>
              {error?.title}
            </Typography>
            <Typography color='danger' level='body-sm'>
              {error?.message}
            </Typography>
          </Box>
        )}
      </Snackbar>
    </ErrorContext.Provider>
  )
}
