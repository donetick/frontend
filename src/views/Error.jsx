import {
  BugReportRounded,
  CloudOffRounded,
  ContentCopyRounded,
  ErrorRounded,
  ExpandMoreRounded,
  HomeRounded,
  LockRounded,
  RefreshRounded,
  SearchOffRounded,
} from '@mui/icons-material'
import { Box, Button, IconButton, Snackbar, Typography } from '@mui/joy'
import { useState } from 'react'
import { Link, useRouteError } from 'react-router-dom'

const getErrorKind = error => {
  if (!error)
    return { label: 'Unknown Error', color: 'danger', Icon: ErrorRounded }
  const status = error?.status ?? error?.response?.status
  if (status === 404)
    return {
      label: '404 · Not Found',
      color: 'warning',
      Icon: SearchOffRounded,
    }
  if (status === 401 || status === 403)
    return {
      label: `${status} · Unauthorized`,
      color: 'warning',
      Icon: LockRounded,
    }
  if (status >= 500)
    return {
      label: `${status} · Server Error`,
      color: 'danger',
      Icon: CloudOffRounded,
    }
  if (error?.name === 'TypeError')
    return { label: 'Runtime Error', color: 'danger', Icon: BugReportRounded }
  if (error?.name === 'SyntaxError')
    return { label: 'Syntax Error', color: 'danger', Icon: BugReportRounded }
  return { label: 'Unexpected Error', color: 'danger', Icon: ErrorRounded }
}

const safeMessage = error => {
  const msg = error?.message ?? error?.statusText
  if (!msg || msg === '[object Object]') return null
  return msg
}

const buildErrorText = (error, url) => {
  const lines = [
    `URL: ${url}`,
    `Time: ${new Date().toISOString()}`,
    `Error: ${safeMessage(error) ?? String(error)}`,
  ]
  if (error?.stack) lines.push(`\nStack:\n${error.stack}`)
  return lines.join('\n')
}

const Error = () => {
  const error = useRouteError()
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const { color, Icon } = getErrorKind(error)
  const message = safeMessage(error)
  const url = window.location.href

  const handleCopy = () => {
    navigator.clipboard.writeText(buildErrorText(error, url)).then(() => {
      setCopied(true)
    })
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
        maxWidth: 440,
        mx: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Decorative dots */}
      <Box
        sx={{
          position: 'absolute',
          top: '14%',
          left: '6%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: `${color}.100`,
          opacity: 0.7,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '22%',
          right: '8%',
          width: 9,
          height: 9,
          borderRadius: '50%',
          bgcolor: `${color}.200`,
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          bottom: '28%',
          right: '6%',
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: `${color}.100`,
        }}
      />

      {/* Icon with concentric rings */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 4,
        }}
      >
        <Box
          sx={{
            width: 172,
            height: 172,
            borderRadius: '50%',
            border: '1.5px solid',
            borderColor: `${color}.100`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 128,
              height: 128,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: `${color}.200`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                bgcolor: `${color}.50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ fontSize: 42, color: `${color}.500` }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Title */}
      <Typography
        level='h3'
        fontWeight={700}
        textAlign='center'
        sx={{ mb: 1.5 }}
      >
        Something went wrong
      </Typography>

      {/* Error message */}
      <Typography
        level='body-sm'
        textAlign='center'
        sx={{
          color: 'text.secondary',
          mb: 4,
          maxWidth: 320,
          minHeight: '2.5em',
          wordBreak: 'break-word',
        }}
      >
        {message ??
          'An unexpected error occurred. Try reloading — it usually fixes it.'}
      </Typography>

      {/* Primary CTA */}
      <Button
        variant='solid'
        color='primary'
        size='lg'
        startDecorator={<RefreshRounded />}
        onClick={() => window.location.reload()}
        sx={{ width: '100%', mb: 2 }}
      >
        Try again
      </Button>

      {/* Secondary actions */}
      <Box sx={{ display: 'flex', gap: 3, mb: 5 }}>
        <Button
          component={Link}
          to='/chores'
          variant='plain'
          color='neutral'
          size='lg'
          startDecorator={<HomeRounded />}
        >
          Home
        </Button>
        <Button
          component={Link}
          to='/login'
          variant='plain'
          color='neutral'
          size='lg'
        >
          Login
        </Button>
      </Box>

      {/* Report hint + collapsible details */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography
          level='body-xs'
          textAlign='center'
          sx={{ color: 'text.tertiary', mb: 1.5 }}
        >
          If this keeps happening,{' '}
          <a
            href='https://github.com/donetick/donetick/issues/new'
            target='_blank'
            rel='noopener noreferrer'
            style={{ textDecoration: 'underline' }}
          >
            open an issue
          </a>{' '}
          and include the error details below.
        </Typography>

        {(error?.stack || message) && (
          <>
            <Button
              variant='plain'
              color='neutral'
              size='sm'
              onClick={() => setShowDetails(v => !v)}
              endDecorator={
                <ExpandMoreRounded
                  sx={{
                    transition: 'transform 0.2s',
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              }
              sx={{ mb: 1 }}
            >
              {showDetails ? 'Hide' : 'Show'} error details
            </Button>

            {showDetails && (
              <Box
                sx={{
                  position: 'relative',
                  bgcolor: 'background.level2',
                  borderRadius: 'sm',
                  p: 2,
                  width: '100%',
                }}
              >
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={handleCopy}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  title='Copy to clipboard'
                >
                  <ContentCopyRounded fontSize='small' />
                </IconButton>
                <Typography
                  level='body-xs'
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    pr: 4,
                    color: 'text.secondary',
                  }}
                >
                  {buildErrorText(error, url)}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        size='sm'
      >
        Error details copied to clipboard
      </Snackbar>
    </Box>
  )
}

export default Error
