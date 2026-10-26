import { Add } from '@mui/icons-material'
import { Button, CircularProgress, Input, Sheet, Typography } from '@mui/joy'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Match the task composer, rather than giving section creation a second,
// heavier visual language. The input stays available for successive sections.
export default function ProjectSectionComposer({ displayMode, onSubmit }) {
  const { t } = useTranslation('chores')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const submittingRef = useRef(false)
  const inputRef = useRef(null)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setHasError(false)
    try {
      await onSubmit(trimmed)
      setName('')
      inputRef.current?.focus()
    } catch {
      setHasError(true)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet
      variant='soft'
      className={`project-board-column project-board-column--${displayMode === 'list' ? 'list' : 'board'}`}
      sx={{ p: 1, borderRadius: 'lg' }}
    >
      <Input
        size='sm'
        value={name}
        placeholder={t('board.addSection')}
        readOnly={isSubmitting}
        color={hasError ? 'danger' : 'neutral'}
        slotProps={{
          input: {
            ref: inputRef,
            'aria-label': t('board.newSectionPlaceholder'),
          },
        }}
        onChange={event => {
          setName(event.target.value)
          setHasError(false)
        }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
          if (event.key === 'Escape' && !submittingRef.current) {
            setName('')
            setHasError(false)
            event.target.blur()
          }
        }}
        startDecorator={
          isSubmitting ? (
            <CircularProgress size='sm' />
          ) : (
            <Add sx={{ fontSize: 18, color: 'text.tertiary' }} />
          )
        }
        endDecorator={
          name.trim() && (
            <Button
              size='sm'
              variant='plain'
              color='neutral'
              disabled={isSubmitting}
              aria-label={t('board.addSection')}
              onClick={submit}
              sx={{
                minHeight: 32,
                '@media (pointer: coarse)': { minHeight: 44 },
              }}
            >
              {t('board.add')}
            </Button>
          )
        }
        sx={{
          '--Input-radius': '8px',
          minWidth: 0,
          bgcolor: 'background.body',
          boxShadow: 'none',
          '&:not(:focus-within)': {
            borderColor: hasError ? 'danger.outlinedBorder' : 'transparent',
          },
          '&:hover': {
            borderColor: hasError
              ? 'danger.outlinedBorder'
              : 'neutral.outlinedBorder',
          },
        }}
      />
      {hasError && (
        <Typography
          level='body-xs'
          color='danger'
          role='alert'
          sx={{ mt: 0.5 }}
        >
          {t('common:error')}
        </Typography>
      )}
    </Sheet>
  )
}
