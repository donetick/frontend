import {
  Box,
  Radio,
  RadioGroup,
  Sheet,
  Typography,
  useColorScheme,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { THEME_PRESETS } from '@/constants/themePresets'
import { useThemeSkin } from '@/contexts/ThemeSkinContext'
import useStickyState from '@/hooks/useStickyState'

import AppearancePreview from './AppearancePreview'
import SettingsSection from './SettingsSection'
import ThemeSkinPicker from './ThemeSkinPicker'

const ThemeToggle = () => {
  const { t } = useTranslation('settings')
  const { mode, setMode } = useColorScheme()
  const { skin } = useThemeSkin()
  const [, setThemeMode] = useStickyState(mode, 'themeMode')
  const preset = THEME_PRESETS[skin] || THEME_PRESETS.default

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <SettingsSection
        title={t('theme.themeMode')}
        description={t('theme.modeDescription')}
      >
        <RadioGroup
          aria-label={t('theme.themeMode')}
          name='theme-mode'
          value={mode || 'system'}
          onChange={event => {
            setThemeMode(event.target.value)
            setMode(event.target.value)
          }}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          {['light', 'dark', 'system'].map(value => (
            <Sheet
              key={value}
              sx={{
                position: 'relative',
                minWidth: 0,
                p: { xs: 1, sm: 1.5 },
                border: '1px solid',
                borderColor:
                  mode === value ? 'primary.outlinedColor' : 'divider',
                borderRadius: 'lg',
                bgcolor:
                  mode === value ? 'primary.softBg' : 'background.surface',
                '&:focus-within': {
                  outline: '2px solid',
                  outlineColor: 'focusVisible',
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                sx={{
                  mb: 1.5,
                  position: 'relative',
                  '& > *': { minWidth: 0 },
                }}
              >
                {(value === 'system' ? ['light', 'dark'] : [value]).map(
                  (previewMode, index) => (
                    <Box
                      key={previewMode}
                      sx={
                        index
                          ? {
                              position: 'absolute',
                              inset: 0,
                              clipPath: 'inset(0 0 0 50%)',
                            }
                          : undefined
                      }
                    >
                      <AppearancePreview
                        palette={preset[previewMode]}
                        accent={preset.swatch}
                      />
                    </Box>
                  ),
                )}
              </Box>
              <Radio
                overlay
                value={value}
                label={t(`theme.${value}`)}
                size='sm'
                sx={{
                  fontWeight: 600,
                  alignItems: 'center',
                  '& .MuiRadio-label': { overflowWrap: 'anywhere' },
                }}
              />
            </Sheet>
          ))}
        </RadioGroup>
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 1.5 }}>
          {t('theme.systemHint')}
        </Typography>
      </SettingsSection>
      <SettingsSection
        title={t('theme.skin')}
        description={t('theme.skinDescription')}
      >
        <ThemeSkinPicker />
      </SettingsSection>
    </Box>
  )
}
export default ThemeToggle
