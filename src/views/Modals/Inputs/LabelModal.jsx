import { Check, PaletteOutlined } from '@mui/icons-material'
import { Alert, Box, FormControl, FormLabel, Input } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ItemPrivacyField from '../../../components/common/ItemPrivacyField'
import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal.js'
import { useNotification } from '../../../service/NotificationProvider.jsx'
import LABEL_COLORS from '../../../utils/Colors.jsx'
import { CreateLabel, UpdateLabel } from '../../../utils/Fetcher'
import EditorSection from '../../ChoreEdit/EditorSection'
import { useLabels } from '../../Labels/LabelQueries'

function LabelModal({ isOpen, label, onClose }) {
  const { t } = useTranslation('labels')
  const { ResponsiveModal } = useResponsiveModal()

  const [labelName, setLabelName] = useState('')
  const [color, setColor] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [error, setError] = useState('')
  const { data: userLabels = [] } = useLabels()
  const queryClient = useQueryClient()
  const { showError } = useNotification()

  // Populate the form fields when editing
  useEffect(() => {
    if (!isOpen) return
    setIsShared(label?.isShared ?? false)
    if (label) {
      setLabelName(label.name)
      setColor(label.color)
    } else {
      setLabelName('')
      setColor('')
    }
    setError('')
  }, [label, isOpen])

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
      isShared,
    })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || t('modal.saveFailedMessage'))
        } else {
          queryClient.invalidateQueries({ queryKey: ['labels'] })
          queryClient.invalidateQueries({ queryKey: ['chores'] })
          queryClient.invalidateQueries({ queryKey: ['choreDetails'] })
          queryClient.invalidateQueries({ queryKey: ['chore'] })
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
      title={label ? t('modal.editTitle') : t('modal.addTitle')}
      footer={
        <ModalActions
          secondary={{ label: t('common:cancel'), onClick: onClose }}
          primary={{
            label: label ? t('modal.saveChanges') : t('modal.addLabel'),
            onClick: handleSave,
          }}
        />
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl>
          <FormLabel htmlFor='labelName'>{t('modal.name')}</FormLabel>
          <Input
            fullWidth
            id='labelName'
            value={labelName}
            onChange={e => {
              setLabelName(e.target.value)
              setError('')
            }}
            autoFocus
            sx={{ minHeight: 48, borderRadius: 'md', fontSize: 'lg' }}
          />
        </FormControl>

        {error && (
          <Alert color='danger' size='sm'>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 'lg',
            overflow: 'hidden',
          }}
        >
          <EditorSection
            title={t('modal.color')}
            icon={PaletteOutlined}
            section='label-color'
            collapsible
            defaultOpen={!label}
            error={!color && error}
            summary={
              color
                ? t(
                    `common:colors.${LABEL_COLORS.find(option => option.value === color)?.name}`,
                    { defaultValue: color },
                  )
                : ''
            }
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {LABEL_COLORS.map(colorOption => (
                <Box
                  component='button'
                  type='button'
                  key={colorOption.value}
                  aria-label={t('modal.colorAriaSelect', {
                    color: t(`common:colors.${colorOption.name}`),
                  })}
                  aria-pressed={color === colorOption.value}
                  title={t(`common:colors.${colorOption.name}`)}
                  onClick={() => {
                    setColor(colorOption.value)
                    setError('')
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:focus-visible': {
                      outline: '3px solid',
                      outlineColor: 'text.primary',
                    },
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
                >
                  {color === colorOption.value && (
                    <Check
                      sx={{
                        fontSize: 20,
                        color: 'white',
                        filter: 'drop-shadow(0 1px 2px #000)',
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </EditorSection>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 0.5 }}>
            <ItemPrivacyField
              isShared={isShared}
              onChange={setIsShared}
              kind='label'
            />
          </Box>
        </Box>
      </Box>
    </ResponsiveModal>
  )
}

export default LabelModal
