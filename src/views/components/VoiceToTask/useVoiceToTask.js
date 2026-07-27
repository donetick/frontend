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

// Vocabulary fed to the native recognizer as a biasing hint so unfamiliar
// names/labels aren't auto-corrected to a dictionary word (e.g. "Moutaz" →
// "Models"). Best-effort only — unsupported on iOS <13-without-on-device and
// Android <13, which is why the normalizer also does fuzzy post-matching.
const buildVocabulary = (members, userLabels) => [
  ...members.flatMap(m =>
    [m.displayName, m.displayName?.split(/\s+/)[0], m.username].filter(Boolean),
  ),
  ...userLabels.map(l => l.name).filter(Boolean),
]

// phases: idle | listening | review | denied
export function useVoiceToTask({ members = [], userLabels = [] } = {}) {
  const [phase, setPhase] = useState('idle')
  const [isLocked, setIsLocked] = useState(false)
  const [partialText, setPartialText] = useState('')
  const [segments, setSegments] = useState([])

  // Kept in sync manually (not via render) so segment commits that happen
  // inside voiceInputService.stop() are visible immediately afterwards.
  const segmentsRef = useRef([])
  const membersRef = useRef(members)
  membersRef.current = members
  const userLabelsRef = useRef(userLabels)
  userLabelsRef.current = userLabels
  const vocabularyRef = useRef(buildVocabulary(members, userLabels))
  vocabularyRef.current = buildVocabulary(members, userLabels)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const lockedRef = useRef(isLocked)
  lockedRef.current = isLocked

  const pressStartedAtRef = useRef(0)
  const pressStartedListeningRef = useRef(false)
  const lastActivityRef = useRef(0)
  const watchdogRef = useRef(null)
  // While the mic is held (not locked), a mid-hold restart (Android session
  // limits, forced silence boundary) shouldn't split into a new task — the
  // user is still holding the button, so it's still one entry. This tracks
  // which segment is the "active" one for the current hold to merge onto;
  // reset to null on release so the *next* hold starts a fresh entry.
  const activeHoldSegmentIdRef = useRef(null)

  const applySegments = useCallback(next => {
    segmentsRef.current = next
    setSegments(next)
  }, [])

  const commitSegment = useCallback(
    rawText => {
      const normalized = normalizeSpokenText(rawText, {
        members: membersRef.current,
        userLabels: userLabelsRef.current,
      })
      const { text, dropPrevious } = applyScratchThat(normalized)
      const pieces = splitSpokenSegments(text)
      if (!dropPrevious && pieces.length === 0) return

      let base = segmentsRef.current
      if (dropPrevious && base.length > 0) {
        const dropped = base[base.length - 1]
        base = base.slice(0, -1)
        if (activeHoldSegmentIdRef.current === dropped.id) {
          activeHoldSegmentIdRef.current = null
        }
        haptic('medium')
      }
      if (pieces.length === 0) {
        applySegments(base)
        return
      }
      haptic('light')

      if (!lockedRef.current) {
        // Hold-to-talk: the first piece continues the entry already active
        // for this hold (if any); only a spoken separator within the same
        // commit starts additional new entries.
        const activeIndex = base.findIndex(
          s => s.id === activeHoldSegmentIdRef.current,
        )
        if (activeIndex !== -1) {
          const merged = [...base]
          merged[activeIndex] = {
            ...merged[activeIndex],
            text: `${merged[activeIndex].text} ${pieces[0]}`.trim(),
          }
          const rest = pieces.slice(1).map(piece => ({
            id: generateUUID(),
            text: piece,
          }))
          if (rest.length > 0) {
            activeHoldSegmentIdRef.current = rest[rest.length - 1].id
          }
          applySegments([...merged, ...rest])
          return
        }
      }

      const newPieces = pieces.map(piece => ({
        id: generateUUID(),
        text: piece,
      }))
      if (!lockedRef.current) {
        activeHoldSegmentIdRef.current = newPieces[newPieces.length - 1].id
      }
      applySegments([...base, ...newPieces])
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
    // Release ends the current hold — the next hold-press starts a fresh
    // entry rather than continuing to merge onto this one
    activeHoldSegmentIdRef.current = null
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
    await voiceInputService.start(
      {
        onPartial: text => {
          lastActivityRef.current = Date.now()
          setPartialText(
            normalizeSpokenText(text, {
              members: membersRef.current,
              userLabels: userLabelsRef.current,
            }),
          )
        },
        onSegment: commitSegment,
        onError: () => {
          setPhase('denied')
        },
        onStateChange: () => {},
      },
      vocabularyRef.current,
    )
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
        // Quick tap → hands-free lock; from here on, silence boundaries
        // should start new entries again, not merge onto the last one
        activeHoldSegmentIdRef.current = null
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
    activeHoldSegmentIdRef.current = null
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
