/**
 * Thin wrapper over @capacitor/haptics. The plugin is imported lazily so the
 * web build never pulls it into the initial chunk, and every call is a no-op
 * on platforms without a haptics engine (desktop browsers, most of Android web).
 */
const impact = async style => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle[style] })
  } catch {
    // no haptics on this platform
  }
}

export const hapticLight = () => impact('Light')
export const hapticMedium = () => impact('Medium')
export const hapticHeavy = () => impact('Heavy')
