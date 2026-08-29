import { FormControl, FormHelperText, Input, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../../components/common/ModalActions'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function EditThingStateModal({ currentThing, isOpen, onClose, onSave }) {
  const { t } = useTranslation('things')
  const { ResponsiveModal } = useResponsiveModal()

  const [state, setState] = useState(currentThing?.state || '')
  const [errors, setErrors] = useState({})

  const isValid = () => {
    const newErrors = {}

    if (state.trim() === '') {
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
      name: currentThing?.name,
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
      size='sm'
      title={t('updateState')}
      footer={
        <ModalActions
          secondary={{ label: t('common:cancel'), onClick: onClose }}
          primary={{ label: t('update'), onClick: handleSave }}
        />
      }
    >
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
    </ResponsiveModal>
  )
}
export default EditThingStateModal
