import { Box, Button, Input } from '@mui/joy'
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
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size='lg'
      fullWidth={true}
      title={title}
    >
      <Input
        sx={{ mt: 3 }}
        type='date'
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      {/* <Box sx={{ mt: 3 }}>
        <Typography level='body-sm' sx={{ mb: 1.5, fontWeight: 500 }}>
          Quick select:
        </Typography>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <Chip
            variant='soft'
            color='primary'
            startDecorator={<Today />}
            size='lg'
            onClick={() => handleQuickSchedule('today')}
            sx={{ cursor: 'pointer' }}
          >
            Today
          </Chip>
          <Chip
            variant='soft'
            color='primary'
            startDecorator={<WbSunny />}
            size='lg'
            onClick={() => handleQuickSchedule('tomorrow')}
            sx={{ cursor: 'pointer' }}
          >
            Tomorrow
          </Chip>
          <Chip
            variant='soft'
            color='primary'
            startDecorator={<Weekend />}
            size='lg'
            onClick={() => handleQuickSchedule('weekend')}
            sx={{ cursor: 'pointer' }}
          >
            Weekend
          </Chip>
          <Chip
            variant='soft'
            color='primary'
            startDecorator={<NextWeek />}
            size='lg'
            onClick={() => handleQuickSchedule('next-week')}
            sx={{ cursor: 'pointer' }}
          >
            Next week
          </Chip>
        </Stack>
      </Box> */}

      <Box display={'flex'} justifyContent={'space-around'} mt={4}>
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
