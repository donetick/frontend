import { HourglassEmpty, Schedule } from '@mui/icons-material'
import { Chip } from '@mui/joy'
import moment from 'moment'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { notInCompletionWindow } from '../../utils/Chores'

// Status belongs in task summaries; permission explanations belong in details.
// This is deliberately non-interactive, not a disabled action or a tooltip.
export default function ChoreStatusChip({ chore }) {
  const { t } = useTranslation('chores')
  const { timeFormat } = useLocalization()
  if (chore.isActive === false) return null

  const pending = chore.status === 3
  if (!pending && !notInCompletionWindow(chore)) return null

  return (
    <Chip
      size='sm'
      variant='soft'
      color='neutral'
      startDecorator={pending ? <HourglassEmpty /> : <Schedule />}
      sx={{
        alignSelf: 'flex-start',
        width: 'fit-content',
        maxWidth: '100%',
        '& .MuiChip-label': { whiteSpace: 'normal' },
      }}
    >
      {pending
        ? t('taskStatus.awaitingApproval')
        : t('taskStatus.availableAt', {
            date: moment(chore.nextDueDate)
              .subtract(chore.completionWindow, 'hours')
              .format(`MMM D, ${timeFormat || 'h:mm A'}`),
          })}
    </Chip>
  )
}
