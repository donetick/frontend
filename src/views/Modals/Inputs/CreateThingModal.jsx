import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    Input,
    Option,
    Select,
    Textarea,
    Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function CreateThingModal({ isOpen, onClose, onSave, currentThing }) {
  const { t } = useTranslation(['things', 'common'])
  const { ResponsiveModal } = useResponsiveModal()

  const [name, setName] = useState(currentThing?.name || '')
  const [type, setType] = useState(currentThing?.type || 'number')
  const [state, setState] = useState(currentThing?.state || '')
  const [errors, setErrors] = useState({})
  useEffect(() => {
    if (type === 'boolean') {
      if (state !== 'true' && state !== 'false') {
        setState('false')
      }
    } else if (type === 'number') {
      if (isNaN(state)) {
        setState(0)
      }
    }
  }, [type])

  const isValid = () => {
    const newErrors = {}
    if (!name || name.trim() === '') {
      newErrors.name = t('things:modal.nameRequired')
    }

    if (type === 'number' && isNaN(state)) {
      newErrors.state = t('things:modal.stateMustBeNumber')
    }
    if (type === 'boolean' && !['true', 'false'].includes(state)) {
      newErrors.state = t('things:modal.stateMustBeBoolean')
    }
    if ((type === 'text' && !state) || state.trim() === '') {
      newErrors.state = t('things:modal.stateRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!isValid()) {
      return
    }
    onSave({ name, type, id: currentThing?.id, state: state || null })
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={currentThing?.id ? t('things:modal.editTitle') : t('things:modal.createTitle')}
    >
      <FormControl>
        <Typography>{t('common:labels.name')}</Typography>
        <Textarea
          placeholder={t('things:modal.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormHelperText color='danger'>{errors.name}</FormHelperText>
      </FormControl>
      <FormControl>
        <Typography>{t('things:modal.type')}</Typography>
        <Select value={type} sx={{ minWidth: 300 }}>
          {['text', 'number', 'boolean'].map(type => (
            <Option value={type} key={type} onClick={() => setType(type)}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Option>
          ))}
        </Select>

        <FormHelperText color='danger'>{errors.type}</FormHelperText>
      </FormControl>
      {type === 'text' && (
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
      )}
      {type === 'number' && (
        <FormControl>
          <Typography>{t('common:labels.value')}</Typography>
          <Input
            placeholder={t('things:modal.valuePlaceholder')}
            type='number'
            value={state || ''}
            onChange={e => {
              setState(e.target.value)
            }}
            sx={{ minWidth: 300 }}
          />
        </FormControl>
      )}
      {type === 'boolean' && (
        <FormControl>
          <Typography>{t('common:labels.value')}</Typography>
          <Select sx={{ minWidth: 300 }} value={state}>
            {['true', 'false'].map(value => (
              <Option value={value} key={value} onClick={() => setState(value)}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </Option>
            ))}
          </Select>
        </FormControl>
      )}

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
export default CreateThingModal
