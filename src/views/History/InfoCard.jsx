import { AddTask } from '@mui/icons-material'
import { Box } from '@mui/joy'
import Card from '@mui/joy/Card'
import CardContent from '@mui/joy/CardContent'
import Typography from '@mui/joy/Typography'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

function InfoCard() {
  const { t } = useTranslation('history')
  return (
    <Card sx={{ minWidth: 200, maxWidth: 200 }}>
      <CardContent>
        <Box mb={2} sx={{ textAlign: 'left' }}>
          <AddTask
            sx={{
              fontSize: '2.5em' /* Increase the font size */,
            }}
          />
        </Box>
        <Typography level='title-md'>{t('info.completedTitle')}</Typography>
        <Typography level='body-sm'>{t('info.completedValue')}</Typography>
      </CardContent>
    </Card>
  )
}

export default InfoCard
