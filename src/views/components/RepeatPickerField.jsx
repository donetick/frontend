import { Close, Repeat } from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Input,
  List,
  ListItem,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { getRecurrentChipText } from '../../utils/ChoreCardHelpers'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'

const FREQUENCY_TYPES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'adaptive',
  'custom',
]
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const OCCURRENCE_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
]

const defaultMetadata = () => ({
  unit: 'days',
  time: moment(moment(new Date()).format('YYYY-MM-DD') + 'T18:00').format(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

const initLocalState = value => {
  if (!value) {
    return {
      frequencyType: 'daily',
      frequency: 1,
      frequencyMetadata: defaultMetadata(),
    }
  }

  let { frequencyType, frequency, frequencyMetadata } = value

  // Normalize parser output: interval/1/days → daily, etc.
  if (frequencyType === 'interval' && frequency === 1) {
    const unitTypeMap = {
      days: 'daily',
      weeks: 'weekly',
      months: 'monthly',
      years: 'yearly',
    }
    frequencyType = unitTypeMap[frequencyMetadata?.unit] || frequencyType
  }

  return {
    frequencyType,
    frequency: frequency ?? 1,
    frequencyMetadata: {
      ...defaultMetadata(),
      ...frequencyMetadata,
    },
  }
}

const getDisplayType = frequencyType =>
  REPEAT_ON_TYPE.includes(frequencyType) ? 'custom' : frequencyType

// Shared section label
const SectionLabel = ({ children }) => (
  <Typography
    level='body-xs'
    sx={{
      color: 'text.tertiary',
      mb: 0.75,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}
  >
    {children}
  </Typography>
)

// Shared time-of-day picker
const TimeRow = ({ metadata, onUpdate }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
    <SectionLabel>Time of day</SectionLabel>
    <Input
      type='time'
      size='sm'
      value={moment(metadata?.time).format('HH:mm')}
      onChange={e =>
        onUpdate({
          ...metadata,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          time: moment(
            moment(new Date()).format('YYYY-MM-DD') + 'T' + e.target.value,
          ).format(),
        })
      }
      sx={{ width: 120 }}
    />
  </Box>
)

const pillListSx = {
  '--List-gap': '8px',
  '--ListItem-radius': '20px',
}

// Interval section
const IntervalSection = ({
  frequency,
  frequencyMetadata,
  onFrequencyUpdate,
  onFrequencyMetadataUpdate,
}) => (
  <Box>
    <SectionLabel>Repeat every</SectionLabel>
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
    >
      <Input
        type='number'
        size='sm'
        value={frequency}
        onChange={e =>
          onFrequencyUpdate(Math.max(1, parseInt(e.target.value, 10) || 1))
        }
        sx={{ width: 72 }}
        slotProps={{ input: { min: 1, max: 999 } }}
      />
      <List orientation='horizontal' wrap sx={pillListSx}>
        {['days', 'weeks', 'months', 'years'].map(unit => (
          <ListItem key={unit}>
            <Checkbox
              checked={frequencyMetadata?.unit === unit}
              onClick={() =>
                onFrequencyMetadataUpdate({ ...frequencyMetadata, unit })
              }
              overlay
              disableIcon
              variant='soft'
              label={unit.charAt(0).toUpperCase() + unit.slice(1)}
            />
          </ListItem>
        ))}
      </List>
    </Box>
    <TimeRow
      metadata={frequencyMetadata}
      onUpdate={onFrequencyMetadataUpdate}
    />
  </Box>
)

// Days of week section
const DaysOfWeekSection = ({
  frequencyMetadata,
  onFrequencyMetadataUpdate,
}) => {
  const selectedDays = frequencyMetadata?.days || []
  const weekPattern = frequencyMetadata?.weekPattern || 'every_week'
  const selectedOccurrences = frequencyMetadata?.occurrences || []

  const toggleDay = day => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day]
    onFrequencyMetadataUpdate({ ...frequencyMetadata, days: next })
  }

  const toggleOccurrence = val => {
    const next = selectedOccurrences.includes(val)
      ? selectedOccurrences.filter(v => v !== val)
      : [...selectedOccurrences, val]
    onFrequencyMetadataUpdate({ ...frequencyMetadata, occurrences: next })
  }

  return (
    <Box>
      <SectionLabel>Days</SectionLabel>
      <List orientation='horizontal' wrap sx={pillListSx}>
        {DAYS.map(day => (
          <ListItem key={day}>
            <Checkbox
              checked={selectedDays.includes(day)}
              onClick={() => toggleDay(day)}
              overlay
              disableIcon
              variant='soft'
              label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 2 }}>
        <SectionLabel>Pattern</SectionLabel>
        <RadioGroup
          orientation='horizontal'
          value={weekPattern}
          onChange={e =>
            onFrequencyMetadataUpdate({
              ...frequencyMetadata,
              weekPattern: e.target.value,
              occurrences:
                e.target.value === 'every_week' ? [] : selectedOccurrences,
            })
          }
          sx={{
            padding: '3px',
            borderRadius: '10px',
            bgcolor: 'neutral.softBg',
            '--RadioGroup-gap': '3px',
            '--Radio-actionRadius': '7px',
            display: 'inline-flex',
          }}
        >
          {[
            { value: 'every_week', label: 'Every week' },
            { value: 'week_of_month', label: 'Specific weeks' },
          ].map(opt => (
            <Radio
              key={opt.value}
              value={opt.value}
              color='neutral'
              disableIcon
              label={opt.label}
              variant='plain'
              sx={{ px: 1.5, py: 0.5 }}
              slotProps={{
                action: ({ checked }) => ({
                  sx: checked
                    ? {
                        bgcolor: 'background.surface',
                        boxShadow: 'sm',
                        '&:hover': { bgcolor: 'background.surface' },
                      }
                    : {},
                }),
              }}
            />
          ))}
        </RadioGroup>
      </Box>

      {weekPattern === 'week_of_month' && (
        <Box sx={{ mt: 1.5 }}>
          <SectionLabel>Occurrences</SectionLabel>
          <List orientation='horizontal' wrap sx={pillListSx}>
            {OCCURRENCE_OPTIONS.map(opt => (
              <ListItem key={opt.value}>
                <Checkbox
                  checked={selectedOccurrences.includes(opt.value)}
                  onClick={() => toggleOccurrence(opt.value)}
                  overlay
                  disableIcon
                  variant='soft'
                  label={opt.label}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <TimeRow
        metadata={frequencyMetadata}
        onUpdate={onFrequencyMetadataUpdate}
      />
    </Box>
  )
}

// Day of month section
const DayOfMonthSection = ({
  frequency,
  frequencyMetadata,
  onFrequencyUpdate,
  onFrequencyMetadataUpdate,
}) => {
  const selectedMonths = frequencyMetadata?.months || []

  const toggleMonth = month => {
    const next = selectedMonths.includes(month)
      ? selectedMonths.filter(m => m !== month)
      : [...selectedMonths, month]
    onFrequencyMetadataUpdate({ ...frequencyMetadata, months: next })
  }

  return (
    <Box>
      <SectionLabel>Months</SectionLabel>
      <List orientation='horizontal' wrap sx={pillListSx}>
        {MONTHS.map(month => (
          <ListItem key={month}>
            <Checkbox
              checked={selectedMonths.includes(month)}
              onClick={() => toggleMonth(month)}
              overlay
              disableIcon
              variant='soft'
              label={month.charAt(0).toUpperCase() + month.slice(1, 3)}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
        <SectionLabel>Day of month</SectionLabel>
        <Input
          type='number'
          size='sm'
          value={frequency}
          onChange={e => {
            const v = Math.min(
              31,
              Math.max(1, parseInt(e.target.value, 10) || 1),
            )
            onFrequencyUpdate(v)
          }}
          sx={{ width: 72 }}
          slotProps={{ input: { min: 1, max: 31 } }}
        />
      </Box>

      <TimeRow
        metadata={frequencyMetadata}
        onUpdate={onFrequencyMetadataUpdate}
      />
    </Box>
  )
}

const RepeatPickerField = ({
  value,
  onChange,
  onClear,
  emptyDisplay = 'icon-text',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localFrequencyType, setLocalFrequencyType] = useState('daily')
  const [localFrequency, setLocalFrequency] = useState(1)
  const [localFrequencyMetadata, setLocalFrequencyMetadata] =
    useState(defaultMetadata)
  const { ResponsiveModal } = useResponsiveModal()

  useEffect(() => {
    if (!isOpen) return
    const init = initLocalState(value)
    setLocalFrequencyType(init.frequencyType)
    setLocalFrequency(init.frequency)
    setLocalFrequencyMetadata(init.frequencyMetadata)
  }, [isOpen, value])

  const hasRepeat = Boolean(value)
  const shouldShowLabel = hasRepeat || emptyDisplay === 'icon-text'
  const displayLabel = hasRepeat ? getRecurrentChipText(value) : 'Repeat'
  const displayType = getDisplayType(localFrequencyType)

  const handleTypeSelect = type => {
    if (type === 'custom') {
      setLocalFrequencyType('interval')
      setLocalFrequency(1)
      setLocalFrequencyMetadata({ ...defaultMetadata(), unit: 'days' })
    } else {
      setLocalFrequencyType(type)
      setLocalFrequency(1)
    }
  }

  const handleSubTypeSelect = newType => {
    setLocalFrequencyType(newType)
    if (newType === 'interval') {
      setLocalFrequency(1)
      setLocalFrequencyMetadata(prev => ({ ...prev, unit: 'days' }))
    } else if (newType === 'days_of_the_week') {
      setLocalFrequencyMetadata(prev => ({
        ...prev,
        days: [],
        weekPattern: 'every_week',
        occurrences: [],
      }))
    } else if (newType === 'day_of_the_month') {
      setLocalFrequency(1)
      setLocalFrequencyMetadata(prev => ({ ...prev, months: [] }))
    }
  }

  const handleSave = () => {
    onChange({
      frequencyType: localFrequencyType,
      frequency: localFrequency,
      frequencyMetadata: localFrequencyMetadata,
    })
    setIsOpen(false)
  }

  return (
    <>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Button
          size={size}
          variant={hasRepeat ? 'soft' : 'outlined'}
          color='neutral'
          onClick={() => setIsOpen(true)}
          sx={{
            minHeight: 40,
            borderRadius: '128px',
            minWidth: 'min-content',
            px: shouldShowLabel ? 1.25 : 0.75,
            gap: shouldShowLabel ? 1 : 0,
            justifyContent: 'flex-start',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s ease-in-out',
          }}
        >
          <Repeat sx={{ fontSize: '20px' }} />
          <Typography
            level='body-sm'
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: shouldShowLabel ? 220 : 0,
              opacity: shouldShowLabel ? 1 : 0,
              transform: shouldShowLabel ? 'translateX(0)' : 'translateX(-4px)',
              transition:
                'max-width 0.25s ease-in-out, opacity 0.2s ease-in-out, transform 0.25s ease-in-out',
            }}
          >
            {displayLabel}
          </Typography>
        </Button>

        {hasRepeat && onClear && (
          <IconButton
            size='sm'
            variant='soft'
            color='danger'
            onClick={e => {
              e.stopPropagation()
              onClear?.()
            }}
            sx={{
              position: 'absolute',
              top: -12,
              right: -16,
              zIndex: 10,
              maxHeight: 18,
              maxWidth: 18,
              borderRadius: '50%',
              '&:hover': { bgcolor: 'danger.softBg' },
            }}
          >
            <Close sx={{ fontSize: '18px' }} />
          </IconButton>
        )}
      </Box>

      <ResponsiveModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title='Repeat Schedule'
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {hasRepeat && (
              <Button
                variant='plain'
                color='danger'
                size='lg'
                onClick={() => {
                  onClear?.()
                  setIsOpen(false)
                }}
                sx={{ mr: 'auto' }}
              >
                Remove
              </Button>
            )}
            <Button
              variant='outlined'
              color='neutral'
              size='lg'
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              size='lg'
              onClick={handleSave}
            >
              Apply
            </Button>
          </Box>
        }
      >
        {/* Frequency type selector */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <SectionLabel>Frequency</SectionLabel>
            <List orientation='horizontal' wrap sx={pillListSx}>
              {FREQUENCY_TYPES.map(type => (
                <ListItem key={type}>
                  <Checkbox
                    checked={displayType === type}
                    onClick={() => handleTypeSelect(type)}
                    overlay
                    disableIcon
                    variant='soft'
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Custom sub-type + detail panel */}
          {displayType === 'custom' && (
            <>
              <Box>
                <SectionLabel>Schedule type</SectionLabel>
                <RadioGroup
                  orientation='horizontal'
                  value={localFrequencyType}
                  onChange={e => handleSubTypeSelect(e.target.value)}
                  sx={{
                    padding: '3px',
                    borderRadius: '10px',
                    bgcolor: 'neutral.softBg',
                    '--RadioGroup-gap': '3px',
                    '--Radio-actionRadius': '7px',
                    display: 'inline-flex',
                  }}
                >
                  {REPEAT_ON_TYPE.map(type => (
                    <Radio
                      key={type}
                      value={type}
                      color='neutral'
                      disableIcon
                      label={type
                        .split('_')
                        .map((w, i, arr) =>
                          i === 0 || i === arr.length - 1
                            ? w.charAt(0).toUpperCase() + w.slice(1)
                            : w,
                        )
                        .join(' ')}
                      variant='plain'
                      sx={{ px: 1.5, py: 0.5 }}
                      slotProps={{
                        action: ({ checked }) => ({
                          sx: checked
                            ? {
                                bgcolor: 'background.surface',
                                boxShadow: 'sm',
                                '&:hover': { bgcolor: 'background.surface' },
                              }
                            : {},
                        }),
                      }}
                    />
                  ))}
                </RadioGroup>
              </Box>

              <Divider />

              {localFrequencyType === 'interval' && (
                <IntervalSection
                  frequency={localFrequency}
                  frequencyMetadata={localFrequencyMetadata}
                  onFrequencyUpdate={setLocalFrequency}
                  onFrequencyMetadataUpdate={setLocalFrequencyMetadata}
                />
              )}
              {localFrequencyType === 'days_of_the_week' && (
                <DaysOfWeekSection
                  frequencyMetadata={localFrequencyMetadata}
                  onFrequencyMetadataUpdate={setLocalFrequencyMetadata}
                />
              )}
              {localFrequencyType === 'day_of_the_month' && (
                <DayOfMonthSection
                  frequency={localFrequency}
                  frequencyMetadata={localFrequencyMetadata}
                  onFrequencyUpdate={setLocalFrequency}
                  onFrequencyMetadataUpdate={setLocalFrequencyMetadata}
                />
              )}
            </>
          )}
        </Box>
      </ResponsiveModal>
    </>
  )
}

export default RepeatPickerField
