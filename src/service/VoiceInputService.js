import { Capacitor } from '@capacitor/core'

// Platform-abstracted speech-to-text for voice task capture.
// Native: @capacitor-community/speech-recognition — uses the OS recognizer
//         (on-device where the platform supports it, e.g. iOS dictation models).
// Web:    Web Speech API (Chrome/Safari) — mainly for development.
//
// Callbacks:
//  onPartial(text)     — live transcript of the utterance in progress
//  onSegment(text)     — a finalized utterance (silence/pause boundary)
//  onStateChange(bool) — listening started/stopped
//  onError(code)       — 'denied' | 'error'
//
// Neither OS gives unlimited continuous listening: Android's recognizer ends on
// silence and iOS sessions have a practical duration limit. This service runs a
// restart loop — each recognizer stop commits the buffered utterance as a
// segment and immediately starts a new session while active. The utterance
// boundary doubles as the task boundary.

const SILENCE_COMMIT_MS = 2200
const RESTART_DELAY_MS = 250
// Defense-in-depth: some Android OEM recognizers can die (e.g. after a speech
// timeout error) without emitting any event at all, which would otherwise
// leave the mic looking "still listening" forever with nothing restarting it.
// If no native event of any kind has arrived in this long, assume the session
// is dead and force a restart even with no pending partial text.
const HEARTBEAT_TIMEOUT_MS = 6000
// Native recognizers accept a limited vocabulary hint list; keep it small so
// the common names/labels actually get weighted rather than diluted.
const MAX_CONTEXTUAL_STRINGS = 100
// A known Android build of the plugin never resolved stop()'s promise on
// success — any `await`ed native call here hanging silently would otherwise
// wedge the whole restart loop (and the mic would look stuck "listening"
// forever). Cap every native await so a broken plugin promise can't do that.
const NATIVE_CALL_TIMEOUT_MS = 1500
// Android forwards both the interim AND the true final transcript (from
// onResults) through the same partialResults event, with the final one
// typically landing a couple hundred ms after the session is reported
// "stopped" — and no flag distinguishes them. The final result is usually
// MORE accurate than the last interim (it benefits from the full-utterance
// language model rather than a streaming guess), which matters most exactly
// on names — the same uncertainty behind "Moutaz" being misheard as
// "Models". So rather than committing immediately and discarding the late
// final as noise, wait this long after a session ends for it to arrive and
// supersede the interim before actually committing.
const FINAL_RESULT_GRACE_MS = 450
// Safety net for a final result arriving even later than the grace window
// (or a duplicate slipping through some other path) — still not committed as
// a second task if it looks like the same utterance.
const DUPLICATE_GUARD_MS = 3000
// Below this fraction of shared words, two transcripts are treated as
// different utterances rather than a re-delivery of the same one.
const DUPLICATE_WORD_OVERLAP = 0.6

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))])

const normalizeForDupeCheck = text =>
  text
    .trim()
    .toLowerCase()
    .replace(/[.,!?]/g, '')

// Word-overlap rather than exact/prefix match: names are exactly the words
// ASR is least confident about (the same uncertainty behind "Moutaz" heard as
// "Models"), so the final transcript commonly comes back with a different
// word around a name than the interim partial that already got committed.
// Requiring every character to match would miss that; requiring most of the
// same words to match still catches it as the same utterance.
const wordOverlapRatio = (a, b) => {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean))
  const wordsB = new Set(b.split(/\s+/).filter(Boolean))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let shared = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) shared++
  }
  return shared / Math.max(wordsA.size, wordsB.size)
}

class VoiceInputService {
  constructor() {
    this._active = false
    this._callbacks = null
    this._partial = ''
    this._lastSpeechAt = 0
    this._lastNativeEventAt = 0
    this._silenceTimer = null
    this._restarting = false
    this._restartPromise = null
    this._webRecognition = null
    this._contextualStrings = []
    this._lastCommittedText = ''
    this._lastCommittedAt = 0
    this._awaitingFinal = false
    this._resolveAwaitingFinal = null
  }

  _startOptions() {
    return {
      language: 'en-US',
      maxResults: 1,
      partialResults: true,
      popup: false,
      contextualStrings: this._contextualStrings,
    }
  }

  get isNative() {
    return Capacitor.isNativePlatform()
  }

  async isSupported() {
    if (this.isNative) {
      try {
        const { SpeechRecognition } =
          await import('@capacitor-community/speech-recognition')
        const { available } = await SpeechRecognition.available()
        return !!available
      } catch {
        return false
      }
    }
    return (
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    )
  }

  async requestPermission() {
    if (!this.isNative) {
      // Web prompts for the microphone on first start()
      return 'granted'
    }
    try {
      const { SpeechRecognition } =
        await import('@capacitor-community/speech-recognition')
      const current = await SpeechRecognition.checkPermissions()
      if (current.speechRecognition === 'granted') return 'granted'
      const res = await SpeechRecognition.requestPermissions()
      return res.speechRecognition === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }

  // vocabulary: circle member names + label names, used to bias native
  // recognition toward the words that matter most for task capture (iOS
  // contextualStrings / Android 13+ EXTRA_BIASING_STRINGS). Without this, an
  // unfamiliar name like "Moutaz" can get auto-corrected to a dictionary word.
  async start(callbacks, vocabulary = []) {
    if (this._active) return
    this._callbacks = callbacks
    this._active = true
    this._partial = ''
    this._lastSpeechAt = Date.now()
    this._lastNativeEventAt = Date.now()
    this._contextualStrings = [...new Set(vocabulary.filter(Boolean))].slice(
      0,
      MAX_CONTEXTUAL_STRINGS,
    )

    if (this.isNative) {
      await this._startNative()
      // Web finalizes utterances itself via isFinal results; only the native
      // path needs a silence watchdog to force utterance boundaries.
      this._silenceTimer = setInterval(() => this._checkSilence(), 500)
    } else {
      this._startWeb()
    }
    this._callbacks?.onStateChange?.(true)
  }

  async stop() {
    if (!this._active) return
    this._active = false
    if (this._silenceTimer) {
      clearInterval(this._silenceTimer)
      this._silenceTimer = null
    }
    // Let any in-flight restart (triggered by a native "stopped" event or the
    // heartbeat) finish tearing down first, so it doesn't resurrect a session
    // right after the user asked to stop.
    if (this._restartPromise) {
      await this._restartPromise
    }
    if (this.isNative) {
      let SpeechRecognition
      try {
        ;({ SpeechRecognition } =
          await import('@capacitor-community/speech-recognition'))
        await withTimeout(SpeechRecognition.stop(), NATIVE_CALL_TIMEOUT_MS)
      } catch {
        // recognizer may already be stopped
      }
      // Wait for a possible late-arriving final result while listeners are
      // still attached — removing them first would mean it's never heard.
      // Always runs, even if the native stop() call above failed, so we
      // never skip committing whatever was captured.
      await this._finalizeSegment()
      try {
        await withTimeout(
          SpeechRecognition?.removeAllListeners(),
          NATIVE_CALL_TIMEOUT_MS,
        )
      } catch {
        // non-fatal
      }
    } else if (this._webRecognition) {
      const rec = this._webRecognition
      this._webRecognition = null
      try {
        rec.stop()
      } catch {
        // already stopped
      }
      this._commitPartial()
    } else {
      this._commitPartial()
    }
    this._callbacks?.onStateChange?.(false)
  }

  // Called when a session has ended (or is being torn down for restart) and
  // whatever's in `_partial` is ready to become a task — except Android's
  // true final transcript, if there is one, is usually still in flight and
  // hasn't replaced it yet. Give it a brief window to land first.
  async _finalizeSegment() {
    if (this._partial.trim() && this.isNative) {
      this._awaitingFinal = true
      await new Promise(resolve => {
        this._resolveAwaitingFinal = resolve
        setTimeout(resolve, FINAL_RESULT_GRACE_MS)
      })
      this._awaitingFinal = false
      this._resolveAwaitingFinal = null
    }
    this._commitPartial()
  }

  _commitPartial() {
    const text = this._partial.trim()
    this._partial = ''
    this._callbacks?.onPartial?.('')
    if (text) {
      this._lastCommittedText = normalizeForDupeCheck(text)
      this._lastCommittedAt = Date.now()
      this._callbacks?.onSegment?.(text)
    }
  }

  // True if `text` looks like a re-delivery of what we just committed (exact
  // match, or one is a prefix of the other — covers the final result being a
  // trimmed/extended variant of the last partial we already committed on).
  _isEchoOfLastCommit(text) {
    if (!this._lastCommittedText) return false
    if (Date.now() - this._lastCommittedAt > DUPLICATE_GUARD_MS) return false
    const a = normalizeForDupeCheck(text)
    const b = this._lastCommittedText
    if (a === b || a.startsWith(b) || b.startsWith(a)) return true
    return wordOverlapRatio(a, b) >= DUPLICATE_WORD_OVERLAP
  }

  _checkSilence() {
    if (!this._active || this._restarting) return
    const now = Date.now()
    if (this._partial.trim() && now - this._lastSpeechAt > SILENCE_COMMIT_MS) {
      // A pause means the utterance (= task) is complete: cycle the recognizer
      // so the buffer commits and a fresh session begins.
      this._restartNative()
      return
    }
    if (now - this._lastNativeEventAt > HEARTBEAT_TIMEOUT_MS) {
      // No native event of any kind for too long — the recognizer likely
      // died silently (seen on some Android devices/OEMs). Force a restart
      // so the mic doesn't sit "listening" forever with nothing happening.
      this._restartNative()
    }
  }

  async _startNative() {
    const { SpeechRecognition } =
      await import('@capacitor-community/speech-recognition')
    await SpeechRecognition.removeAllListeners()

    await SpeechRecognition.addListener('partialResults', ({ matches }) => {
      this._lastNativeEventAt = Date.now()
      const text = matches?.[0] || ''
      if (!text) return

      if (this._awaitingFinal) {
        // This is the true final result we were waiting for — it's usually
        // more accurate than the interim it's replacing, so use it and stop
        // waiting out the rest of the grace window.
        this._partial = text
        this._callbacks?.onPartial?.(text)
        this._resolveAwaitingFinal?.()
        return
      }

      if (this._isEchoOfLastCommit(text)) {
        // Arrived even later than the grace window (or some other stray
        // delivery) — still don't let it look like a fresh spoken segment.
        return
      }

      this._partial = text
      this._lastSpeechAt = Date.now()
      this._callbacks?.onPartial?.(text)
    })

    await SpeechRecognition.addListener('listeningState', ({ status }) => {
      this._lastNativeEventAt = Date.now()
      if (status === 'stopped' && this._active && !this._restarting) {
        // OS ended the session on its own (silence on Android, session limit
        // on iOS) — commit and start over.
        this._restartNative()
      }
    })

    // With partialResults the transcript arrives via listeners; the promise's
    // resolution/rejection timing differs per platform, so don't rely on it.
    SpeechRecognition.start(this._startOptions()).catch(() => {
      if (this._active && !this._restarting) {
        this._restartNative()
      }
    })
  }

  _restartNative() {
    if (this._restarting) return this._restartPromise
    this._restarting = true
    this._restartPromise = this._doRestartNative().finally(() => {
      this._restarting = false
      this._restartPromise = null
    })
    return this._restartPromise
  }

  async _doRestartNative() {
    const { SpeechRecognition } =
      await import('@capacitor-community/speech-recognition')
    try {
      await withTimeout(SpeechRecognition.stop(), NATIVE_CALL_TIMEOUT_MS)
    } catch {
      // already stopped
    }
    await this._finalizeSegment()
    // Let the OS recognizer tear down before starting a new session
    await new Promise(r => setTimeout(r, RESTART_DELAY_MS))
    if (this._active) {
      SpeechRecognition.start(this._startOptions()).catch(() => {})
      this._lastSpeechAt = Date.now()
      this._lastNativeEventAt = Date.now()
    }
  }

  _startWeb() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = event => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) {
          this._partial = ''
          this._callbacks?.onPartial?.('')
          const text = res[0].transcript.trim()
          if (text) this._callbacks?.onSegment?.(text)
        } else {
          interim += res[0].transcript
        }
      }
      if (interim) {
        this._partial = interim
        this._lastSpeechAt = Date.now()
        this._callbacks?.onPartial?.(interim)
      }
    }

    rec.onend = () => {
      if (this._active && this._webRecognition === rec) {
        try {
          rec.start()
        } catch {
          // restart can race with teardown
        }
      }
    }

    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this._callbacks?.onError?.('denied')
        this.stop()
      }
    }

    this._webRecognition = rec
    try {
      rec.start()
    } catch {
      this._callbacks?.onError?.('error')
    }
  }
}

export const voiceInputService = new VoiceInputService()
