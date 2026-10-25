// Tint matching neutral shades rather than using primary.softBg for everything.
// This keeps neutral cards understated and preserves light/dark shade ordering.
export const tintNeutralPalette = (neutral, accent) =>
  Object.fromEntries(
    Object.entries(neutral).map(([shade, hex]) => {
      const tinted = [1, 3, 5].map(offset => {
        const baseChannel = parseInt(hex.slice(offset, offset + 2), 16)
        const accentChannel = parseInt(
          accent[shade].slice(offset, offset + 2),
          16,
        )
        return Math.round(baseChannel * 0.65 + accentChannel * 0.35)
          .toString(16)
          .padStart(2, '0')
      })
      return [shade, `#${tinted.join('')}`]
    }),
  )
