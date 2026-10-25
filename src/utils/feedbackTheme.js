// Only installed for custom skins. Keep explicit solid/plain feedback variants
// intact; soften large status surfaces without losing their semantic icon color.
const isSubtle = ownerState =>
  ownerState.variant === 'soft' || ownerState.variant === 'outlined'

export const feedbackSurfaceStyles = ({ ownerState, theme }) =>
  isSubtle(ownerState)
    ? {
        backgroundColor: theme.vars.palette.background.surface,
        color: theme.vars.palette.text.primary,
        borderColor: theme.vars.palette.divider,
      }
    : {}

export const feedbackDecoratorStyles = ({ ownerState, theme }) =>
  isSubtle(ownerState)
    ? { color: theme.vars.palette[ownerState.color].plainColor }
    : {}
