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

const START_OPTIONS = {
  language: 'en-US',
  maxResults: 1,
  partialResults: true,
  popup: false,
}

class VoiceInputService {
  constructor() {
    this._active = false
    this._callbacks = null
    this._partial = ''
    this._lastSpeechAt = 0
    this._silenceTimer = null
    this._restarting = false
    this._webRecognition = null
  }

  get isNative() {
    return Capacitor.isNativePlatform()
  }

  async isSupported() {
    if (this.isNative) {
      try {
        const { SpeechRecognition } = await import(
          '@capacitor-community/speech-recognition'
        )
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
      const { SpeechRecognition } = await import(
        '@capacitor-community/speech-recognition'
      )
      const current = await SpeechRecognition.checkPermissions()
      if (current.speechRecognition === 'granted') return 'granted'
      const res = await SpeechRecognition.requestPermissions()
      return res.speechRecognition === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }

  async start(callbacks) {
    if (this._active) return
    this._callbacks = callbacks
    this._active = true
    this._partial = ''
    this._lastSpeechAt = Date.now()

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
    if (this.isNative) {
      try {
        const { SpeechRecognition } = await import(
          '@capacitor-community/speech-recognition'
        )
        await SpeechRecognition.stop()
        await SpeechRecognition.removeAllListeners()
      } catch {
        // recognizer may already be stopped
      }
    } else if (this._webRecognition) {
      const rec = this._webRecognition
      this._webRecognition = null
      try {
        rec.stop()
      } catch {
        // already stopped
      }
    }
    this._commitPartial()
    this._callbacks?.onStateChange?.(false)
  }

  _commitPartial() {
    const text = this._partial.trim()
    this._partial = ''
    this._callbacks?.onPartial?.('')
    if (text) this._callbacks?.onSegment?.(text)
  }

  _checkSilence() {
    if (!this._active || this._restarting) return
    if (
      this._partial.trim() &&
      Date.now() - this._lastSpeechAt > SILENCE_COMMIT_MS
    ) {
      // A pause means the utterance (= task) is complete: cycle the recognizer
      // so the buffer commits and a fresh session begins.
      this._restartNative()
    }
  }

  async _startNative() {
    const { SpeechRecognition } = await import(
      '@capacitor-community/speech-recognition'
    )
    await SpeechRecognition.removeAllListeners()

    await SpeechRecognition.addListener('partialResults', ({ matches }) => {
      const text = matches?.[0] || ''
      if (!text) return
      this._partial = text
      this._lastSpeechAt = Date.now()
      this._callbacks?.onPartial?.(text)
    })

    await SpeechRecognition.addListener('listeningState', ({ status }) => {
      if (status === 'stopped' && this._active && !this._restarting) {
        // OS ended the session on its own (silence on Android, session limit
        // on iOS) — commit and start over.
        this._restartNative()
      }
    })

    // With partialResults the transcript arrives via listeners; the promise's
    // resolution/rejection timing differs per platform, so don't rely on it.
    SpeechRecognition.start(START_OPTIONS).catch(() => {
      if (this._active && !this._restarting) {
        this._restartNative()
      }
    })
  }

  async _restartNative() {
    if (this._restarting) return
    this._restarting = true
    try {
      const { SpeechRecognition } = await import(
        '@capacitor-community/speech-recognition'
      )
      try {
        await SpeechRecognition.stop()
      } catch {
        // already stopped
      }
      this._commitPartial()
      // Let the OS recognizer tear down before starting a new session
      await new Promise(r => setTimeout(r, RESTART_DELAY_MS))
      if (this._active) {
        SpeechRecognition.start(START_OPTIONS).catch(() => {})
        this._lastSpeechAt = Date.now()
      }
    } finally {
      this._restarting = false
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
