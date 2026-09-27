/**
 * Turns an image source the scanners produce — a base64 data URI on iOS/web,
 * a Capacitor localhost URL on Android — into a File the upload endpoint
 * accepts. Both forms are fetchable, so one path covers them.
 */
export async function imageSourceToFile(source, fileName = 'scan.jpg') {
  if (!source) return null
  try {
    const response = await fetch(source)
    const blob = await response.blob()
    const type = blob.type && blob.type !== '' ? blob.type : 'image/jpeg'
    return new File([blob], fileName, { type })
  } catch (e) {
    console.error('[FileConvert] failed to convert image source:', e)
    return null
  }
}
