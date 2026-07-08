import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    Input,
    Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function EditThingStateModal({ isOpen, onClose, onSave, currentThing }) {
  const { t } = useTranslation(['things', 'common'])
  const { ResponsiveModal } = useResponsiveModal()

  const [state, setState] = useState(currentThing?.state || '')
  const [errors, setErrors] = useState({})

  const isValid = () => {
    const newErrors = {}

    if (state.trim() === '') {
      newErrors.state = t('things:modal.stateRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!isValid()) {
      return
    }
    onSave({
      name,
      type: currentThing?.type,
      id: currentThing?.id,
      state: state || null,
    })
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={t('things:modal.updateStateTitle')}
    >
      <FormControl>
        <Typography>{t('common:labels.value')}</Typography>
        <Input
          placeholder={t('things:modal.valuePlaceholder')}
          value={state || ''}
          onChange={e => setState(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormHelperText color='danger'>{errors.state}</FormHelperText>
      </FormControl>

      <Box display={'flex'} justifyContent={'space-around'} mt={1}>
        <Button size='lg' onClick={handleSave} fullWidth sx={{ mr: 1 }}>
          {currentThing?.id ? t('common:actions.save') : t('common:actions.create')}
        </Button>
        <Button size='lg' onClick={onClose} variant='outlined'>
          {currentThing?.id ? t('common:actions.cancel') : t('common:actions.close')}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}
export default EditThingStateModal
