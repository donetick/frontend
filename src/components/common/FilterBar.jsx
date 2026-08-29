import { Check, FilterList, Tune } from '@mui/icons-material'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Input,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from './AppModal'
import ActiveFilterChips from './filter/ActiveFilterChips'
import ModalActions from './ModalActions'

/**
 * Reusable filter bar component.
 *
 * Props:
 *   filterDefs   - array of filter definitions:
 *                  { id, label, type ('multi-select'|'single-select'|'boolean'|'date-range'),
 *                    icon, options?, defaultValue?, filterFn }
 *                  options item: { value, label, color?, icon?, avatar? }
 *                  defaultValue: if the active value equals this, no chip is shown
 *                  date-range value shape: { preset?, from?: ISO string, to?: ISO string }
 *   activeFilters - current filter state object { [id]: value }
 *   onSetFilter  - (filterId, value | null) => void
 *   onClearAll   - () => void
 *   resultCount  - optional number shown in "Show N results" button
 *   totalCount   - optional total for "N of M" label
 */

// ── Date range presets (no moment dependency — pure Date) ────────────────────

const d = (date, h = 0, m = 0, s = 0, ms = 0) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, s, ms)

const DATE_RANGE_PRESETS = [
  {
    value: 'today',
    labelKey: 'filterBar.presetToday',
    getRange: () => {
      const t = d(new Date())
      return {
        from: t.toISOString(),
        to: d(new Date(), 23, 59, 59, 999).toISOString(),
      }
    },
  },
  {
    value: 'yesterday',
    labelKey: 'filterBar.presetYesterday',
    getRange: () => {
      const t = d(new Date())
      const y = new Date(t)
      y.setDate(t.getDate() - 1)
      return {
        from: d(y).toISOString(),
        to: d(y, 23, 59, 59, 999).toISOString(),
      }
    },
  },
  {
    value: 'this-week',
    labelKey: 'filterBar.presetThisWeek',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t)
      start.setDate(t.getDate() - t.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return {
        from: d(start).toISOString(),
        to: d(end, 23, 59, 59, 999).toISOString(),
      }
    },
  },
  {
    value: 'last-7-days',
    labelKey: 'filterBar.presetLast7Days',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t)
      start.setDate(t.getDate() - 6)
      return {
        from: d(start).toISOString(),
        to: d(new Date(), 23, 59, 59, 999).toISOString(),
      }
    },
  },
  {
    value: 'this-month',
    labelKey: 'filterBar.presetThisMonth',
    getRange: () => {
      const n = new Date()
      const start = new Date(n.getFullYear(), n.getMonth(), 1)
      const end = new Date(n.getFullYear(), n.getMonth() + 1, 0)
      return {
        from: start.toISOString(),
        to: d(end, 23, 59, 59, 999).toISOString(),
      }
    },
  },
  {
    value: 'last-30-days',
    labelKey: 'filterBar.presetLast30Days',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t)
      start.setDate(t.getDate() - 29)
      return {
        from: d(start).toISOString(),
        to: d(new Date(), 23, 59, 59, 999).toISOString(),
      }
    },
  },
  {
    value: 'last-3-months',
    labelKey: 'filterBar.presetLast3Months',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t)
      start.setMonth(t.getMonth() - 3)
      return {
        from: d(start).toISOString(),
        to: d(new Date(), 23, 59, 59, 999).toISOString(),
      }
    },
  },
]

const toInputDate = iso => (iso ? iso.split('T')[0] : '')

const fmtDisplayDate = iso => {
  if (!iso) return null
  const dt = new Date(iso)
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Component ────────────────────────────────────────────────────────────────

const FilterBar = ({
  activeFilters,
  filterDefs,
  onClearAll,
  onOpenChange,
  onSetFilter,
  open,
  // When the host renders its own trigger (e.g. an icon button in a toolbar
  // row), it drives the sheet through `open`/`onOpenChange` and hides ours.
  resultCount,
  showTrigger = true,
  totalCount,
}) => {
  const { t } = useTranslation('common')
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = next => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  // ── Active count ───────────────────────────────────────────────────────────

  const activeFilterCount = filterDefs.filter(def => {
    const value = activeFilters[def.id]
    if (value === undefined || value === null) return false
    if (def.defaultValue !== undefined && value === def.defaultValue)
      return false
    if (Array.isArray(value) && value.length === 0) return false
    if (def.type === 'date-range') return !!(value?.from || value?.to)
    return true
  }).length

  const hasActive = activeFilterCount > 0

  const selectableChipSx = {
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    alignItems: 'center',
    '& .MuiChip-startDecorator': {
      display: 'flex',
      alignItems: 'center',
      mr: 0.5,
    },
    '& .MuiChip-label': {
      lineHeight: 1.2,
    },
    '&:hover': { opacity: 0.85 },
  }

  const sectionBadgeChipSx = {
    ml: 'auto',
    fontSize: '0.7rem',
    minHeight: 22,
    py: 0.25,
    px: 0.75,
    alignItems: 'center',
    '& .MuiChip-label': {
      lineHeight: 1.2,
      px: 0,
    },
  }

  const modalCountChipSx = {
    ml: 0.5,
    minHeight: 22,
    py: 0.25,
    px: 0.75,
    alignItems: 'center',
    '& .MuiChip-label': {
      lineHeight: 1.2,
      px: 0,
    },
  }

  // ── Chip labels for inline bar ─────────────────────────────────────────────

  const getActiveChipLabel = def => {
    const value = activeFilters[def.id]
    if (value === undefined || value === null) return null

    if (def.type === 'single-select') {
      if (def.defaultValue !== undefined && value === def.defaultValue)
        return null
      return def.options?.find(o => o.value === value)?.label ?? def.label
    }

    if (def.type === 'boolean') return def.label

    if (
      def.type === 'multi-select' &&
      Array.isArray(value) &&
      value.length > 0
    ) {
      if (value.length === 1) {
        return def.options?.find(o => o.value === value[0])?.label ?? def.label
      }
      return `${def.label} (${value.length})`
    }

    if (def.type === 'date-range') {
      if (!value?.from && !value?.to) return null
      if (value.preset) {
        const presetLabelKey = DATE_RANGE_PRESETS.find(
          p => p.value === value.preset,
        )?.labelKey
        return presetLabelKey
          ? t(presetLabelKey)
          : t('filterBar.dateRangeFallback')
      }
      const from = fmtDisplayDate(value.from)
      const to = fmtDisplayDate(value.to)
      if (from && to) return `${from} – ${to}`
      if (from) return t('filterBar.fromDate', { date: from })
      if (to) return t('filterBar.untilDate', { date: to })
      return null
    }

    return null
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleMultiToggle = (defId, optValue) => {
    const current = activeFilters[defId] || []
    const next = current.includes(optValue)
      ? current.filter(v => v !== optValue)
      : [...current, optValue]
    onSetFilter(defId, next.length > 0 ? next : null)
  }

  const handleSingleToggle = (defId, optValue) => {
    onSetFilter(defId, activeFilters[defId] === optValue ? null : optValue)
  }

  const handleBoolToggle = defId => {
    onSetFilter(defId, activeFilters[defId] ? null : true)
  }

  const handleDateRangePreset = (defId, presetValue) => {
    const current = activeFilters[defId] || {}
    if (current.preset === presetValue) {
      onSetFilter(defId, null)
      return
    }
    const preset = DATE_RANGE_PRESETS.find(p => p.value === presetValue)
    onSetFilter(defId, { preset: presetValue, ...preset.getRange() })
  }

  const handleDateRangeInput = (defId, field, dateStr) => {
    const current = activeFilters[defId] || {}
    if (!dateStr) {
      const next = { ...current, preset: null, [field]: null }
      onSetFilter(defId, next.from || next.to ? next : null)
    } else {
      const iso =
        field === 'to'
          ? new Date(dateStr + 'T23:59:59').toISOString()
          : new Date(dateStr + 'T00:00:00').toISOString()
      onSetFilter(defId, { ...current, preset: null, [field]: iso })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeChips = filterDefs
    .map(def => ({ def, label: getActiveChipLabel(def) }))
    .filter(({ label }) => !!label)
    .map(({ def, label }) => ({
      key: def.id,
      label,
      onClear: () => onSetFilter(def.id, null),
    }))

  // With the trigger hoisted into a toolbar, the inline row has nothing to show
  // until a filter is on — rendering it anyway would leave a phantom gap.
  const showInlineBar = showTrigger || activeChips.length > 0

  return (
    <>
      {/* ── Inline bar ─────────────────────────────────────── */}
      {showInlineBar && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          {showTrigger && (
            <Badge
              badgeContent={activeFilterCount || null}
              color='primary'
              size='sm'
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Button
                size='md'
                variant={hasActive ? 'solid' : 'outlined'}
                color={hasActive ? 'primary' : 'neutral'}
                startDecorator={<FilterList sx={{ fontSize: 16 }} />}
                onClick={() => setIsOpen(true)}
                sx={{
                  borderRadius: 'xl',
                  py: 0.5,
                  px: 1,
                  gap: 0.5,
                  alignItems: 'center',
                  '& .MuiButton-startDecorator': {
                    display: 'flex',
                    alignItems: 'center',
                    mr: 0.5,
                  },
                }}
              >
                {t('filterBar.filtersButton')}
              </Button>
            </Badge>
          )}

          <ActiveFilterChips
            chips={activeChips}
            onOpen={() => setIsOpen(true)}
            onClearAll={hasActive ? onClearAll : undefined}
            resultCount={hasActive ? resultCount : undefined}
            totalCount={hasActive ? totalCount : undefined}
            maxVisible={2}
            chipSize='md'
          />
        </Box>
      )}

      {/* ── Bottom sheet ────────────────────────────────────── */}
      <AppModal
        open={isOpen}
        isMobile
        onClose={() => setIsOpen(false)}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tune sx={{ fontSize: 20 }} />
            {t('filterBar.filtersButton')}
            {hasActive && (
              <Chip
                size='sm'
                variant='solid'
                color='primary'
                sx={modalCountChipSx}
              >
                {activeFilterCount}
              </Chip>
            )}
          </Box>
        }
        footer={
          <ModalActions
            tertiary={{
              label: t('filterBar.clearAllButton'),
              color: 'danger',
              disabled: !hasActive,
              onClick: onClearAll,
            }}
            primary={{
              label:
                resultCount !== undefined
                  ? t('filterBar.showResults', { count: resultCount })
                  : t('filterBar.doneButton'),
              onClick: () => setIsOpen(false),
            }}
          />
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filterDefs.map((def, idx) => (
            <Box key={def.id}>
              {idx > 0 && <Divider sx={{ my: 2.5 }} />}

              {/* Section header */}
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
              >
                {def.icon && (
                  <Box
                    sx={{
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      '& svg': { fontSize: 18 },
                    }}
                  >
                    {def.icon}
                  </Box>
                )}
                <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                  {def.label}
                </Typography>

                {/* active badge in header */}
                {def.type === 'multi-select' &&
                  (activeFilters[def.id]?.length ?? 0) > 0 && (
                    <Chip
                      size='sm'
                      variant='solid'
                      color='primary'
                      sx={sectionBadgeChipSx}
                    >
                      {t('filterBar.selectedCount', {
                        count: activeFilters[def.id].length,
                      })}
                    </Chip>
                  )}
                {def.type === 'single-select' &&
                  activeFilters[def.id] != null &&
                  (() => {
                    const opt = def.options?.find(
                      o => o.value === activeFilters[def.id],
                    )
                    return opt ? (
                      <Chip
                        size='sm'
                        variant='solid'
                        color='primary'
                        sx={sectionBadgeChipSx}
                      >
                        {opt.label}
                      </Chip>
                    ) : null
                  })()}
                {def.type === 'date-range' && getActiveChipLabel(def) && (
                  <Chip
                    size='sm'
                    variant='solid'
                    color='primary'
                    sx={sectionBadgeChipSx}
                  >
                    {getActiveChipLabel(def)}
                  </Chip>
                )}
              </Box>

              {/* multi-select */}
              {def.type === 'multi-select' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {def.options?.map(opt => {
                    const isSelected = (activeFilters[def.id] || []).includes(
                      opt.value,
                    )
                    return (
                      <Chip
                        key={opt.value}
                        variant={isSelected ? 'solid' : 'soft'}
                        color={
                          isSelected ? (opt.color ?? 'primary') : 'neutral'
                        }
                        startDecorator={
                          opt.avatar ? (
                            <Avatar
                              src={opt.avatar}
                              alt={opt.label}
                              sx={{ '--Avatar-size': '20px' }}
                            />
                          ) : isSelected ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : (
                            (opt.icon ?? null)
                          )
                        }
                        onClick={() => handleMultiToggle(def.id, opt.value)}
                        sx={selectableChipSx}
                      >
                        {opt.label}
                      </Chip>
                    )
                  })}
                </Box>
              )}

              {/* single-select */}
              {def.type === 'single-select' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {def.options?.map(opt => {
                    const isSelected = activeFilters[def.id] === opt.value
                    return (
                      <Chip
                        key={opt.value}
                        variant={isSelected ? 'solid' : 'soft'}
                        color={
                          isSelected ? (opt.color ?? 'primary') : 'neutral'
                        }
                        startDecorator={
                          opt.avatar ? (
                            <Avatar
                              src={opt.avatar}
                              alt={opt.label}
                              sx={{ '--Avatar-size': '20px' }}
                            />
                          ) : isSelected ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : (
                            (opt.icon ?? null)
                          )
                        }
                        onClick={() => handleSingleToggle(def.id, opt.value)}
                        sx={selectableChipSx}
                      >
                        {opt.label}
                      </Chip>
                    )
                  })}
                </Box>
              )}

              {/* boolean */}
              {def.type === 'boolean' && (
                <Chip
                  variant={activeFilters[def.id] ? 'solid' : 'soft'}
                  color={activeFilters[def.id] ? 'primary' : 'neutral'}
                  startDecorator={
                    activeFilters[def.id] ? (
                      <Check sx={{ fontSize: 14 }} />
                    ) : null
                  }
                  onClick={() => handleBoolToggle(def.id)}
                  sx={selectableChipSx}
                >
                  {def.label}
                </Chip>
              )}

              {/* date-range */}
              {def.type === 'date-range' &&
                (() => {
                  const val = activeFilters[def.id] || {}
                  return (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                      }}
                    >
                      {/* Preset chips */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {DATE_RANGE_PRESETS.map(preset => {
                          const isSelected = val.preset === preset.value
                          return (
                            <Chip
                              key={preset.value}
                              variant={isSelected ? 'solid' : 'soft'}
                              color={isSelected ? 'primary' : 'neutral'}
                              startDecorator={
                                isSelected ? (
                                  <Check sx={{ fontSize: 14 }} />
                                ) : null
                              }
                              onClick={() =>
                                handleDateRangePreset(def.id, preset.value)
                              }
                              sx={selectableChipSx}
                            >
                              {t(preset.labelKey)}
                            </Chip>
                          )
                        })}
                      </Box>

                      {/* Custom date inputs */}
                      <Box
                        sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                      >
                        <Input
                          type='date'
                          size='sm'
                          value={toInputDate(val.from)}
                          onChange={e =>
                            handleDateRangeInput(def.id, 'from', e.target.value)
                          }
                          slotProps={{
                            input: { max: toInputDate(val.to) || undefined },
                          }}
                          sx={{ flex: 1, fontSize: '0.8rem' }}
                        />
                        <Typography
                          level='body-xs'
                          sx={{ color: 'text.tertiary', flexShrink: 0 }}
                        >
                          –
                        </Typography>
                        <Input
                          type='date'
                          size='sm'
                          value={toInputDate(val.to)}
                          onChange={e =>
                            handleDateRangeInput(def.id, 'to', e.target.value)
                          }
                          slotProps={{
                            input: { min: toInputDate(val.from) || undefined },
                          }}
                          sx={{ flex: 1, fontSize: '0.8rem' }}
                        />
                      </Box>
                    </Box>
                  )
                })()}
            </Box>
          ))}
        </Box>
      </AppModal>
    </>
  )
}

export default FilterBar
