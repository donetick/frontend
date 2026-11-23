import { VisibilityOff } from '@mui/icons-material'
import { Box, Tooltip } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const HiddenLabelIndicator = () => {
  const { t } = useTranslation('labels')
  return (
    <Tooltip title={t('hiddenDescription')}>
      <Box
        component='span'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: 'xs',
          color: 'text.tertiary',
        }}
      >
        <VisibilityOff sx={{ fontSize: 14 }} />
        {t('hidden')}
      </Box>
    </Tooltip>
  )
}

export default HiddenLabelIndicator
