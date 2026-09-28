import { Capacitor } from '@capacitor/core'
import { Box, Card, Option, Select, Slider, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_WIDGET_OPACITY,
  getWidgetOpacity,
  getWidgetTheme,
  setWidgetOpacity,
  setWidgetTheme,
  WIDGET_THEMES,
} from '../../service/WidgetService'
import SettingsLayout from './SettingsLayout'

const MARKS = [0, 25, 50, 75, 100].map(value => ({
  value,
  label: `${value}%`,
}))

const WidgetSettings = () => {
  const { t } = useTranslation('settings')
  const [opacity, setOpacity] = useState(getWidgetOpacity)
  const [theme, setTheme] = useState(getWidgetTheme)
  const isNative = Capacitor.isNativePlatform()

  const handleThemeChange = value => {
    if (!value) return
    setTheme(value)
    setWidgetTheme(value)
  }

  // Commit on release rather than on every drag frame: each save crosses the
  // native bridge and redraws every placed widget.
  const handleCommit = value => {
    setOpacity(value)
    setWidgetOpacity(value)
  }

  return (
    <SettingsLayout title={t('widgets.title')}>
      <div className='grid gap-4'>
        <Box>
          <Typography level='title-md' sx={{ fontWeight: 600 }}>
            {t('widgets.opacity.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 1 }}>
            {t('widgets.opacity.description')}
          </Typography>

          <Card variant='outlined' sx={{ px: 3, py: 2 }}>
            {/* A live preview so the number means something before the user
                goes back to their home screen to check. */}
            <Box
              sx={{
                height: 84,
                mb: 2,
                borderRadius: 'lg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(135deg, #0891b2 0%, #7c3aed 55%, #f97316 100%)',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 'md',
                  bgcolor: 'background.surface',
                  opacity: opacity / 100,
                }}
              >
                <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                  {t('widgets.opacity.preview')}
                </Typography>
              </Box>
            </Box>

            <Slider
              aria-label={t('widgets.opacity.title')}
              marks={MARKS}
              max={100}
              min={0}
              step={5}
              value={opacity}
              valueLabelDisplay='auto'
              valueLabelFormat={value => `${value}%`}
              onChange={(event, value) => setOpacity(value)}
              onChangeCommitted={(event, value) => handleCommit(value)}
            />
          </Card>

          <Typography level='body-xs' sx={{ mt: 1.5, color: 'text.tertiary' }}>
            {t(
              isNative
                ? 'widgets.opacity.perWidgetHint'
                : 'widgets.opacity.webHint',
              { defaultOpacity: DEFAULT_WIDGET_OPACITY },
            )}
          </Typography>
        </Box>

        <Box>
          <Typography level='title-md' sx={{ fontWeight: 600 }}>
            {t('widgets.theme.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 1 }}>
            {t('widgets.theme.description')}
          </Typography>

          <Select
            value={theme}
            onChange={(event, value) => handleThemeChange(value)}
          >
            {WIDGET_THEMES.map(value => (
              <Option key={value} value={value}>
                {t(`widgets.theme.options.${value}`)}
              </Option>
            ))}
          </Select>

          <Typography level='body-xs' sx={{ mt: 1.5, color: 'text.tertiary' }}>
            {t(
              isNative
                ? 'widgets.theme.perWidgetHint'
                : 'widgets.opacity.webHint',
            )}
          </Typography>
        </Box>
      </div>
    </SettingsLayout>
  )
}

export default WidgetSettings
