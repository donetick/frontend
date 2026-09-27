import { Capacitor } from '@capacitor/core'

import { getCached, hashContent, setCached } from './AIPromptCache'

// Native-only local AI service using @capacitor/local-llm.
// On web, all methods return 'unavailable' / null — no WebLLM.
class LocalAIService {
  constructor() {
    this._availability = null
    this._sessionId = 'donetick-summary'
    this._warmedUp = false
  }

  get isNative() {
    return Capacitor.isNativePlatform()
  }

  async checkAvailability() {
    if (!this.isNative) {
      this._availability = 'unavailable'
      return 'unavailable'
    }
    try {
      const { LocalLLM } = await import('@capacitor/local-llm')
      const { status } = await LocalLLM.systemAvailability()
      this._availability = status
      return status
    } catch (e) {
      this._availability = 'unavailable'
      return 'unavailable'
    }
  }

  async getStatus() {
    if (this._availability !== null) return this._availability
    return this.checkAvailability()
  }

  async isAvailable() {
    return (await this.getStatus()) === 'available'
  }

  resetAvailability() {
    this._availability = null
  }

  async download(onStatusChange) {
    if (!this.isNative) return
    try {
      const { LocalLLM } = await import('@capacitor/local-llm')
      if (onStatusChange) {
        LocalLLM.addListener('systemAvailabilityChange', ({ status }) => {
          this._availability = status
          onStatusChange(status)
        })
      }
      await LocalLLM.download()
    } catch {
      // download not available on iOS, ignore
    }
  }

  async warmup() {
    if (this._warmedUp || !this.isNative) return
    try {
      const { LocalLLM } = await import('@capacitor/local-llm')
      await LocalLLM.warmup({ sessionId: this._sessionId })
      this._warmedUp = true
    } catch {
      // non-fatal
    }
  }

  async _nativePrompt(text) {
    await this.warmup()
    try {
      const { LocalLLM } = await import('@capacitor/local-llm')
      const { text: out } = await LocalLLM.prompt({
        prompt: text,
        sessionId: this._sessionId,
      })
      return out?.trim() || null
    } finally {
      try {
        const { LocalLLM } = await import('@capacitor/local-llm')
        await LocalLLM.endSession({ sessionId: this._sessionId })
        this._warmedUp = false
      } catch {
        /* ignore */
      }
    }
  }

  // Plain chat — no tools. Returns answer string or null.
  async plainChat(messages) {
    const available = await this.isAvailable()
    if (!available) return null

    const cacheHash = hashContent(['plain', ...messages])
    const cached = getCached(cacheHash)
    if (cached) return cached

    if (!this.isNative) return null

    try {
      const systemMsg = messages.find(m => m.role === 'system')?.content || ''
      const userMsg = messages.find(m => m.role === 'user')?.content || ''
      const result = await this._nativePrompt(
        `${systemMsg}\n\nUser: ${userMsg}\nAssistant:`,
      )
      if (result) setCached(cacheHash, result)
      return result
    } catch (e) {
      console.error('[LocalAI] plainChat() failed:', e)
      return null
    }
  }

  // Returns the summary string or null if LLM is unavailable
  async summarize(prompt) {
    const available = await this.isAvailable()
    if (!available) return null

    const cacheHash = hashContent(prompt)
    const cached = getCached(cacheHash)
    if (cached) return cached

    if (!this.isNative) return null

    try {
      await this.warmup()
      const { LocalLLM } = await import('@capacitor/local-llm')
      const { text } = await LocalLLM.prompt({
        prompt,
        sessionId: this._sessionId,
      })
      const result = text?.trim() || null
      if (result) setCached(cacheHash, result)
      return result
    } catch {
      return null
    } finally {
      try {
        const { LocalLLM } = await import('@capacitor/local-llm')
        await LocalLLM.endSession({ sessionId: this._sessionId })
        this._warmedUp = false
      } catch {
        /* ignore */
      }
    }
  }
}

export const localAIService = new LocalAIService()
