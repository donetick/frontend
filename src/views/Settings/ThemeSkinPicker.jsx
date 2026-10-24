import { Box, Radio, RadioGroup, Sheet, useColorScheme } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { THEME_PRESETS } from '@/constants/themePresets'
import { useThemeSkin } from '@/contexts/ThemeSkinContext'

import AppearancePreview from './AppearancePreview'

const ThemeSkinPicker = () => {
  const { t } = useTranslation('settings')
  const { setSkin, skin } = useThemeSkin()
  const { mode, systemMode } = useColorScheme()
  const resolvedMode =
    (mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light'

  return (
    <RadioGroup
      aria-label={t('theme.skin')}
      name='theme-skin'
      value={skin}
      onChange={event => setSkin(event.target.value)}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 1.5,
      }}
    >
      {Object.entries(THEME_PRESETS).map(([id, preset]) => (
        <Sheet
          key={id}
          sx={{
            position: 'relative',
            minWidth: 0,
            borderRadius: 'lg',
            p: 1.5,
            bgcolor: skin === id ? 'primary.softBg' : 'background.surface',
            border: '1px solid',
            borderColor: skin === id ? 'primary.outlinedColor' : 'divider',
            '&:focus-within': {
              outline: '2px solid',
              outlineColor: 'focusVisible',
              outlineOffset: 2,
            },
          }}
        >
          <Box sx={{ mb: 1.5 }}>
            <AppearancePreview
              palette={preset[resolvedMode]}
              accent={preset.swatch}
            />
          </Box>
          <Radio
            overlay
            value={id}
            label={t(`theme.skins.${id}`)}
            size='sm'
            sx={{ fontWeight: 600 }}
          />
        </Sheet>
      ))}
    </RadioGroup>
  )
}
export default ThemeSkinPicker
