import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDocumentScanner } from '../../../hooks/useDocumentScanner'
import { localAIService } from '../../../service/LocalAIService'

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
Include any important ID or URL or instructions in the description.
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

async function runBrowserOCR(imageSource, onProgress) {
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

// Shared by the full scan UI and the native share flow. Keeping OCR and task
// extraction here prevents incoming photos from having to mount ScanPanel just
// to use its processing pipeline.
export async function extractTaskFromImage(
  imageSource,
  { method = 'browser', onProgress } = {},
) {
  const text =
    method === 'native'
      ? await runNativeOCR(imageSource)
      : await runBrowserOCR(imageSource, onProgress)

  if (!text) return { status: 'no-text', task: null }

  const task = await extractTaskFromOCR(text)
  if (!task?.taskName) return { status: 'no-task', task: null }

  return { status: 'found', task }
}

// phases: idle | capture | processing | done | error
export function useScanToTask({ deferProcessing = false } = {}) {
  const { t } = useTranslation('chores')
  const { isNativeScanner, scanDocument } = useDocumentScanner()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [phase, setPhase] = useState('idle')
  const [capturedImage, setCapturedImage] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
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

  const processImage = useCallback(async (imageData, method = 'browser') => {
    setPhase('processing')
    setOcrProgress(0)
    setErrorMsg('')

    try {
      const result = await extractTaskFromImage(imageData, {
        method,
        onProgress: pct => setOcrProgress(pct),
      })

      if (result.status === 'no-text') {
        setErrorMsg(t('photoTask.noTextFound'))
        setPhase('error')
        return
      }
      if (result.status === 'no-task') {
        setErrorMsg(t('photoTask.noTaskIdentified'))
        setPhase('error')
        return
      }

      setTaskResult(result.task)
      setPhase('done')
    } catch (e) {
      setErrorMsg(e.message || t('photoTask.processingFailed'))
      setPhase('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)
    stopCamera()
    if (deferProcessing) setPhase('captured')
    else processImage(dataUrl, 'browser')
  }, [stopCamera, processImage, deferProcessing])

  const handleFileSelect = useCallback(
    e => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target.result
        setCapturedImage(dataUrl)
        stopCamera()
        if (deferProcessing) setPhase('captured')
        else processImage(dataUrl, 'browser')
      }
      reader.readAsDataURL(file)
    },
    [stopCamera, processImage, deferProcessing],
  )

  const handleNativeScan = useCallback(async () => {
    const { cancelled, error, image } = await scanDocument()
    if (cancelled) return
    if (error || !image) {
      setErrorMsg(
        error
          ? t('photoTask.scannerError', { error })
          : t('photoTask.scanFailed'),
      )
      setPhase('error')
      return
    }
    setCapturedImage(image)
    if (deferProcessing) {
      setPhase('captured')
    } else {
      // Native scanner already applied edge detection + crop; use browser OCR
      // since native OCR requires a file path, not a base64 data URI.
      processImage(image, 'browser')
    }
  }, [scanDocument, processImage, deferProcessing])

  const retake = useCallback(() => {
    setCapturedImage(null)
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setPhase('capture')
  }, [])

  const activate = useCallback(
    (initialImageUrl = null) => {
      setCapturedImage(initialImageUrl)
      setTaskResult(null)
      setErrorMsg('')
      setOcrProgress(0)

      if (initialImageUrl) {
        if (deferProcessing) setPhase('captured')
        else processImage(initialImageUrl, 'browser')
        return
      }

      setPhase('capture')
    },
    [processImage, deferProcessing],
  )

  const reset = useCallback(() => {
    stopCamera()
    setCapturedImage(null)
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setPhase('idle')
  }, [stopCamera])

  return {
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
  }
}
