import {
  ArrowForward,
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
import { useTranslation } from 'react-i18next'

import EmptyState from '../../../components/common/EmptyState'
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
  onImageCaptured,
  onStateChange,
  onTaskExtracted,
  open,
}) => {
  const { t } = useTranslation('chores')
  const deferProcessing = Boolean(onImageCaptured)
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
  } = useScanToTask({ deferProcessing })

  // The scanned page is usually the task's source of truth (the bill, the
  // notice), so keeping it is the default — the OCR text alone loses it.
  const [keepImage, setKeepImage] = useState(canKeepImage)

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

  // The traditional inline flow applies a finished result immediately. When
  // onImageCaptured is supplied, hand the image back as soon as capture ends;
  // the parent can restore its form and run extraction in the background.
  useEffect(() => {
    if (phase === 'captured' && capturedImage && onImageCaptured) {
      onImageCaptured({
        image: capturedImage,
        keepImage: canKeepImage && keepImage,
      })
      onClose()
    } else if (phase === 'done' && taskResult) {
      onTaskExtracted({
        ...taskResult,
        attachmentImage: canKeepImage && keepImage ? capturedImage : null,
      })
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, taskResult, capturedImage])

  const openFilePicker = useCallback(
    () => fileInputRef.current?.click(),
    [fileInputRef],
  )

  // The recovery path when OCR/AI couldn't identify a task: rather than
  // leaving the user stuck on the error screen, hand the photo straight to
  // the smart input as an attachment so they can finish the task by hand.
  const continueWithoutTask = useCallback(() => {
    onTaskExtracted({
      taskName: null,
      description: null,
      dueDate: null,
      attachmentImage: canKeepImage ? capturedImage : null,
    })
    onClose()
  }, [onTaskExtracted, onClose, canKeepImage, capturedImage])

  // The one action the footer renders for the current phase; null while
  // processing (nothing to do but wait) and when done (the panel closes)
  const primaryAction = useMemo(() => {
    if (phase === 'capture') {
      if (isNativeScanner) {
        return {
          label: t('photoTask.scanDocument'),
          icon: <DocumentScanner />,
          onClick: handleNativeScan,
        }
      }
      if (cameraAvailable) {
        return {
          label: t('photoTask.capture'),
          icon: <CameraAlt />,
          onClick: capture,
        }
      }
      // No camera on this device — Upload is the only way forward, so it
      // graduates from the inline secondary to the footer's primary
      return {
        label: t('photoTask.uploadPhoto'),
        icon: <PhotoCamera />,
        onClick: openFilePicker,
      }
    }
    if (phase === 'error') {
      return { label: t('photoTask.retake'), icon: <Replay />, onClick: retake }
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
      label={t('photoTask.keepAsAttachment')}
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
                  {t('photoTask.tapToScanHint')}
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
                  {t('photoTask.cameraUnavailableUseUpload')}
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
                {t('photoTask.upload')}
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
                alt={t('photoTask.altProcessing')}
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

          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {ocrProgress > 0 && ocrProgress < 100
              ? t('photoTask.readingTextProgress', { progress: ocrProgress })
              : ocrProgress >= 100
                ? t('photoTask.identifyingTask')
                : t('photoTask.preparingScan')}
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

      {/* ── Error phase ──
          Retake (the fix-it path) stays the modal footer's primary action;
          continuing without a task is the quieter, secondary path — same
          hierarchy CircleSetupView uses for its "join instead" offer. */}
      {phase === 'error' && (
        <Box sx={{ py: 1 }}>
          {capturedImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <img
                src={capturedImage}
                alt={t('photoTask.failedScan')}
                style={{
                  maxWidth: '60%',
                  borderRadius: 8,
                  maxHeight: 120,
                  objectFit: 'contain',
                  opacity: 0.5,
                }}
              />
            </Box>
          )}
          <EmptyState
            size='sm'
            variant='error'
            icon={<WarningAmber />}
            title={t('photoTask.failedTitle')}
            description={errorMsg}
            sx={{ py: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
            <Button
              variant='plain'
              color='neutral'
              size='sm'
              endDecorator={<ArrowForward fontSize='small' />}
              onClick={continueWithoutTask}
            >
              {t('photoTask.continueWithoutTask')}
            </Button>
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
