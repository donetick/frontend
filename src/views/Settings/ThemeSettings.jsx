import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import SettingsLayout from './SettingsLayout'
import ThemeToggle from './ThemeToggle'

const ThemeSettings = () => {
  const { t } = useTranslation('settings')

  return (
    <SettingsLayout title={t('theme.title')}>
      <Box sx={{ maxWidth: 680, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 560, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('theme.description')}
        </Typography>
        <ThemeToggle />
      </Box>
    </SettingsLayout>
  )
}

export default ThemeSettings
