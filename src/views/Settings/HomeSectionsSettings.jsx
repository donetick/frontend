import {
  Checklist,
  ErrorOutline,
  FactCheck,
  FilterAlt,
  FolderOpen,
  Groups,
  Upcoming,
  WavingHand,
} from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_HOME_SECTIONS_CONFIG,
  getHomeSectionsConfig,
  saveHomeSectionsConfig,
} from '../../utils/HomeSectionsConfig'
import SettingsLayout from './SettingsLayout'
import SettingsReorderList from './SettingsReorderList'
import SettingsSection from './SettingsSection'

const ICONS = {
  WavingHand: <WavingHand />,
  Checklist: <Checklist />,
  Groups: <Groups />,
  FactCheck: <FactCheck />,
  ErrorOutline: <ErrorOutline />,
  Upcoming: <Upcoming />,
  FilterAlt: <FilterAlt />,
  FolderOpen: <FolderOpen />,
}

const HomeSectionsSettings = () => {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState(() =>
    [...getHomeSectionsConfig()].sort((a, b) => a.order - b.order),
  )
  const saveConfig = newConfig => {
    setConfig(newConfig)
    saveHomeSectionsConfig(newConfig)
  }

  return (
    <SettingsLayout title={t('homeSections.title')}>
      <Box sx={{ maxWidth: 680, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 560, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('homeSections.description')}
        </Typography>
        <SettingsSection title={t('homeSections.sectionsTitle')}>
          <Typography level='body-xs' textColor='text.tertiary' sx={{ mb: 1 }}>
            {t('layout.reorderHint')}
          </Typography>
          <SettingsReorderList
            id='home-sections'
            items={config.map(item => ({
              ...item,
              label: t(`homeSections.sections.${item.id}.name`, item.name),
              description: t(
                `homeSections.sections.${item.id}.description`,
                item.description,
              ),
              icon: ICONS[item.iconName] || <Groups />,
            }))}
            onToggle={(id, enabled) =>
              saveConfig(
                config.map(item =>
                  item.id === id ? { ...item, enabled } : item,
                ),
              )
            }
            onReorder={ids =>
              saveConfig(
                ids.map((id, order) => ({
                  ...config.find(item => item.id === id),
                  order,
                })),
              )
            }
          />
          <Button
            variant='plain'
            color='neutral'
            size='sm'
            onClick={() => saveConfig(DEFAULT_HOME_SECTIONS_CONFIG)}
            sx={{ mt: 2 }}
          >
            {t('homeSections.resetToDefaults')}
          </Button>
          <Typography
            level='body-xs'
            textColor='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {t('homeSections.resetHelper')}
          </Typography>
        </SettingsSection>
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 2 }}>
          {t('layout.savedOnDevice')}
        </Typography>
      </Box>
    </SettingsLayout>
  )
}

export default HomeSectionsSettings
