import {
  CameraAlt,
  DocumentScanner,
  PhotoCamera,
  Replay,
  WarningAmber,
} from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/joy'
import { useEffect } from 'react'
import { useScanToTask } from './useScanToTask'

/**
 * Inline scan-to-task panel. Mounts inside AddTaskModal — no second modal.
 *
 * Flow: capture → (auto) processing → done [calls onTaskExtracted + onClose]
 *                                   → error  [retake or cancel]
 */
const ScanPanel = ({ open, onTaskExtracted, onClose }) => {
  const {
    isNativeScanner,
    phase,
    capturedImage,
    ocrProgress,
    taskResult,
    errorMsg,
    cameraAvailable,
    videoRef,
    canvasRef,
    fileInputRef,
    startCamera,
    stopCamera,
    capture,
    handleFileSelect,
    handleNativeScan,
    retake,
    activate,
    reset,
  } = useScanToTask()

  // Start/stop based on open state
  useEffect(() => {
    if (open) {
      activate()
    } else {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Start camera when entering capture phase on web
  useEffect(() => {
    if (phase === 'capture' && !isNativeScanner) {
      startCamera()
    }
    if (phase !== 'capture') {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isNativeScanner])

  // Auto-close and populate when done
  useEffect(() => {
    if (phase === 'done' && taskResult) {
      onTaskExtracted(taskResult)
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, taskResult])

  if (!open) return null

  const isProcessing = phase === 'processing'

  return (
    <Box
      sx={{
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'primary.outlinedBorder',
        overflow: 'hidden',
        bgcolor: 'background.level1',
      }}
    >
      {/* ── Capture phase ── */}
      {phase === 'capture' && (
        <>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: 200,
              maxHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'neutral.900',
              overflow: 'hidden',
            }}
          >
            {isNativeScanner && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <DocumentScanner
                  sx={{ fontSize: 56, color: 'white', opacity: 0.5, mb: 1 }}
                />
                <Typography level='body-sm' sx={{ color: 'white', opacity: 0.6 }}>
                  Tap &quot;Scan Document&quot; to open the scanner
                </Typography>
              </Box>
            )}

            {!isNativeScanner && cameraAvailable && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  display: 'block',
                  maxHeight: 300,
                  objectFit: 'cover',
                }}
              />
            )}

            {!isNativeScanner && !cameraAvailable && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <CameraAlt
                  sx={{ fontSize: 48, color: 'white', opacity: 0.4, mb: 1 }}
                />
                <Typography level='body-sm' sx={{ color: 'white', opacity: 0.6 }}>
                  Camera not available — use Upload instead
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              px: 1.5,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Button
              size='sm'
              variant='plain'
              color='neutral'
              startDecorator={<PhotoCamera fontSize='small' />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Button size='sm' variant='plain' color='neutral' onClick={onClose}>
                Cancel
              </Button>
              {isNativeScanner ? (
                <Button
                  size='sm'
                  variant='solid'
                  color='primary'
                  startDecorator={<DocumentScanner fontSize='small' />}
                  onClick={handleNativeScan}
                >
                  Scan Document
                </Button>
              ) : (
                cameraAvailable && (
                  <Button
                    size='sm'
                    variant='solid'
                    color='primary'
                    startDecorator={<CameraAlt fontSize='small' />}
                    onClick={capture}
                  >
                    Capture
                  </Button>
                )
              )}
            </Box>
          </Box>
        </>
      )}

      {/* ── Processing phase ── */}
      {isProcessing && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            p: 2.5,
          }}
        >
          {capturedImage && (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                borderRadius: 'sm',
                overflow: 'hidden',
              }}
            >
              <img
                src={capturedImage}
                alt='Processing'
                style={{
                  width: '100%',
                  display: 'block',
                  maxHeight: 180,
                  objectFit: 'contain',
                  opacity: 0.45,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size='md' />
              </Box>
            </Box>
          )}

          <Typography level='body-sm' sx={{ opacity: 0.7 }}>
            {ocrProgress > 0 && ocrProgress < 100
              ? `Reading text… ${ocrProgress}%`
              : ocrProgress >= 100
                ? 'Identifying task with AI…'
                : 'Starting…'}
          </Typography>

          {ocrProgress > 0 && ocrProgress < 100 && (
            <LinearProgress
              determinate
              value={ocrProgress}
              sx={{ width: '100%' }}
            />
          )}
        </Box>
      )}

      {/* ── Error phase ── */}
      {phase === 'error' && (
        <Box sx={{ p: 2 }}>
          {capturedImage && (
            <img
              src={capturedImage}
              alt='Failed scan'
              style={{
                width: '100%',
                display: 'block',
                borderRadius: 8,
                maxHeight: 160,
                objectFit: 'contain',
                opacity: 0.4,
                marginBottom: 12,
              }}
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
            <WarningAmber color='warning' sx={{ mt: 0.25, flexShrink: 0 }} />
            <Typography level='body-sm'>{errorMsg}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size='sm'
              variant='outlined'
              color='neutral'
              startDecorator={<Replay fontSize='small' />}
              onClick={retake}
            >
              Retake
            </Button>
            <Button size='sm' variant='plain' color='neutral' onClick={onClose}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  )
}

export default ScanPanel
