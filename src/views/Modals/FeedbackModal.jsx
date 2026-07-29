import { Browser } from '@capacitor/browser'
import { Android, Apple, Favorite, GitHub } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'
import { useUserProfile } from '../../queries/UserQueries'
import {
  FEEDBACK_CATEGORIES,
  isCloudInstance,
  markSentiment,
  requestStoreReview,
  SENTIMENTS,
  storeLinks,
  submitFeedback,
  SUBMIT_RESULT,
} from '../../service/FeedbackService'
import { Capacitor } from '@capacitor/core'

const STEP = {
  SENTIMENT: 'sentiment',
  DETAILS: 'details',
  THANKS: 'thanks',
  WEB_REVIEW: 'webReview',
  GITHUB: 'github',
}

// Native webviews swallow target="_blank"; route through the system browser.
const openUrl = async url => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

const SENTIMENT_OPTIONS = [
  { value: SENTIMENTS.LOVE, emoji: '😍' },
  { value: SENTIMENTS.OKAY, emoji: '🙂' },
  { value: SENTIMENTS.ISSUES, emoji: '😕' },
]

/**
 * Sentiment-first feedback flow. "Love it" routes to the native store review
 * dialog (or star links on web); anything else collects structured feedback
 * and never asks for a review.
 */
const FeedbackModal = ({ open, onClose, onDismiss }) => {
  const { t } = useTranslation()
  const { ResponsiveModal } = useResponsiveModal()
  const { data: userProfile } = useUserProfile()
  const location = useLocation()

  const [step, setStep] = useState(STEP.SENTIMENT)
  const [sentiment, setSentiment] = useState(null)
  const [category, setCategory] = useState(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isCloud, setIsCloud] = useState(true)
  const [githubUrl, setGithubUrl] = useState(null)

  useEffect(() => {
    if (open) {
      setStep(STEP.SENTIMENT)
      setSentiment(null)
      setCategory(null)
      setMessage('')
      setSubmitting(false)
      setGithubUrl(null)
      isCloudInstance().then(setIsCloud)
    }
  }, [open])

  const handleClose = () => {
    // Backing out before answering counts as a dismissal for the cooldown.
    if (step === STEP.SENTIMENT) onDismiss?.()
    onClose()
  }

  const handleSentiment = async value => {
    setSentiment(value)
    await markSentiment(value)

    if (value !== SENTIMENTS.LOVE) {
      setStep(STEP.DETAILS)
      return
    }

    if (Capacitor.isNativePlatform()) {
      const requested = await requestStoreReview()
      if (requested) {
        onClose()
        return
      }
    }
    setStep(STEP.WEB_REVIEW)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const { result, githubUrl: url } = await submitFeedback({
      sentiment,
      category,
      message,
      feature: location.pathname,
      userProfile,
    })
    setSubmitting(false)

    // Self-hosted feedback is never relayed; hand the user a pre-filled issue
    // instead so they choose what gets published.
    if (result === SUBMIT_RESULT.SELF_HOSTED) {
      setGithubUrl(url)
      setStep(STEP.GITHUB)
      return
    }
    setStep(STEP.THANKS)
  }

  const canSubmit = Boolean(category) || message.trim().length > 0

  return (
    <ResponsiveModal open={open} onClose={handleClose} size='md'>
      <Stack spacing={2}>
        {step === STEP.SENTIMENT && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.sentiment.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('feedback.sentiment.subtitle')}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {SENTIMENT_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant='outlined'
                  color='neutral'
                  size='lg'
                  onClick={() => handleSentiment(option.value)}
                  sx={{
                    justifyContent: 'flex-start',
                    fontWeight: 500,
                    py: 1.5,
                  }}
                  startDecorator={
                    <Box component='span' sx={{ fontSize: '1.4rem' }}>
                      {option.emoji}
                    </Box>
                  }
                >
                  {t(`feedback.sentiment.options.${option.value}`)}
                </Button>
              ))}
            </Stack>
            <Button variant='plain' color='neutral' onClick={handleClose}>
              {t('feedback.later')}
            </Button>
          </>
        )}

        {step === STEP.DETAILS && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.details.title')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {FEEDBACK_CATEGORIES.map(item => (
                <Chip
                  key={item}
                  variant={category === item ? 'solid' : 'outlined'}
                  color={category === item ? 'primary' : 'neutral'}
                  size='lg'
                  onClick={() => setCategory(category === item ? null : item)}
                >
                  {t(`feedback.categories.${item}`)}
                </Chip>
              ))}
            </Box>

            <FormControl>
              <FormLabel sx={{ fontWeight: 600 }}>
                {t('feedback.details.messageLabel')}
              </FormLabel>
              <Textarea
                minRows={3}
                maxRows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('feedback.details.messagePlaceholder')}
              />
            </FormControl>

            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {isCloud
                ? t('feedback.details.contextNote')
                : t('feedback.details.contextNoteSelfHosted')}
            </Typography>

            <Divider />
            <Stack direction='row' spacing={1} justifyContent='flex-end'>
              <Button variant='plain' color='neutral' onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button
                variant='solid'
                color='primary'
                disabled={!canSubmit || submitting}
                startDecorator={
                  submitting ? <CircularProgress size='sm' /> : null
                }
                onClick={handleSubmit}
              >
                {isCloud
                  ? t('feedback.details.submit')
                  : t('feedback.details.submitSelfHosted')}
              </Button>
            </Stack>
          </>
        )}

        {step === STEP.WEB_REVIEW && (
          <>
            <Typography
              level='h4'
              sx={{ fontWeight: 600 }}
              startDecorator={<Favorite color='error' />}
            >
              {t('feedback.review.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('feedback.review.subtitle')}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<GitHub />}
                onClick={() => openUrl(storeLinks.github)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {t('feedback.review.github')}
              </Button>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<Apple />}
                onClick={() => openUrl(storeLinks.appStore)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {t('feedback.review.appStore')}
              </Button>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<Android />}
                onClick={() => openUrl(storeLinks.playStore)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {t('feedback.review.playStore')}
              </Button>
            </Stack>
            <Button variant='plain' color='neutral' onClick={onClose}>
              {t('close')}
            </Button>
          </>
        )}

        {step === STEP.GITHUB && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.github.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('feedback.github.subtitle')}
            </Typography>
            <Button
              variant='solid'
              color='primary'
              startDecorator={<GitHub />}
              onClick={() => {
                openUrl(githubUrl)
                onClose()
              }}
            >
              {t('feedback.github.open')}
            </Button>
            <Button variant='plain' color='neutral' onClick={onClose}>
              {t('close')}
            </Button>
          </>
        )}

        {step === STEP.THANKS && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.thanks.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('feedback.thanks.subtitle')}
            </Typography>
            <Button variant='solid' color='primary' onClick={onClose}>
              {t('close')}
            </Button>
          </>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

export default FeedbackModal
