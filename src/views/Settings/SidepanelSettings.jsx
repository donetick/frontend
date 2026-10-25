import {
  CalendarMonth,
  EmojiEvents,
  History,
  Person,
  SupervisorAccount,
  TrendingUp,
  WavingHand,
} from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_SIDEPANEL_CONFIG,
  getSidepanelConfig,
  saveSidepanelConfig,
} from '../../utils/SidepanelConfig'
import SettingsReorderList from './SettingsReorderList'

const ICONS = {
  SupervisorAccount: <SupervisorAccount />,
  TrendingUp: <TrendingUp />,
  WavingHand: <WavingHand />,
  Person: <Person />,
  CalendarMonth: <CalendarMonth />,
  History: <History />,
  EmojiEvents: <EmojiEvents />,
}

// Composed into LayoutSettings, which supplies the desktop-only section.
const SidepanelSettings = () => {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState(() =>
    [...getSidepanelConfig()].sort((a, b) => a.order - b.order),
  )
  const saveConfig = newConfig => {
    setConfig(newConfig)
    saveSidepanelConfig(newConfig)
  }

  return (
    <Box>
      <Typography level='body-xs' textColor='text.tertiary' sx={{ mb: 1 }}>
        {t('layout.reorderHint')}
      </Typography>
      <SettingsReorderList
        id='sidepanel-cards'
        items={config.map(item => ({
          ...item,
          label: t(`sidepanel.cards.${item.id}.name`, item.name),
          description: t(
            `sidepanel.cards.${item.id}.description`,
            item.description,
          ),
          icon: ICONS[item.iconName] || <Person />,
        }))}
        onToggle={(id, enabled) =>
          saveConfig(
            config.map(item => (item.id === id ? { ...item, enabled } : item)),
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
        onClick={() => saveConfig(DEFAULT_SIDEPANEL_CONFIG)}
        sx={{ mt: 2 }}
      >
        {t('sidepanel.resetToDefaults')}
      </Button>
    </Box>
  )
}
export default SidepanelSettings
