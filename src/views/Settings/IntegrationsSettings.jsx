import { Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import SettingsLayout from './SettingsLayout'

const IntegrationsSettings = () => {
  const { t } = useTranslation('settings')
  return (
    <SettingsLayout title={t('overview.sections.integrations.title')}>
      <Typography level='body-sm' textColor='text.secondary'>
        {t('integrations.hint')}
      </Typography>
    </SettingsLayout>
  )
}
export default IntegrationsSettings
