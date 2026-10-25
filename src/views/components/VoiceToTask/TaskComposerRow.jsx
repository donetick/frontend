import { Add, MoreHoriz } from '@mui/icons-material'
import { Box, CircularProgress, IconButton, Input, Typography } from '@mui/joy'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { parseVoiceTask } from './parseVoiceTask'

// A lightweight quick-add field. Full editing lives in AddTaskModal.
const TaskComposerRow = ({
  currentUserId,
  members = [],
  onMoreOptions,
  onSubmit,
  placeholder,
  userLabels = [],
}) => {
  const { t } = useTranslation('chores')
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const submittingRef = useRef(false)

  const handleSubmit = async () => {
    if (!text.trim() || submittingRef.current) return
    const parsed = parseVoiceTask(text, { currentUserId, members, userLabels })
    if (!parsed.title.trim()) return
    submittingRef.current = true
    setIsSubmitting(true)
    setHasError(false)
    try {
      await onSubmit({ ...parsed, title: parsed.title.trim() })
      setText('')
    } catch {
      // Keep the draft available for retrying or opening the full editor.
      setHasError(true)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ p: 1 }}>
      <Input
        size='sm'
        placeholder={placeholder}
        value={text}
        readOnly={isSubmitting}
        color={hasError ? 'danger' : 'neutral'}
        onChange={event => {
          setText(event.target.value)
          setHasError(false)
        }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter') {
            event.preventDefault()
            handleSubmit()
          }
          if (event.key === 'Escape' && !isSubmitting) {
            setText('')
            setHasError(false)
            event.target.blur()
          }
        }}
        slotProps={{ input: { 'aria-label': placeholder } }}
        startDecorator={
          isSubmitting ? (
            <CircularProgress size='sm' />
          ) : (
            <Add sx={{ fontSize: 18, color: 'text.tertiary' }} />
          )
        }
        endDecorator={
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            aria-label={t('board.moreOptions')}
            title={t('board.moreOptions')}
            disabled={isSubmitting}
            onClick={() => onMoreOptions?.(text)}
          >
            <MoreHoriz sx={{ fontSize: 20 }} />
          </IconButton>
        }
        sx={{
          '--Input-radius': '8px',
          bgcolor: 'background.body',
          boxShadow: 'none',
          '&:not(:focus-within)': { borderColor: 'transparent' },
          '&:hover': { borderColor: 'neutral.outlinedBorder' },
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
    </Box>
  )
}

export default TaskComposerRow
