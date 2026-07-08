import { Box, Button, Textarea } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function TextModal({
  isOpen,
  onClose,
  onSave,
  current,
  title,
  okText,
  cancelText,
}) {
  const { t } = useTranslation(['common'])
  const { ResponsiveModal } = useResponsiveModal()

  const [text, setText] = useState(current)

  const handleSave = () => {
    onSave(text)
    onClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={title}
    >
      <Textarea
        placeholder={t('common:placeholders.typeHere')}
        value={text}
        onChange={e => setText(e.target.value)}
        minRows={2}
        maxRows={4}
        sx={{ minWidth: 300 }}
      />

      <Box display={'flex'} justifyContent={'space-around'} mt={1}>
        <Button size='lg' onClick={handleSave} fullWidth sx={{ mr: 1 }}>
          {okText ? okText : t('common:actions.save')}
        </Button>
        <Button size='lg' onClick={onClose} variant='outlined'>
          {cancelText ? cancelText : t('common:actions.cancel')}
        </Button>
      </Box>
    </ResponsiveModal>
  )
}
export default TextModal
