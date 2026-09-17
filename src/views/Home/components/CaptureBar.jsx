import { Add, DocumentScanner, MicNone } from '@mui/icons-material'
import { Box, IconButton, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { localAIService } from '../../../service/LocalAIService'
import { voiceInputService } from '../../../service/VoiceInputService'
import { getSafeBottom } from '../../../utils/SafeAreaUtils'

/**
 * Home answers "what's next" and "I just thought of something" with the same
 * screen, so capture is pinned rather than scrolled to. Voice and scan only
 * appear where the device can actually do them — a mic button that opens a
 * text field is worse than no mic button.
 */
const CaptureBar = ({ onCapture }) => {
  const { t } = useTranslation('common')
  const [voiceReady, setVoiceReady] = useState(false)
  const [scanReady, setScanReady] = useState(false)

  useEffect(() => {
    let alive = true
    voiceInputService
      .isSupported()
      .then(ok => alive && setVoiceReady(ok))
      .catch(() => {})
    localAIService
      .isAvailable()
      .then(ok => alive && setScanReady(ok))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <Box
      sx={{
        bottom: getSafeBottom(12, 4),
        display: 'flex',
        insetInline: 0,
        justifyContent: 'center',
        pointerEvents: 'none',
        position: 'fixed',
        px: 2,
        zIndex: 100,
        '@media (max-width: 768px)': {
          bottom: getSafeBottom(68, 4),
        },
      }}
    >
      <Sheet
        variant='outlined'
        sx={{
          alignItems: 'center',
          borderRadius: '999px',
          boxShadow: 'lg',
          display: 'flex',
          gap: 0.5,
          // Matches the Container maxWidth='sm' content column (600 minus the
          // 2-unit gutters) so the bar lines up with the cards above it.
          maxWidth: 568,
          pointerEvents: 'auto',
          pl: 2,
          pr: 0.75,
          py: 0.75,
          width: '100%',
        }}
      >
        <Box
          component='button'
          type='button'
          onClick={() => onCapture(null)}
          sx={{
            background: 'transparent',
            border: 'none',
            cursor: 'text',
            flex: 1,
            font: 'inherit',
            minWidth: 0,
            p: 0,
            textAlign: 'start',
          }}
        >
          <Typography level='body-md' textColor='text.tertiary' noWrap>
            {t('home.capture.placeholder')}
          </Typography>
        </Box>

        {voiceReady && (
          <IconButton
            variant='soft'
            color='neutral'
            size='sm'
            onClick={() => onCapture('voice')}
            aria-label={t('home.capture.voice')}
            sx={{ borderRadius: '50%' }}
          >
            <MicNone sx={{ fontSize: 19 }} />
          </IconButton>
        )}
        {scanReady && (
          <IconButton
            variant='soft'
            color='neutral'
            size='sm'
            onClick={() => onCapture('scan')}
            aria-label={t('home.capture.scan')}
            sx={{ borderRadius: '50%' }}
          >
            <DocumentScanner sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <IconButton
          variant='solid'
          color='primary'
          size='sm'
          onClick={() => onCapture(null)}
          aria-label={t('home.capture.add')}
          sx={{ borderRadius: '50%' }}
        >
          <Add sx={{ fontSize: 20 }} />
        </IconButton>
      </Sheet>
    </Box>
  )
}

CaptureBar.propTypes = {
  onCapture: PropTypes.func.isRequired,
}

export default CaptureBar
