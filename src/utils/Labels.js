// Underscore-prefixed labels are reserved for system/filter conditions.
export const isSystemLabel = label => label?.name?.startsWith('_') === true

export const visibleLabels = labels =>
  (labels || []).filter(label => !isSystemLabel(label))
