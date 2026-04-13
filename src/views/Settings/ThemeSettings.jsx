import { Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import SettingsLayout from './SettingsLayout'
import ThemeToggle from './ThemeToggle'

const ThemeSettings = () => {
  const { t } = useTranslation('settings')

  return (
    <SettingsLayout title={t('pages.theme.title')}>
      <div className='grid gap-4'>
        <Typography level='body-md'>{t('theme.description')}</Typography>
        <ThemeToggle />
      </div>
    </SettingsLayout>
  )
}

export default ThemeSettings
