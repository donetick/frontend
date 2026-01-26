import { Box, Button, Input, Typography } from '@mui/joy'
import { useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function DateModal({ isOpen, onClose, onSave, current, title }) {
  const { ResponsiveModal } = useResponsiveModal()

  const [date, setDate] = useState(
    current ? new Date(current).toISOString().split('T')[0] : '',
  )

  const handleSave = () => {
    onSave(date)
    onClose()
  }

  return (
    <ResponsiveModal open={isOpen} onClose={onClose}>
      <Typography variant='h4'>{title}</Typography>
      <Input
        sx={{ mt: 3 }}
        type='date'
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <Box display={'flex'} justifyContent={'space-around'} mt={6}>
        <Button size='lg' onClick={handleSave} fullWidth sx={{ mr: 1 }}>
          Save
        </Button>
        <Button size='lg' onClick={onClose} variant='outlined'>
          Cancel
        </Button>
      </Box>
    </ResponsiveModal>
  )
}
export default DateModal
