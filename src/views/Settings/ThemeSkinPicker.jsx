import { Box, Radio, RadioGroup, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { THEME_PRESETS } from '@/constants/themePresets'
import { useThemeSkin } from '@/contexts/ThemeSkinContext'

const ThemeSkinPicker = () => {
  const { t } = useTranslation('settings')
  const { setSkin, skin } = useThemeSkin()

  return (
    <Box>
      <Typography level='title-md' id='theme-skin-label' sx={{ mb: 1 }}>
        {t('theme.skin')}
      </Typography>
      <Typography level='body-sm' sx={{ mb: 2 }}>
        {t('theme.skinDescription')}
      </Typography>
      <RadioGroup
        aria-labelledby='theme-skin-label'
        name='theme-skin'
        value={skin}
        onChange={event => setSkin(event.target.value)}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {Object.entries(THEME_PRESETS).map(([id, preset]) => (
          <Sheet
            key={id}
            variant='outlined'
            sx={{
              position: 'relative',
              borderRadius: 'md',
              p: 1.5,
              borderColor:
                skin === id ? 'primary.500' : 'neutral.outlinedBorder',
            }}
          >
            <Box
              aria-hidden='true'
              sx={{
                display: 'flex',
                overflow: 'hidden',
                borderRadius: 'sm',
                mb: 1.5,
                height: 64,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {['light', 'dark'].map(mode => (
                <Box
                  key={mode}
                  sx={{ bgcolor: preset[mode].body, flex: 1, p: 1 }}
                >
                  <Box
                    sx={{
                      bgcolor: preset.swatch,
                      width: '55%',
                      height: 6,
                      borderRadius: 4,
                      mb: 1,
                    }}
                  />
                  <Box
                    sx={{
                      bgcolor: preset[mode].surface,
                      height: 24,
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: preset.swatch,
                    }}
                  />
                </Box>
              ))}
            </Box>
            <Radio
              overlay
              value={id}
              label={t(`theme.skins.${id}`)}
              sx={{ fontWeight: 'md' }}
            />
          </Sheet>
        ))}
      </RadioGroup>
    </Box>
  )
}

export default ThemeSkinPicker
