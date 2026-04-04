import { MoreVert } from '@mui/icons-material'
import { Card, IconButton, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const SummaryCard = () => {
  const { t } = useTranslation('chores')

  return (
    <Card>
      <div className='flex justify-between'>
        <div>
          <Typography level='h2'>{t('sidepanel.summary.title')}</Typography>
          <Typography level='body-xs'>
            {t('sidepanel.summary.description')}
          </Typography>
        </div>
        <IconButton>
          <MoreVert />
        </IconButton>
      </div>
      <div className='flex justify-between'>
        <div>
          <Typography level='h3'>{t('sidepanel.summary.dueToday')}</Typography>
          <Typography level='h1'>3</Typography>
        </div>
        <div>
          <Typography level='h3'>{t('sidepanel.summary.overdue')}</Typography>
          <Typography level='h1'>1</Typography>
        </div>
      </div>
    </Card>
  )
}

export default SummaryCard
