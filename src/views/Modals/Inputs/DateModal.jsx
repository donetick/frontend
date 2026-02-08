import { NextWeek, Today, WbSunny, Weekend } from '@mui/icons-material'
import { Box, Button, Chip, Input, Stack, Typography } from '@mui/joy'
import { useState } from 'react'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'

function DateModal({ isOpen, onClose, onSave, current, title }) {
  const { ResponsiveModal } = useResponsiveModal()

  const [date, setDate] = useState(
    current ? new Date(current).toISOString().split('T')[0] : '',
  )

  const getQuickScheduleDate = option => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (option) {
      case 'today': {
        const nowHour = now.getHours()
        const scheduled = new Date(today)
        if (nowHour < 9) {
          scheduled.setHours(9, 0, 0, 0)
        } else if (nowHour < 12) {
          scheduled.setHours(12, 0, 0, 0)
        } else if (nowHour < 17) {
          scheduled.setHours(17, 0, 0, 0)
        } else {
          scheduled.setHours(
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds(),
          )
        }
        return scheduled
      }
      case 'tomorrow': {
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        tomorrow.setHours(12, 0, 0, 0)
        return tomorrow
      }
      case 'weekend': {
        const weekend = new Date(today)
        const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
        weekend.setDate(today.getDate() + daysUntilSaturday)
        return weekend
      }
      case 'next-week': {
        const nextWeek = new Date(today)
        const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7
        nextWeek.setDate(today.getDate() + daysUntilMonday)
        return nextWeek
      }
      default:
        return today
    }
  }

  const handleQuickSchedule = option => {
    if (option === 'remove') {
      setDate('')
    } else {
      const selectedDate = getQuickScheduleDate(option)
      setDate(selectedDate.toISOString().split('T')[0])
    }
  }

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

      <Box sx={{ mt: 3 }}>
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
      </Box>

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
