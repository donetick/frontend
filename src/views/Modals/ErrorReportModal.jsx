import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import {
  CheckRounded,
  ContentCopyRounded,
  ExpandMoreRounded,
  GitHub,
  ReportProblemRounded,
} from '@mui/icons-material'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'
import {
  collectErrorReport,
  formatErrorReport,
  SUBMIT_RESULT,
  submitErrorReport,
} from '../../service/ErrorReportService'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const enter = (delay = 0) => ({
  animation: `errorReportIn 420ms ${EASE} ${delay}ms both`,
  '@keyframes errorReportIn': {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

const STEP = { FORM: 'form', SENT: 'sent', FALLBACK: 'fallback' }

// Native webviews swallow target="_blank"; route through the system browser.
const openUrl = async url => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * The same halo treatment the onboarding views use, so the crash path doesn't
 * introduce a third visual language for "here's the thing this screen is about".
 */
const IconHalo = ({ color = 'primary', icon }) => (
  <Box
    sx={{
      position: 'relative',
      display: 'grid',
      placeItems: 'center',
      width: 64,
      height: 64,
      mx: 'auto',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: '50%',
        bgcolor: `${color}.softBg`,
        opacity: 0.6,
        filter: 'blur(24px)',
      },
      '& > *': { position: 'relative' },
    }}
  >
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        color: `${color}.plainColor`,
        '& svg': { fontSize: '1.6rem' },
      }}
    >
      {icon}
    </Box>
  </Box>
)

/**
 * Collects a crash report from the error screen: one short answer from the
 * user, everything else gathered automatically. The diagnostics are shown
 * before sending rather than after — people are more willing to send a report
 * they can see, and this is the one moment they already distrust the app.
 *
 * Also reached deliberately from settings with no error attached, where the
 * same diagnostics back a bug the user noticed but the app never threw on.
 */
const ErrorReportModal = ({ error, errorInfo, onClose, open }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const { t } = useTranslation('common')
  const isBugReport = !error

  const [report, setReport] = useState(null)
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [githubUrl, setGithubUrl] = useState(null)
  const [step, setStep] = useState(STEP.FORM)

  useEffect(() => {
    if (!open) return
    setStep(STEP.FORM)
    setDescription('')
    setShowDetails(false)
    setCopied(false)
    setSubmitting(false)
    setGithubUrl(null)
    // Snapshot the environment at open time so it reflects the crash, not
    // whatever the app looks like after the user has poked at it.
    collectErrorReport({ error, errorInfo }).then(setReport)
  }, [open, error, errorInfo])

  const reportText = report ? formatErrorReport(report) : ''

  const copyDetails = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSubmit = async () => {
    if (!report) return
    setSubmitting(true)
    const { githubUrl: url, result } = await submitErrorReport({
      description,
      contactEmail: email,
      report,
    })
    setSubmitting(false)

    if (result === SUBMIT_RESULT.SENT) {
      setStep(STEP.SENT)
      return
    }
    // Everything else — self-hosted, unconfigured, offline — hands the user a
    // pre-filled issue so the report isn't simply lost.
    setGithubUrl(url)
    setStep(STEP.FALLBACK)
  }

  return (
    <ResponsiveModal open={open} onClose={onClose} size='md'>
      {step === STEP.FORM && (
        <Stack spacing={2}>
          <Box sx={{ ...enter(0) }}>
            <IconHalo
              icon={<ReportProblemRounded />}
              color={isBugReport ? 'warning' : 'danger'}
            />
          </Box>

          <Box sx={{ textAlign: 'center', ...enter(50) }}>
            <Typography
              level='h4'
              sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
            >
              {isBugReport
                ? t('errorReport.titleBug')
                : t('errorReport.titleCrash')}
            </Typography>
            <Typography
              level='body-sm'
              sx={{ color: 'text.secondary', mt: 0.5, textWrap: 'pretty' }}
            >
              {isBugReport
                ? t('errorReport.subtitleBug')
                : t('errorReport.subtitleCrash')}
            </Typography>
          </Box>

          <FormControl sx={{ ...enter(100) }}>
            <FormLabel sx={{ fontWeight: 600 }}>
              {isBugReport
                ? t('errorReport.labelBug')
                : t('errorReport.labelCrash')}
            </FormLabel>
            <Textarea
              minRows={3}
              maxRows={6}
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                isBugReport
                  ? t('errorReport.placeholderBug')
                  : t('errorReport.placeholderCrash')
              }
            />
          </FormControl>

          <FormControl sx={{ ...enter(140) }}>
            <FormLabel sx={{ fontWeight: 600 }}>
              {t('errorReport.email')}{' '}
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('errorReport.emailOptional')}
              </Typography>
            </FormLabel>
            <Input
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('errorReport.emailPlaceholder')}
            />
          </FormControl>

          <Box sx={{ ...enter(180) }}>
            <Button
              variant='plain'
              color='neutral'
              size='sm'
              onClick={() => setShowDetails(v => !v)}
              endDecorator={
                <ExpandMoreRounded
                  sx={{
                    transition: 'transform 0.2s',
                    transform: showDetails ? 'rotate(180deg)' : 'none',
                  }}
                />
              }
              sx={{ px: 0 }}
            >
              {showDetails
                ? t('errorReport.hideWhatGetsSent')
                : t('errorReport.showWhatGetsSent')}
            </Button>

            {showDetails && (
              <Box
                sx={{
                  position: 'relative',
                  mt: 1,
                  p: 1.5,
                  pr: 5,
                  borderRadius: '12px',
                  bgcolor: 'background.level2',
                  maxHeight: 180,
                  overflow: 'auto',
                }}
              >
                <Button
                  size='sm'
                  variant='soft'
                  color={copied ? 'success' : 'neutral'}
                  onClick={copyDetails}
                  sx={{ position: 'absolute', top: 6, right: 6, minWidth: 0 }}
                  aria-label={t('errorReport.copyDiagnostics')}
                >
                  {copied ? (
                    <CheckRounded fontSize='small' />
                  ) : (
                    <ContentCopyRounded fontSize='small' />
                  )}
                </Button>
                <Typography
                  level='body-xs'
                  sx={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'text.secondary',
                  }}
                >
                  {reportText || t('errorReport.collecting')}
                </Typography>
              </Box>
            )}
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', mt: 1, display: 'block' }}
            >
              {t('errorReport.privacyNote')}
            </Typography>
          </Box>

          <Stack spacing={1} sx={{ ...enter(220) }}>
            <Button
              size='lg'
              fullWidth
              loading={submitting}
              // A crash report stands on its own; a manual one is only the
              // description, so there's nothing to send without it.
              disabled={!report || (isBugReport && !description.trim())}
              onClick={handleSubmit}
            >
              {t('errorReport.send')}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component='button'
                type='button'
                level='body-sm'
                color='neutral'
                underline='hover'
                onClick={onClose}
              >
                {isBugReport
                  ? t('errorReport.cancel')
                  : t('errorReport.notNow')}
              </Link>
            </Box>
          </Stack>
        </Stack>
      )}

      {step === STEP.SENT && (
        <Stack spacing={2} sx={{ textAlign: 'center' }}>
          <Box sx={{ ...enter(0) }}>
            <IconHalo icon={<CheckRounded />} color='success' />
          </Box>
          <Box sx={{ ...enter(50) }}>
            <Typography level='h4' sx={{ fontWeight: 700 }}>
              {t('errorReport.sentTitle')}
            </Typography>
            <Typography
              level='body-sm'
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {t('errorReport.sentBody')}
            </Typography>
          </Box>

          <Box
            sx={{
              ...enter(100),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              px: 2,
              py: 1.25,
              borderRadius: '16px',
              bgcolor: 'background.surface',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ textAlign: 'left' }}>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('errorReport.reference')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                {report?.reportId}
              </Typography>
            </Box>
            <Button
              variant='soft'
              color={copied ? 'success' : 'primary'}
              onClick={() => {
                navigator.clipboard.writeText(report?.reportId ?? '')
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              sx={{ minWidth: 0 }}
              aria-label={t('errorReport.copyReference')}
            >
              {copied ? <CheckRounded /> : <ContentCopyRounded />}
            </Button>
          </Box>

          <Button size='lg' fullWidth onClick={onClose} sx={{ ...enter(150) }}>
            {t('errorReport.done')}
          </Button>
        </Stack>
      )}

      {step === STEP.FALLBACK && (
        <Stack spacing={2} sx={{ textAlign: 'center' }}>
          <Box sx={{ ...enter(0) }}>
            <IconHalo icon={<GitHub />} color='neutral' />
          </Box>
          <Box sx={{ ...enter(50) }}>
            <Typography level='h4' sx={{ fontWeight: 700 }}>
              {t('errorReport.githubTitle')}
            </Typography>
            <Typography
              level='body-sm'
              sx={{ color: 'text.secondary', mt: 0.5, textWrap: 'pretty' }}
            >
              {t('errorReport.githubBody')}
            </Typography>
          </Box>
          <Stack spacing={1} sx={{ ...enter(100) }}>
            <Button
              size='lg'
              fullWidth
              startDecorator={<GitHub />}
              onClick={() => {
                openUrl(githubUrl)
                onClose()
              }}
            >
              {t('errorReport.openIssue')}
            </Button>
            <Button
              variant='plain'
              color='neutral'
              startDecorator={
                copied ? <CheckRounded /> : <ContentCopyRounded />
              }
              onClick={copyDetails}
            >
              {copied ? t('errorReport.copied') : t('errorReport.copyInstead')}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component='button'
                type='button'
                level='body-sm'
                color='neutral'
                underline='hover'
                onClick={onClose}
              >
                {t('errorReport.close')}
              </Link>
            </Box>
          </Stack>
        </Stack>
      )}
    </ResponsiveModal>
  )
}

export default ErrorReportModal
