import {
  ArrowBack,
  CameraAlt,
  CheckCircle,
  DocumentScanner,
  PhotoCamera,
  Replay,
  TextSnippet,
} from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/joy'
import { useCallback, useEffect, useRef, useState } from 'react'

import ModalActions from '../../components/common/ModalActions'
import { useDocumentScanner } from '../../hooks/useDocumentScanner'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { localAIService } from '../../service/LocalAIService'

const SYSTEM_PROMPT = `You are helping create tasks for a household task management app.

Given OCR text extracted from a photo, identify the most useful task a person should add to their task list.

The task title should always start with an action verb when possible.

Examples:

Bill -> "Pay water bill"
Appointment -> "Attend eye doctor appointment"
Invitation -> "RSVP for wedding"
Renewal Notice -> "Renew vehicle registration"
Package Notice -> "Pick up package"
School Form -> "Complete school permission form"

Action Priority Rules:

1. Payments and bills
2. Deadlines and renewals
3. Appointments
4. Required forms
5. Informational actions (view, read, review)


Rules:

Generate at most one task.
Focus on the most important action.
Extract due dates and deadlines.
Use appointment dates as due dates when appropriate.
Do not invent information.
If the content contains no actionable item, return null values.
Include any important ID or URL or instructions in the description
Titles must be specific and useful at a glance.
Include the organization, provider, event, or subject when available.
Avoid generic document names.
Return valid JSON only.
Output:

{
  "taskName": string | null,
  "description": string | null,
  "dueDate": string | null,
  "confidence": number
}`

async function runNativeOCR(imageSource) {
  const { Ocr } = await import('@jcesarmobile/capacitor-ocr')

  let image = imageSource
  if (imageSource.includes('/_capacitor_file_/')) {
    // Convert Capacitor WebView file URL → native file:// URL the plugin can read
    image =
      'file://' +
      imageSource.replace(/^https?:\/\/localhost\/_capacitor_file_/, '')
  } else if (imageSource.startsWith('data:')) {
    // iOS document scanner returns base64; strip the data URI prefix for the native plugin
    image = imageSource.split(',')[1] || imageSource
  }

  const result = await Ocr.process({ image })
  return result.results
    .map(r => r.text)
    .join('\n')
    .trim()
}

async function runOCR(imageSource, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  const { data } = await worker.recognize(imageSource)
  await worker.terminate()
  return data.text?.trim() || ''
}

async function extractTaskFromOCR(ocrText) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `OCR Text:\n${ocrText}` },
  ]

  const result = await localAIService.plainChat(messages)
  if (!result) return null

  const jsonMatch = result.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

const PhotoTaskModal = ({ onClose, onTaskExtracted, open }) => {
  const { ResponsiveModal } = useResponsiveModal()
  const { isNativeScanner, scanDocument } = useDocumentScanner()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [phase, setPhase] = useState('capture') // capture | preview | ocr | llm | done | error
  const [capturedImage, setCapturedImage] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrText, setOcrText] = useState('')
  const [ocrMethod, setOcrMethod] = useState('tesseract')
  const [showRawText, setShowRawText] = useState(false)
  const [taskResult, setTaskResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraAvailable, setCameraAvailable] = useState(true)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraAvailable(true)
    } catch {
      setCameraAvailable(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (open && phase === 'capture' && !isNativeScanner) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open, phase, isNativeScanner, startCamera, stopCamera])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)
    stopCamera()
    setPhase('preview')
  }

  const handleFileSelect = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCapturedImage(ev.target.result)
      stopCamera()
      setPhase('preview')
    }
    reader.readAsDataURL(file)
  }

  const handleBackToPreview = () => {
    setOcrText('')
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setShowRawText(false)
    setPhase('preview')
  }

  const handleProcess = async (method = 'tesseract') => {
    setOcrMethod(method)
    setPhase('ocr')
    setOcrProgress(0)
    setErrorMsg('')
    setShowRawText(false)

    try {
      let text
      if (method === 'native') {
        try {
          text = await runNativeOCR(capturedImage)
        } catch {
          throw new Error(
            'Native OCR is only available on iOS and Android devices.',
          )
        }
      } else {
        text = await runOCR(capturedImage, pct => setOcrProgress(pct))
      }
      setOcrText(text)

      if (!text) {
        setErrorMsg('No text found in the image. Please try a clearer photo.')
        setPhase('error')
        return
      }

      setPhase('llm')
      const task = await extractTaskFromOCR(text)

      if (!task || !task.taskName) {
        setErrorMsg(
          'Could not identify a task from this image. Please try a different photo.',
        )
        setPhase('error')
        return
      }

      setTaskResult(task)
      setPhase('done')
    } catch (e) {
      setErrorMsg(`Processing failed: ${e.message || 'Unknown error'}`)
      setPhase('error')
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setOcrText('')
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setShowRawText(false)
    setPhase('capture')
  }

  const handleNativeScan = async () => {
    const { cancelled, error, image } = await scanDocument()
    if (cancelled) return
    if (error || !image) {
      setErrorMsg(
        error ? `Scanner error: ${error}` : 'Scan cancelled or failed.',
      )
      setPhase('error')
      return
    }
    setCapturedImage(image)
    stopCamera()
    setPhase('preview')
  }

  const handleConfirm = () => {
    if (taskResult) {
      onTaskExtracted(taskResult)
    }
    handleClose()
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setOcrText('')
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setShowRawText(false)
    setPhase('capture')
    onClose()
  }

  const isProcessing = phase === 'ocr' || phase === 'llm'

  return (
    <ResponsiveModal
      open={open}
      onClose={handleClose}
      size='md'
      fullWidth
      title='Scan photo to create task'
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(phase === 'capture' || phase === 'preview') && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              borderRadius: 'md',
              overflow: 'hidden',
              bgcolor: 'background.level1',
              minHeight: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {phase === 'capture' && !isNativeScanner && cameraAvailable && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block' }}
              />
            )}
            {phase === 'capture' && isNativeScanner && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <DocumentScanner sx={{ fontSize: 64, opacity: 0.4, mb: 1 }} />
                <Typography level='body-sm' sx={{ opacity: 0.6 }}>
                  Tap &quot;Scan Document&quot; to open the scanner
                </Typography>
              </Box>
            )}
            {phase === 'capture' && !isNativeScanner && !cameraAvailable && (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <CameraAlt sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
                <Typography level='body-sm' sx={{ opacity: 0.7 }}>
                  Camera not available
                </Typography>
              </Box>
            )}
            {phase === 'preview' && capturedImage && (
              <img
                src={capturedImage}
                alt='Captured document'
                style={{ width: '100%', display: 'block' }}
              />
            )}
          </Box>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {isProcessing && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              py: 4,
            }}
          >
            {capturedImage && (
              <img
                src={capturedImage}
                alt='Processing'
                style={{
                  width: '100%',
                  borderRadius: 8,
                  opacity: 0.6,
                  maxHeight: 200,
                  objectFit: 'contain',
                }}
              />
            )}
            <CircularProgress size='md' />
            {phase === 'ocr' && ocrMethod === 'tesseract' && (
              <>
                <Typography level='body-sm'>
                  Reading text from image… {ocrProgress}%
                </Typography>
                <LinearProgress
                  determinate
                  value={ocrProgress}
                  sx={{ width: '100%' }}
                />
              </>
            )}
            {phase === 'ocr' && ocrMethod === 'native' && (
              <Typography level='body-sm'>Running native OCR…</Typography>
            )}
            {phase === 'llm' && (
              <Typography level='body-sm'>Identifying task with AI…</Typography>
            )}
          </Box>
        )}

        {phase === 'done' && taskResult && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color='success' />
              <Typography level='title-sm'>Task identified</Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 'md',
                bgcolor: 'background.level1',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography level='title-sm'>{taskResult.taskName}</Typography>
              {taskResult.description && (
                <Typography level='body-xs' sx={{ mt: 0.5, opacity: 0.8 }}>
                  {taskResult.description}
                </Typography>
              )}
              {taskResult.dueDate && (
                <Typography level='body-xs' sx={{ mt: 0.5, opacity: 0.7 }}>
                  Due: {taskResult.dueDate}
                </Typography>
              )}
            </Box>
            {ocrText && (
              <>
                <Button
                  size='sm'
                  variant='plain'
                  color='neutral'
                  startDecorator={<TextSnippet />}
                  onClick={() => setShowRawText(v => !v)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {showRawText ? 'Hide Raw Text' : 'Show Raw Text'}
                </Button>
                {showRawText && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'background.level2',
                      border: '1px solid',
                      borderColor: 'divider',
                      maxHeight: 180,
                      overflowY: 'auto',
                    }}
                  >
                    <Typography
                      level='body-xs'
                      sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                    >
                      {ocrText}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {phase === 'error' && (
          <Box
            sx={{
              p: 2,
              borderRadius: 'md',
              bgcolor: 'danger.softBg',
              color: 'danger.softColor',
            }}
          >
            <Typography level='body-sm'>{errorMsg}</Typography>
          </Box>
        )}

        <ModalActions sx={{ mt: 1 }}>
          {phase === 'capture' && (
            <>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              {isNativeScanner ? (
                <Button
                  variant='solid'
                  color='primary'
                  startDecorator={<DocumentScanner />}
                  onClick={handleNativeScan}
                >
                  Scan Document
                </Button>
              ) : (
                cameraAvailable && (
                  <Button
                    variant='solid'
                    color='primary'
                    startDecorator={<CameraAlt />}
                    onClick={handleCapture}
                  >
                    Capture
                  </Button>
                )
              )}
            </>
          )}

          {phase === 'preview' && (
            <>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<Replay />}
                onClick={handleRetake}
              >
                Retake
              </Button>
              {isNativeScanner &&
                capturedImage &&
                !capturedImage.startsWith('data:') && (
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={() => handleProcess('native')}
                  >
                    Process Natively
                  </Button>
                )}
              <Button
                variant='solid'
                color='primary'
                onClick={() => handleProcess('tesseract')}
              >
                Process Image
              </Button>
            </>
          )}

          {phase === 'error' && (
            <>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<ArrowBack />}
                onClick={handleBackToPreview}
              >
                Back
              </Button>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<Replay />}
                onClick={handleRetake}
              >
                Retake
              </Button>
            </>
          )}

          {phase === 'done' && (
            <>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<ArrowBack />}
                onClick={handleBackToPreview}
              >
                Back
              </Button>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<Replay />}
                onClick={handleRetake}
              >
                Retake
              </Button>
              <Button variant='solid' color='primary' onClick={handleConfirm}>
                Create Task
              </Button>
            </>
          )}
        </ModalActions>
      </Box>
    </ResponsiveModal>
  )
}

export default PhotoTaskModal
