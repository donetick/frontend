import resolveConfig from 'tailwindcss/resolveConfig'

import tailwindConfig from '/tailwind.config.mjs'

export const { theme: THEME } = resolveConfig(tailwindConfig)

export const COLORS = THEME.colors
