import {
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

import ModalActions from '../../../components/common/ModalActions'
import NumberInput from '../../../components/common/NumberInput'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function CreateThingModal({ currentThing, isOpen, onClose, onSave }) {
  const { t } = useTranslation('things')
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
  }, [type, state])

  const isValid = () => {
    const newErrors = {}
    if (!name || name.trim() === '') {
      newErrors.name = t('errName')
    }

    if (type === 'number' && isNaN(state)) {
      newErrors.state = t('errStateNumber')
    }
    if (type === 'boolean' && !['true', 'false'].includes(state)) {
      newErrors.state = t('errStateBool')
    }
    if ((type === 'text' && !state) || String(state ?? '').trim() === '') {
      newErrors.state = t('errStateRequired')
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
      type,
      id: currentThing?.id,
      state: state === '' ? null : state,
    })
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='md'
      title={currentThing?.id ? t('editThingTitle') : t('createThingTitle')}
      footer={
        <ModalActions
          secondary={{
            label: t('common:cancel'),
            onClick: onClose,
          }}
          primary={{
            label: currentThing?.id ? t('update') : t('create'),
            onClick: handleSave,
          }}
        />
      }
    >
      <FormControl>
        <Typography>{t('name')}</Typography>
        <Textarea
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormHelperText color='danger'>{errors.name}</FormHelperText>
      </FormControl>
      <FormControl>
        <Typography>{t('type')}</Typography>
        <Select value={type} onChange={(_, value) => setType(value)}>
          {['text', 'number', 'boolean'].map(type => (
            <Option value={type} key={type}>
              {t(`types.${type}`)}
            </Option>
          ))}
        </Select>

        <FormHelperText color='danger'>{errors.type}</FormHelperText>
      </FormControl>
      {type === 'text' && (
        <FormControl>
          <Typography>{t('value')}</Typography>
          <Input
            placeholder={t('valuePlaceholder')}
            value={state || ''}
            onChange={e => setState(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <FormHelperText color='danger'>{errors.state}</FormHelperText>
        </FormControl>
      )}
      {type === 'number' && (
        <FormControl>
          <Typography>{t('value')}</Typography>
          <NumberInput
            placeholder={t('valuePlaceholder')}
            value={state ?? ''}
            allowEmpty
            emptyValue=''
            integer={false}
            onValueChange={setState}
            sx={{ minWidth: 300 }}
          />
        </FormControl>
      )}
      {type === 'boolean' && (
        <FormControl>
          <Typography>{t('value')}</Typography>
          <Select value={state} onChange={(_, value) => setState(value)}>
            <Option value='true'>{t('boolTrue')}</Option>
            <Option value='false'>{t('boolFalse')}</Option>
          </Select>
        </FormControl>
      )}
    </ResponsiveModal>
  )
}
export default CreateThingModal
