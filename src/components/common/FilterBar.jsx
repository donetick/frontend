import { Check, Close, FilterList, Tune } from '@mui/icons-material'
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
import BottomSheetModal from './BottomSheetModal'

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
    label: 'Today',
    getRange: () => {
      const t = d(new Date())
      return { from: t.toISOString(), to: d(new Date(), 23, 59, 59, 999).toISOString() }
    },
  },
  {
    value: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const t = d(new Date())
      const y = new Date(t); y.setDate(t.getDate() - 1)
      return { from: d(y).toISOString(), to: d(y, 23, 59, 59, 999).toISOString() }
    },
  },
  {
    value: 'this-week',
    label: 'This Week',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t); start.setDate(t.getDate() - t.getDay())
      const end = new Date(start); end.setDate(start.getDate() + 6)
      return { from: d(start).toISOString(), to: d(end, 23, 59, 59, 999).toISOString() }
    },
  },
  {
    value: 'last-7-days',
    label: 'Last 7 Days',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t); start.setDate(t.getDate() - 6)
      return { from: d(start).toISOString(), to: d(new Date(), 23, 59, 59, 999).toISOString() }
    },
  },
  {
    value: 'this-month',
    label: 'This Month',
    getRange: () => {
      const n = new Date()
      const start = new Date(n.getFullYear(), n.getMonth(), 1)
      const end = new Date(n.getFullYear(), n.getMonth() + 1, 0)
      return { from: start.toISOString(), to: d(end, 23, 59, 59, 999).toISOString() }
    },
  },
  {
    value: 'last-30-days',
    label: 'Last 30 Days',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t); start.setDate(t.getDate() - 29)
      return { from: d(start).toISOString(), to: d(new Date(), 23, 59, 59, 999).toISOString() }
    },
  },
  {
    value: 'last-3-months',
    label: 'Last 3 Months',
    getRange: () => {
      const t = d(new Date())
      const start = new Date(t); start.setMonth(t.getMonth() - 3)
      return { from: d(start).toISOString(), to: d(new Date(), 23, 59, 59, 999).toISOString() }
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
  filterDefs,
  activeFilters,
  onSetFilter,
  onClearAll,
  resultCount,
  totalCount,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  // ── Active count ───────────────────────────────────────────────────────────

  const activeFilterCount = filterDefs.filter(def => {
    const value = activeFilters[def.id]
    if (value === undefined || value === null) return false
    if (def.defaultValue !== undefined && value === def.defaultValue) return false
    if (Array.isArray(value) && value.length === 0) return false
    if (def.type === 'date-range') return !!(value?.from || value?.to)
    return true
  }).length

  const hasActive = activeFilterCount > 0

  // ── Chip labels for inline bar ─────────────────────────────────────────────

  const getActiveChipLabel = def => {
    const value = activeFilters[def.id]
    if (value === undefined || value === null) return null

    if (def.type === 'single-select') {
      if (def.defaultValue !== undefined && value === def.defaultValue) return null
      return def.options?.find(o => o.value === value)?.label ?? def.label
    }

    if (def.type === 'boolean') return def.label

    if (def.type === 'multi-select' && Array.isArray(value) && value.length > 0) {
      if (value.length === 1) {
        return def.options?.find(o => o.value === value[0])?.label ?? def.label
      }
      return `${def.label} (${value.length})`
    }

    if (def.type === 'date-range') {
      if (!value?.from && !value?.to) return null
      if (value.preset) {
        return DATE_RANGE_PRESETS.find(p => p.value === value.preset)?.label ?? 'Date Range'
      }
      const from = fmtDisplayDate(value.from)
      const to = fmtDisplayDate(value.to)
      if (from && to) return `${from} – ${to}`
      if (from) return `From ${from}`
      if (to) return `Until ${to}`
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

  return (
    <>
      {/* ── Inline bar ─────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Badge
          badgeContent={activeFilterCount || null}
          color='primary'
          size='sm'
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Button
            size='sm'
            variant={hasActive ? 'solid' : 'outlined'}
            color={hasActive ? 'primary' : 'neutral'}
            startDecorator={<FilterList sx={{ fontSize: 16 }} />}
            onClick={() => setIsOpen(true)}
            sx={{ borderRadius: 'xl', gap: 0.5 }}
          >
            Filters
          </Button>
        </Badge>

        {(() => {
          const activeChips = filterDefs
            .map(def => ({ def, label: getActiveChipLabel(def) }))
            .filter(({ label }) => !!label)
          const MAX_VISIBLE = 2
          const visible = activeChips.slice(0, MAX_VISIBLE)
          const overflow = activeChips.length - MAX_VISIBLE

          return (
            <>
              {visible.map(({ def, label }) => (
                <Chip
                  key={def.id}
                  size='md'
                  variant='soft'
                  color='primary'
                  endDecorator={
                    <Close
                      sx={{ cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation()
                        onSetFilter(def.id, null)
                      }}
                    />
                  }
                  onClick={() => setIsOpen(true)}
                  sx={{ 
                    py: 0.64,
                    cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { opacity: 0.85 } }}
                >
                  {label}
                </Chip>
              ))}

              {overflow > 0 && (
                <Chip
                  size='md'
                  variant='soft'
                  color='neutral'
                  onClick={() => setIsOpen(true)}
                  sx={{ py: 0.64, cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { opacity: 0.85 } }}
                >
                  +{overflow} more
                </Chip>
              )}
            </>
          )
        })()}

        {hasActive && (
          <Button
            size='sm'
            variant='plain'
            color='neutral'
            sx={{ px: 0.5, fontSize: '0.75rem', color: 'text.secondary', minHeight: 0 }}
            onClick={onClearAll}
          >
            Clear all
          </Button>
        )}

        {hasActive && resultCount !== undefined && totalCount !== undefined && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 'auto', flexShrink: 0 }}>
            {resultCount} / {totalCount}
          </Typography>
        )}
      </Box>

      {/* ── Bottom sheet ────────────────────────────────────── */}
      <BottomSheetModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tune sx={{ fontSize: 20 }} />
            Filters
            {hasActive && (
              <Chip size='sm' variant='solid' color='primary' sx={{ ml: 0.5 }}>
                {activeFilterCount}
              </Chip>
            )}
          </Box>
        }
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Button
              variant='plain'
              color='danger'
              size='sm'
              disabled={!hasActive}
              onClick={onClearAll}
            >
              Clear all
            </Button>
            <Button onClick={() => setIsOpen(false)} sx={{ minWidth: 140 }}>
              {resultCount !== undefined
                ? `Show ${resultCount} result${resultCount !== 1 ? 's' : ''}`
                : 'Done'}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filterDefs.map((def, idx) => (
            <Box key={def.id}>
              {idx > 0 && <Divider sx={{ my: 2.5 }} />}

              {/* Section header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                {def.icon && (
                  <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', '& svg': { fontSize: 18 } }}>
                    {def.icon}
                  </Box>
                )}
                <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                  {def.label}
                </Typography>

                {/* active badge in header */}
                {def.type === 'multi-select' && (activeFilters[def.id]?.length ?? 0) > 0 && (
                  <Chip size='sm' variant='solid' color='primary' sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}>
                    {activeFilters[def.id].length} selected
                  </Chip>
                )}
                {def.type === 'single-select' && activeFilters[def.id] != null && (() => {
                  const opt = def.options?.find(o => o.value === activeFilters[def.id])
                  return opt ? (
                    <Chip size='sm' variant='solid' color='primary' sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}>
                      {opt.label}
                    </Chip>
                  ) : null
                })()}
                {def.type === 'date-range' && getActiveChipLabel(def) && (
                  <Chip size='sm' variant='solid' color='primary' sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}>
                    {getActiveChipLabel(def)}
                  </Chip>
                )}
              </Box>

              {/* multi-select */}
              {def.type === 'multi-select' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {def.options?.map(opt => {
                    const isSelected = (activeFilters[def.id] || []).includes(opt.value)
                    return (
                      <Chip
                        key={opt.value}
                        variant={isSelected ? 'solid' : 'soft'}
                        color={isSelected ? (opt.color ?? 'primary') : 'neutral'}
                        startDecorator={
                          opt.avatar ? (
                            <Avatar src={opt.avatar} alt={opt.label} sx={{ '--Avatar-size': '20px' }} />
                          ) : isSelected ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : (opt.icon ?? null)
                        }
                        onClick={() => handleMultiToggle(def.id, opt.value)}
                        sx={{ cursor: 'pointer', transition: 'all 0.15s ease', userSelect: 'none', '&:hover': { opacity: 0.85 } }}
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
                        color={isSelected ? (opt.color ?? 'primary') : 'neutral'}
                        startDecorator={
                          opt.avatar ? (
                            <Avatar src={opt.avatar} alt={opt.label} sx={{ '--Avatar-size': '20px' }} />
                          ) : isSelected ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : (opt.icon ?? null)
                        }
                        onClick={() => handleSingleToggle(def.id, opt.value)}
                        sx={{ cursor: 'pointer', transition: 'all 0.15s ease', userSelect: 'none', '&:hover': { opacity: 0.85 } }}
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
                  startDecorator={activeFilters[def.id] ? <Check sx={{ fontSize: 14 }} /> : null}
                  onClick={() => handleBoolToggle(def.id)}
                  sx={{ cursor: 'pointer', transition: 'all 0.15s ease', userSelect: 'none', '&:hover': { opacity: 0.85 } }}
                >
                  {def.label}
                </Chip>
              )}

              {/* date-range */}
              {def.type === 'date-range' && (() => {
                const val = activeFilters[def.id] || {}
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Preset chips */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {DATE_RANGE_PRESETS.map(preset => {
                        const isSelected = val.preset === preset.value
                        return (
                          <Chip
                            key={preset.value}
                            variant={isSelected ? 'solid' : 'soft'}
                            color={isSelected ? 'primary' : 'neutral'}
                            startDecorator={isSelected ? <Check sx={{ fontSize: 14 }} /> : null}
                            onClick={() => handleDateRangePreset(def.id, preset.value)}
                            sx={{ cursor: 'pointer', transition: 'all 0.15s ease', userSelect: 'none', '&:hover': { opacity: 0.85 } }}
                          >
                            {preset.label}
                          </Chip>
                        )
                      })}
                    </Box>

                    {/* Custom date inputs */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Input
                        type='date'
                        size='sm'
                        value={toInputDate(val.from)}
                        onChange={e => handleDateRangeInput(def.id, 'from', e.target.value)}
                        slotProps={{ input: { max: toInputDate(val.to) || undefined } }}
                        sx={{ flex: 1, fontSize: '0.8rem' }}
                      />
                      <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
                        –
                      </Typography>
                      <Input
                        type='date'
                        size='sm'
                        value={toInputDate(val.to)}
                        onChange={e => handleDateRangeInput(def.id, 'to', e.target.value)}
                        slotProps={{ input: { min: toInputDate(val.from) || undefined } }}
                        sx={{ flex: 1, fontSize: '0.8rem' }}
                      />
                    </Box>
                  </Box>
                )
              })()}
            </Box>
          ))}
        </Box>
      </BottomSheetModal>
    </>
  )
}

export default FilterBar
