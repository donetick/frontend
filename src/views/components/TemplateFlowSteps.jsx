import { Check } from '@mui/icons-material'
import { Box, Stack, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

export default function TemplateFlowSteps({ active }) {
  const { t } = useTranslation('chores')
  return (
    <Stack
      component='ol'
      direction='row'
      spacing={1}
      aria-label={t('templateLibrary.progress')}
      sx={{ p: 0, m: 0, listStyle: 'none' }}
    >
      {['choose', 'personalize', 'review'].map((step, index) => (
        <Box
          component='li'
          key={step}
          aria-current={active === index ? 'step' : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flex: 1,
            minWidth: 0,
            borderBottom: '2px solid',
            borderColor: index <= active ? 'primary.500' : 'divider',
            pb: 1.5,
          }}
        >
          <Box
            aria-hidden
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: index <= active ? 'primary.softBg' : 'background.level1',
              color: index <= active ? 'primary.softColor' : 'text.tertiary',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {index < active ? <Check sx={{ fontSize: 16 }} /> : index + 1}
          </Box>
          <Typography
            level='body-xs'
            sx={{
              fontWeight: active === index ? 700 : 400,
              color: index === active ? 'text.primary' : 'text.tertiary',
            }}
          >
            {t(`templateLibrary.steps.${step}`)}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

TemplateFlowSteps.propTypes = { active: PropTypes.number.isRequired }
