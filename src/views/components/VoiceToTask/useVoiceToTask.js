import { useCallback, useEffect, useRef, useState } from 'react'
import { voiceInputService } from '../../../service/VoiceInputService'
import { generateUUID } from '../../../utils/UUID'
import {
  applyScratchThat,
  normalizeSpokenText,
  splitSpokenSegments,
} from './voiceNormalizer'

// Mic gesture: hold = push-to-talk (release stops), quick tap = hands-free
// lock (tap again to stop). In hands-free mode, sustained silence auto-stops
// into review so the user is never stuck watching a live mic.

const TAP_THRESHOLD_MS = 400
const HANDS_FREE_SILENCE_STOP_MS = 8000
const HANDS_FREE_EMPTY_STOP_MS = 20000

const haptic = async kind => {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import(
      '@capacitor/haptics'
    )
    if (kind === 'notification') {
      await Haptics.notification({ type: NotificationType.Success })
    } else if (kind === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } else {
      await Haptics.impact({ style: ImpactStyle.Light })
    }
  } catch {
    // no haptics on this platform
  }
}

// phases: idle | listening | review | denied
export function useVoiceToTask({ members = [] } = {}) {
  const [phase, setPhase] = useState('idle')
  const [isLocked, setIsLocked] = useState(false)
  const [partialText, setPartialText] = useState('')
  const [segments, setSegments] = useState([])

  // Kept in sync manually (not via render) so segment commits that happen
  // inside voiceInputService.stop() are visible immediately afterwards.
  const segmentsRef = useRef([])
  const membersRef = useRef(members)
  membersRef.current = members

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const lockedRef = useRef(isLocked)
  lockedRef.current = isLocked

  const pressStartedAtRef = useRef(0)
  const pressStartedListeningRef = useRef(false)
  const lastActivityRef = useRef(0)
  const watchdogRef = useRef(null)

  const applySegments = useCallback(next => {
    segmentsRef.current = next
    setSegments(next)
  }, [])

  const commitSegment = useCallback(
    rawText => {
      const normalized = normalizeSpokenText(rawText, {
        members: membersRef.current,
      })
      const { text, dropPrevious } = applyScratchThat(normalized)
      const pieces = splitSpokenSegments(text)
      if (!dropPrevious && pieces.length === 0) return

      let base = segmentsRef.current
      if (dropPrevious && base.length > 0) {
        base = base.slice(0, -1)
        haptic('medium')
      }
      if (pieces.length > 0) haptic('light')
      applySegments([
        ...base,
        ...pieces.map(piece => ({ id: generateUUID(), text: piece })),
      ])
    },
    [applySegments],
  )

  const stopListening = useCallback(async () => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current)
      watchdogRef.current = null
    }
    await voiceInputService.stop()
    setPartialText('')
    setIsLocked(false)
    // stop() commits any buffered partial synchronously through onSegment,
    // so the ref is up to date by the time we read it
    setPhase(segmentsRef.current.length > 0 ? 'review' : 'idle')
    haptic('light')
  }, [])

  const startListening = useCallback(async () => {
    const permission = await voiceInputService.requestPermission()
    if (permission !== 'granted') {
      setPhase('denied')
      return false
    }
    lastActivityRef.current = Date.now()
    await voiceInputService.start({
      onPartial: text => {
        lastActivityRef.current = Date.now()
        setPartialText(
          normalizeSpokenText(text, { members: membersRef.current }),
        )
      },
      onSegment: commitSegment,
      onError: () => {
        setPhase('denied')
      },
      onStateChange: () => {},
    })
    setPhase('listening')
    haptic('medium')

    // Hands-free: auto-stop into review after sustained silence
    watchdogRef.current = setInterval(() => {
      if (phaseRef.current !== 'listening' || !lockedRef.current) return
      const idleFor = Date.now() - lastActivityRef.current
      const limit =
        segmentsRef.current.length > 0
          ? HANDS_FREE_SILENCE_STOP_MS
          : HANDS_FREE_EMPTY_STOP_MS
      if (idleFor > limit) {
        stopListening()
      }
    }, 1000)
    return true
  }, [commitSegment, stopListening])

  // One-tap entry: start listening already locked into hands-free mode
  const startHandsFree = useCallback(async () => {
    if (phaseRef.current === 'listening') return
    const ok = await startListening()
    if (ok) setIsLocked(true)
  }, [startListening])

  const micPressDown = useCallback(() => {
    pressStartedAtRef.current = Date.now()
    if (phaseRef.current === 'listening') {
      pressStartedListeningRef.current = false
      return
    }
    pressStartedListeningRef.current = true
    startListening()
  }, [startListening])

  const micPressUp = useCallback(() => {
    const held = Date.now() - pressStartedAtRef.current
    if (pressStartedListeningRef.current) {
      if (held < TAP_THRESHOLD_MS) {
        // Quick tap → hands-free lock
        setIsLocked(true)
      } else {
        // Hold-to-talk → release ends the capture
        stopListening()
      }
    } else if (phaseRef.current === 'listening') {
      // Tap while already listening (locked mode) → stop
      stopListening()
    }
    pressStartedListeningRef.current = false
  }, [stopListening])

  const removeSegment = useCallback(
    id => {
      applySegments(segmentsRef.current.filter(s => s.id !== id))
    },
    [applySegments],
  )

  const updateSegment = useCallback(
    (id, text) => {
      applySegments(
        segmentsRef.current
          .map(s => (s.id === id ? { ...s, text: text.trim() } : s))
          .filter(s => s.text),
      )
    },
    [applySegments],
  )

  // Picker edits on a card are stored as overrides that win over whatever a
  // re-parse of the spoken text would produce
  const patchSegment = useCallback(
    (id, patch) => {
      applySegments(
        segmentsRef.current.map(s =>
          s.id === id
            ? { ...s, overrides: { ...(s.overrides || {}), ...patch } }
            : s,
        ),
      )
    },
    [applySegments],
  )

  const reset = useCallback(() => {
    voiceInputService.stop()
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current)
      watchdogRef.current = null
    }
    applySegments([])
    setPartialText('')
    setIsLocked(false)
    setPhase('idle')
  }, [applySegments])

  // Stop the recognizer if the panel unmounts mid-capture
  useEffect(() => {
    return () => {
      voiceInputService.stop()
      if (watchdogRef.current) clearInterval(watchdogRef.current)
    }
  }, [])

  return {
    phase,
    isLocked,
    partialText,
    segments,
    micPressDown,
    micPressUp,
    startListening,
    startHandsFree,
    stopListening,
    removeSegment,
    updateSegment,
    patchSegment,
    reset,
    isNative: voiceInputService.isNative,
  }
}
