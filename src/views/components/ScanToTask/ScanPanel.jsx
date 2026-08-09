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
  Checkbox,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/joy'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useScanToTask } from './useScanToTask'

/**
 * Inline scan-to-task panel. Mounts inside AddTaskModal — no second modal.
 *
 * Flow: capture → (auto) processing → done [calls onTaskExtracted + onClose]
 *                                   → error  [retake or cancel]
 *
 * The primary action (Capture / Scan Document / Retake) lives in the modal
 * footer alongside Cancel — the panel reports it up through onStateChange
 * rather than rendering its own button row. Upload stays inline because it
 * belongs to the capture surface and drives a hidden input in this subtree.
 */
const ScanPanel = ({
  autoCapture,
  canKeepImage = false,
  initialImageUrl,
  onClose,
  onStateChange,
  onTaskExtracted,
  open,
}) => {
  const {
    activate,
    cameraAvailable,
    canvasRef,
    capture,
    capturedImage,
    errorMsg,
    fileInputRef,
    handleFileSelect,
    handleNativeScan,
    isNativeScanner,
    ocrProgress,
    phase,
    reset,
    retake,
    startCamera,
    stopCamera,
    taskResult,
    videoRef,
  } = useScanToTask()

  // The scanned page is usually the task's source of truth (the bill, the
  // notice), so keeping it is the default — the OCR text alone loses it.
  const [keepImage, setKeepImage] = useState(false)

  // Start/stop based on open state
  useEffect(() => {
    if (open) {
      activate(initialImageUrl)
      if (autoCapture && isNativeScanner && !initialImageUrl) {
        handleNativeScan()
      }
    } else {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialImageUrl])

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
      onTaskExtracted({
        ...taskResult,
        attachmentImage: canKeepImage && keepImage ? capturedImage : null,
      })
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, taskResult])

  const openFilePicker = useCallback(
    () => fileInputRef.current?.click(),
    [fileInputRef],
  )

  // The one action the footer renders for the current phase; null while
  // processing (nothing to do but wait) and when done (the panel closes)
  const primaryAction = useMemo(() => {
    if (phase === 'capture') {
      if (isNativeScanner) {
        return {
          label: 'Scan Document',
          icon: <DocumentScanner />,
          onClick: handleNativeScan,
        }
      }
      if (cameraAvailable) {
        return { label: 'Capture', icon: <CameraAlt />, onClick: capture }
      }
      // No camera on this device — Upload is the only way forward, so it
      // graduates from the inline secondary to the footer's primary
      return {
        label: 'Upload Photo',
        icon: <PhotoCamera />,
        onClick: openFilePicker,
      }
    }
    if (phase === 'error') {
      return { label: 'Retake', icon: <Replay />, onClick: retake }
    }
    return null
  }, [
    phase,
    isNativeScanner,
    cameraAvailable,
    capture,
    handleNativeScan,
    retake,
    openFilePicker,
  ])

  useEffect(() => {
    onStateChange?.({ phase, primaryAction })
  }, [phase, primaryAction, onStateChange])

  if (!open) return null

  const isProcessing = phase === 'processing'

  // Attachments are a Plus feature; without it the upload would only ever
  // surface an upgrade error, so the choice isn't offered at all.
  const keepImageToggle = !canKeepImage ? null : (
    <Checkbox
      size='sm'
      checked={keepImage}
      onChange={e => setKeepImage(e.target.checked)}
      label='Keep photo as attachment'
      sx={{ '--Checkbox-size': '18px' }}
    />
  )

  return (
    <Box>
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
              // The wrapper used to clip this; it owns its own corners now
              borderRadius: 'md',
              overflow: 'hidden',
            }}
          >
            {isNativeScanner && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <DocumentScanner
                  sx={{ fontSize: 56, color: 'white', opacity: 0.5, mb: 1 }}
                />
                <Typography
                  level='body-sm'
                  sx={{ color: 'white', opacity: 0.6 }}
                >
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
                <Typography
                  level='body-sm'
                  sx={{ color: 'white', opacity: 0.6 }}
                >
                  Camera not available — use Upload instead
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              py: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {/* Hidden when Upload is already the footer's primary action */}
            {(isNativeScanner || cameraAvailable) && (
              <Button
                size='sm'
                variant='plain'
                color='neutral'
                startDecorator={<PhotoCamera fontSize='small' />}
                onClick={openFilePicker}
              >
                Upload
              </Button>
            )}
            {keepImageToggle}
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
            py: 2.5,
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

          {/* Still editable here — the choice is only read once the task lands */}
          {keepImageToggle}
        </Box>
      )}

      {/* ── Error phase ── */}
      {phase === 'error' && (
        <Box sx={{ py: 2 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <WarningAmber color='warning' sx={{ mt: 0.25, flexShrink: 0 }} />
            <Typography level='body-sm'>{errorMsg}</Typography>
          </Box>
        </Box>
      )}

      {/* Kept outside the phase branches so the footer's Upload action can
          reach it even when no capture surface is rendered */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  )
}

export default ScanPanel
