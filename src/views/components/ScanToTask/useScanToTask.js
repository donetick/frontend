import { useCallback, useRef, useState } from 'react'
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
  const image = imageSource.includes('/_capacitor_file_/')
    ? 'file://' + imageSource.replace(/^https?:\/\/localhost\/_capacitor_file_/, '')
    : imageSource
  const result = await Ocr.process({ image })
  return result.results.map(r => r.text).join('\n').trim()
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

// phases: idle | capture | processing | done | error
export function useScanToTask() {
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
      let text
      if (method === 'native') {
        text = await runNativeOCR(imageData)
      } else {
        text = await runBrowserOCR(imageData, pct => setOcrProgress(pct))
      }

      if (!text) {
        setErrorMsg('No text found in image. Try a clearer photo.')
        setPhase('error')
        return
      }

      const task = await extractTaskFromOCR(text)
      if (!task || !task.taskName) {
        setErrorMsg('Could not identify a task. Try a different photo.')
        setPhase('error')
        return
      }

      setTaskResult(task)
      setPhase('done')
    } catch (e) {
      setErrorMsg(e.message || 'Processing failed.')
      setPhase('error')
    }
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
    processImage(dataUrl, 'browser')
  }, [stopCamera, processImage])

  const handleFileSelect = useCallback(
    e => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target.result
        setCapturedImage(dataUrl)
        stopCamera()
        processImage(dataUrl, 'browser')
      }
      reader.readAsDataURL(file)
    },
    [stopCamera, processImage],
  )

  const handleNativeScan = useCallback(async () => {
    const { image, cancelled, error } = await scanDocument()
    if (cancelled) return { cancelled: true }
    if (error || !image) {
      setErrorMsg(error ? `Scanner error: ${error}` : 'Scan failed.')
      setPhase('error')
      return { cancelled: false }
    }
    setCapturedImage(image)
    processImage(image, 'native')
    return { cancelled: false }
  }, [scanDocument, processImage])

  const retake = useCallback(() => {
    setCapturedImage(null)
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setPhase('capture')
  }, [])

  const activate = useCallback(() => {
    setCapturedImage(null)
    setTaskResult(null)
    setErrorMsg('')
    setOcrProgress(0)
    setPhase('capture')
  }, [])

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
    setCapturedImage,
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
    processImage,
    handleFileSelect,
    handleNativeScan,
    retake,
    activate,
    reset,
  }
}
