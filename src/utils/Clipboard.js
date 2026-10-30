// Returns false when the browser blocks both copy methods.
export const copyText = async text => {
  if (text === null || text === undefined) return false

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(String(text))
      return true
    } catch {
      // Permissions or embedding policies can block the modern API too.
    }
  }

  const activeElement = document.activeElement
  const selection = window.getSelection()
  const ranges = []
  for (let i = 0; selection && i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i).cloneRange())
  }
  const textarea = document.createElement('textarea')
  textarea.value = String(text)
  textarea.readOnly = true
  textarea.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;'
  // Stay inside a modal's focus trap when copying from a dialog.
  const container = activeElement?.closest('[role="dialog"]') || document.body
  container.appendChild(textarea)

  try {
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    // Legacy fallback for HTTP, where navigator.clipboard is unavailable.
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
    activeElement?.focus?.({ preventScroll: true })
    if (selection) {
      selection.removeAllRanges()
      ranges.forEach(range => selection.addRange(range))
    }
  }
}
