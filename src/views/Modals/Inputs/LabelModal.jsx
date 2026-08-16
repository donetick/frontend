import { Box, FormControl, Input, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal.js'
import { useNotification } from '../../../service/NotificationProvider.jsx'
import LABEL_COLORS from '../../../utils/Colors.jsx'
import { CreateLabel, UpdateLabel } from '../../../utils/Fetcher'
import { useLabels } from '../../Labels/LabelQueries'

function LabelModal({ isOpen, label, onClose }) {
  const { t } = useTranslation('labels')
  const { ResponsiveModal } = useResponsiveModal()

  const [labelName, setLabelName] = useState('')
  const [color, setColor] = useState('')
  const [error, setError] = useState('')
  const { data: userLabels = [] } = useLabels()
  const queryClient = useQueryClient()
  const { showError } = useNotification()

  // Populate the form fields when editing
  useEffect(() => {
    if (label) {
      setLabelName(label.name)
      setColor(label.color)
    } else {
      setLabelName('')
      setColor('')
    }
    setError('')
  }, [label])

  // Validation logic
  const validateLabel = () => {
    if (!labelName.trim()) {
      setError(t('modal.errorEmptyName'))
      return false
    }
    if (
      userLabels.some(
        userLabel => userLabel.name === labelName && userLabel.id !== label?.id,
      )
    ) {
      setError(t('modal.errorDuplicate'))
      return false
    }
    if (!color) {
      setError(t('modal.errorNoColor'))
      return false
    }
    return true
  }

  const handleSave = () => {
    if (!validateLabel()) return
    const saveLabel = label?.id && label.id !== -1 ? UpdateLabel : CreateLabel
    saveLabel({
      id: label?.id,
      name: labelName,
      color,
    })
      .then(res => {
        if (res?.error) {
          setError(res.error)
        } else {
          queryClient.invalidateQueries('labels')
          onClose()
        }
      })
      .catch(err => {
        if (err.queued) {
          showError({
            title: t('modal.saveFailedTitle'),
            message: t('modal.saveFailedMessage'),
          })
        } else {
          showError({
            title: t('modal.saveFailedTitle'),
            message: t('modal.saveFailedMessage'),
          })
        }
      })
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={label ? 'Edit Label' : 'Add Label'}
      footer={
        <ModalActions
          secondary={{ label: t('common:cancel'), onClick: onClose }}
          primary={{
            label: label ? 'Save Changes' : 'Add Label',
            onClick: handleSave,
          }}
        />
      }
    >
      <Box>
        <FormControl>
          <Typography gutterBottom level='body-sm' alignSelf='start'>
            {t('modal.name')}
          </Typography>
          <Input
            fullWidth
            id='labelName'
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <Typography gutterBottom level='body-sm' alignSelf='start'>
            Color
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {LABEL_COLORS.map(colorOption => (
              <Box
                component='button'
                type='button'
                key={colorOption.value}
                aria-label={`Select ${colorOption.name}`}
                aria-pressed={color === colorOption.value}
                title={colorOption.name}
                onClick={() => setColor(colorOption.value)}
                sx={{
                  width: 40,
                  height: 40,
                  border: 0,
                  p: 0,
                  borderRadius: '50%',
                  background: colorOption.value,
                  cursor: 'pointer',
                  outline:
                    color === colorOption.value
                      ? '3px solid var(--joy-palette-primary-500)'
                      : '2px solid transparent',
                  outlineOffset: '2px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  '&:hover': { transform: 'scale(1.2)' },
                }}
              />
            ))}
          </Box>
        </FormControl>

        {error && (
          <Typography color='warning' level='body-sm'>
            {error}
          </Typography>
        )}
      </Box>
    </ResponsiveModal>
  )
}

export default LabelModal
