import {
  Box,
  Card,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  Grid,
  Input,
  List,
  ListItem,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect } from 'react'

import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { isPlusAccount } from '../../utils/Helpers'
import ThingTriggerSection from './ThingTriggerSection'

// FREQUENCY_TYPES are the RRULE FREQ values selectable in the UI. `adaptive` is a
// Donetick-specific dynamic schedule; the rest map directly onto the backend.
const FREQUENCY_TYPES = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'adaptive',
]

// Singular unit label per frequency, used for the "Every N …" control.
const UNIT_LABEL = {
  hourly: 'hour',
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

const FREQUENCY_TYPE_MESSAGE = {
  adaptive:
    'This chore will be scheduled dynamically based on previous completion dates.',
}

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

// Ordinal positions for an "On the …" rule. Maps to RRULE BYSETPOS.
const ORDINALS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: 5, label: 'Fifth' },
  { value: -2, label: 'Next to last' },
  { value: -1, label: 'Last' },
]

// Day-token options for an "On the …" rule (beyond specific weekdays).
const DAY_TOKENS = [
  { value: 'day', label: 'Day' },
  { value: 'weekday', label: 'Weekday' },
  { value: 'weekend', label: 'Weekend day' },
]

const ordinalLabel = value => {
  const found = ORDINALS.find(o => o.value === value)
  return found ? found.label.toLowerCase() : `${value}`
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
const shortDay = d => cap(d.slice(0, 3))

// generateSchedulePreview renders a human-readable summary of the recurrence.
const generateSchedulePreview = (
  frequencyType,
  frequency,
  metadata,
  formatTimeFn,
) => {
  const n = Number(frequency) || 1
  const unit = UNIT_LABEL[frequencyType]
  const every = n > 1 ? `every ${n} ${unit}s` : `every ${unit}`
  const timeStr = metadata?.time ? formatTimeFn(metadata.time) : '6:00 PM'

  if (frequencyType === 'hourly') {
    return n > 1 ? `Every ${n} hours` : 'Every hour'
  }
  if (frequencyType === 'daily') {
    return n > 1 ? `Every ${n} days at ${timeStr}` : `Every day at ${timeStr}`
  }
  if (frequencyType === 'weekly') {
    const days = (metadata?.days || []).map(shortDay).join(', ') || '…'
    return `${cap(every)} on ${days} at ${timeStr}`
  }
  if (frequencyType === 'monthly') {
    if (metadata?.monthDays?.length) {
      const days = [...metadata.monthDays].sort((a, b) => a - b).join(', ')
      return `${cap(every)} on day ${days} at ${timeStr}`
    }
    if (metadata?.setPos?.length) {
      return `${cap(every)} on the ${describeOnThe(metadata)} at ${timeStr}`
    }
    return `${cap(every)} at ${timeStr}`
  }
  if (frequencyType === 'yearly') {
    const monthNames = (metadata?.months || []).map(cap).join(', ') || '…'
    if (metadata?.setPos?.length) {
      return `${cap(every)} on the ${describeOnThe(metadata)} of ${monthNames} at ${timeStr}`
    }
    return `${cap(every)} in ${monthNames} at ${timeStr}`
  }
  return ''
}

// describeOnThe renders the ordinal + weekday/token portion of an "On the" rule.
const describeOnThe = metadata => {
  const pos = (metadata?.setPos || []).map(ordinalLabel).join(', ') || '…'
  const token = metadata?.dayToken || 'specific'
  let dayPart = '…'
  if (token === 'specific') {
    dayPart = (metadata?.days || []).map(cap).join(', ') || '…'
  } else if (token === 'day') {
    dayPart = 'day'
  } else if (token === 'weekday') {
    dayPart = 'weekday'
  } else if (token === 'weekend') {
    dayPart = 'weekend day'
  }
  return `${pos} ${dayPart}`
}

// ChipToggle renders a selectable chip used across the selectors.
const ChipToggle = ({ selected, label, onClick }) => (
  <Chip
    variant={selected ? 'solid' : 'soft'}
    color={selected ? 'primary' : 'neutral'}
    onClick={onClick}
    sx={{ mb: 0.5 }}
  >
    {label}
  </Chip>
)

// OnTheSelector is the shared "On the [ordinal] [weekday/token]" control used by
// both monthly and yearly frequencies.
const OnTheSelector = ({ metadata, onUpdate }) => {
  const setPos = metadata?.setPos || []
  const token = metadata?.dayToken || 'specific'
  const days = metadata?.days || []

  const toggleSetPos = value => {
    const next = setPos.includes(value)
      ? setPos.filter(v => v !== value)
      : [...setPos, value]
    onUpdate({ ...metadata, setPos: next })
  }

  const selectToken = value => {
    if (value === 'specific') {
      onUpdate({ ...metadata, dayToken: 'specific' })
    } else {
      // Day/Weekday/Weekend tokens don't use an explicit weekday list.
      onUpdate({ ...metadata, dayToken: value, days: [] })
    }
  }

  const toggleDay = day => {
    const next = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day]
    onUpdate({ ...metadata, dayToken: 'specific', days: next })
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Typography level='body-sm' sx={{ mb: 0.5 }}>
        On the:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        {ORDINALS.map(o => (
          <ChipToggle
            key={o.value}
            selected={setPos.includes(o.value)}
            label={o.label}
            onClick={() => toggleSetPos(o.value)}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {DAYS.map(d => (
          <ChipToggle
            key={d}
            selected={token === 'specific' && days.includes(d)}
            label={shortDay(d)}
            onClick={() => toggleDay(d)}
          />
        ))}
        {DAY_TOKENS.map(t => (
          <ChipToggle
            key={t.value}
            selected={token === t.value}
            label={t.label}
            onClick={() => selectToken(t.value)}
          />
        ))}
      </Box>
    </Box>
  )
}

const RepeatOnSections = ({
  frequencyType,
  frequency,
  onFrequencyUpdate,
  frequencyMetadata,
  onFrequencyMetadataUpdate,
}) => {
  const { fmt } = useLocalization()

  // Ensure a default time-of-day exists for time-bearing frequencies.
  useEffect(() => {
    if (frequencyType !== 'hourly' && !frequencyMetadata?.time) {
      onFrequencyMetadataUpdate({
        ...frequencyMetadata,
        time: moment(
          moment(new Date()).format('YYYY-MM-DD') + 'T' + '18:00',
        ).format(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    }
  }, [frequencyType, frequencyMetadata, onFrequencyMetadataUpdate])

  if (frequencyType === 'adaptive') {
    return null
  }

  const intervalRow = (
    <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography level='h5'>Every</Typography>
      <Input
        slotProps={{ input: { min: 1, max: 1000 } }}
        type='number'
        value={frequency}
        sx={{ width: '90px' }}
        onChange={e => {
          let v = Number(e.target.value)
          if (!v || v < 1) v = 1
          onFrequencyUpdate(v)
        }}
      />
      <Typography level='h5'>
        {UNIT_LABEL[frequencyType]}
        {Number(frequency) > 1 ? 's' : ''}
      </Typography>
    </Grid>
  )

  const timePicker =
    frequencyType === 'hourly' ? null : (
      <Grid item sm={12} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography level='h5'>Time of day:</Typography>
        <Input
          type='time'
          sx={{ width: '150px' }}
          defaultValue={moment(frequencyMetadata?.time).format('HH:mm')}
          onChange={e => {
            onFrequencyMetadataUpdate({
              ...frequencyMetadata,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              time: moment(
                moment(new Date()).format('YYYY-MM-DD') + 'T' + e.target.value,
              ).format(),
            })
          }}
        />
      </Grid>
    )

  const preview = (
    <Grid item sm={12}>
      <Card variant='soft' sx={{ mt: 1, p: 1.5 }}>
        <Typography level='body-sm' color='primary'>
          {generateSchedulePreview(
            frequencyType,
            frequency,
            frequencyMetadata,
            fmt.time,
          )}
        </Typography>
      </Card>
    </Grid>
  )

  // weekly: weekday multi-select
  const weeklySelector =
    frequencyType === 'weekly' ? (
      <Grid item sm={12}>
        <Typography level='body-sm' sx={{ mb: 0.5 }}>
          On these days:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {DAYS.map(day => {
            const selected = frequencyMetadata?.days?.includes(day) || false
            return (
              <ChipToggle
                key={day}
                selected={selected}
                label={cap(day)}
                onClick={() => {
                  const days = frequencyMetadata?.days || []
                  const next = days.includes(day)
                    ? days.filter(d => d !== day)
                    : [...days, day]
                  onFrequencyMetadataUpdate({
                    ...frequencyMetadata,
                    days: next,
                  })
                }}
              />
            )
          })}
        </Box>
      </Grid>
    ) : null

  // monthly: Each (day numbers) vs On the (ordinal weekday)
  const monthlyMode = frequencyMetadata?.setPos?.length ? 'on_the' : 'each'
  const monthlySelector =
    frequencyType === 'monthly' ? (
      <Grid item sm={12}>
        <RadioGroup
          orientation='horizontal'
          value={monthlyMode}
          onChange={e => {
            if (e.target.value === 'each') {
              onFrequencyMetadataUpdate({
                ...frequencyMetadata,
                setPos: [],
                dayToken: undefined,
                days: [],
              })
            } else {
              onFrequencyMetadataUpdate({
                ...frequencyMetadata,
                monthDays: [],
                setPos: frequencyMetadata?.setPos?.length
                  ? frequencyMetadata.setPos
                  : [1],
                dayToken: 'specific',
              })
            }
          }}
          sx={{ mb: 1 }}
        >
          <Radio value='each' label='Each' />
          <Radio value='on_the' label='On the' />
        </RadioGroup>

        {monthlyMode === 'each' ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const selected =
                frequencyMetadata?.monthDays?.includes(day) || false
              return (
                <ChipToggle
                  key={day}
                  selected={selected}
                  label={`${day}`}
                  onClick={() => {
                    const md = frequencyMetadata?.monthDays || []
                    const next = md.includes(day)
                      ? md.filter(d => d !== day)
                      : [...md, day]
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      monthDays: next,
                    })
                  }}
                />
              )
            })}
          </Box>
        ) : (
          <OnTheSelector
            metadata={frequencyMetadata}
            onUpdate={onFrequencyMetadataUpdate}
          />
        )}
      </Grid>
    ) : null

  // yearly: months multi-select + optional On the
  const yearlySelector =
    frequencyType === 'yearly' ? (
      <Grid item sm={12}>
        <Typography level='body-sm' sx={{ mb: 0.5 }}>
          In these months:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {MONTHS.map(month => {
            const selected = frequencyMetadata?.months?.includes(month) || false
            return (
              <ChipToggle
                key={month}
                selected={selected}
                label={cap(month).slice(0, 3)}
                onClick={() => {
                  const months = frequencyMetadata?.months || []
                  const next = months.includes(month)
                    ? months.filter(m => m !== month)
                    : [...months, month]
                  onFrequencyMetadataUpdate({
                    ...frequencyMetadata,
                    months: next,
                  })
                }}
              />
            )
          })}
        </Box>
        <Checkbox
          label='On a specific weekday'
          checked={Boolean(frequencyMetadata?.setPos?.length)}
          onChange={e => {
            if (e.target.checked) {
              onFrequencyMetadataUpdate({
                ...frequencyMetadata,
                setPos: [1],
                dayToken: 'specific',
              })
            } else {
              onFrequencyMetadataUpdate({
                ...frequencyMetadata,
                setPos: [],
                dayToken: undefined,
                days: [],
              })
            }
          }}
        />
        {Boolean(frequencyMetadata?.setPos?.length) && (
          <OnTheSelector
            metadata={frequencyMetadata}
            onUpdate={onFrequencyMetadataUpdate}
          />
        )}
      </Grid>
    ) : null

  return (
    <>
      {intervalRow}
      {weeklySelector}
      {monthlySelector}
      {yearlySelector}
      {timePicker}
      {preview}
    </>
  )
}

// resetMetadataForType returns a clean metadata object when switching frequency,
// preserving only the time-of-day and timezone.
const resetMetadataForType = metadata => ({
  time: metadata?.time,
  timezone: metadata?.timezone,
})

const RepeatSection = ({
  frequencyType,
  frequency,
  onFrequencyUpdate,
  onFrequencyTypeUpdate,
  frequencyMetadata,
  onFrequencyMetadataUpdate,
  frequencyError,
  allUserThings,
  onTriggerUpdate,
  OnTriggerValidate,
  isAttemptToSave,
  selectedThing,
}) => {
  const { data: userProfile } = useUserProfile()
  const isRepeating = !['once', 'trigger'].includes(frequencyType)

  return (
    <Box mt={2}>
      <Typography level='h4'>Repeat:</Typography>
      <FormControl sx={{ mt: 1 }}>
        <Checkbox
          onChange={e => {
            onFrequencyTypeUpdate(e.target.checked ? 'daily' : 'once')
            if (e.target.checked) {
              onTriggerUpdate(null)
            }
          }}
          checked={isRepeating}
          overlay
          label='Repeat this task'
        />
        <FormHelperText>
          Is this something needed to be done regularly?
        </FormHelperText>
      </FormControl>

      {isRepeating && (
        <Card sx={{ mt: 1 }}>
          <Typography level='h5'>How often should it be repeated?</Typography>

          <List
            orientation='horizontal'
            wrap
            sx={{ '--List-gap': '8px', '--ListItem-radius': '20px' }}
          >
            {FREQUENCY_TYPES.map(item => (
              <ListItem key={item}>
                <Checkbox
                  checked={item === frequencyType}
                  onClick={() => {
                    onFrequencyUpdate(1)
                    if (item === 'adaptive') {
                      onFrequencyTypeUpdate(item)
                      return
                    }
                    // Reset selectors when switching frequency.
                    onFrequencyMetadataUpdate(
                      resetMetadataForType(frequencyMetadata),
                    )
                    onFrequencyTypeUpdate(item)
                  }}
                  overlay
                  disableIcon
                  variant='soft'
                  label={cap(item)}
                />
              </ListItem>
            ))}
          </List>
          <Typography>{FREQUENCY_TYPE_MESSAGE[frequencyType]}</Typography>

          <Grid container spacing={1} mt={1}>
            <RepeatOnSections
              frequency={frequency}
              onFrequencyUpdate={onFrequencyUpdate}
              frequencyType={frequencyType}
              onFrequencyMetadataUpdate={onFrequencyMetadataUpdate}
              frequencyMetadata={frequencyMetadata || {}}
            />
          </Grid>

          <FormControl error={Boolean(frequencyError)}>
            <FormHelperText error>{frequencyError}</FormHelperText>
          </FormControl>
        </Card>
      )}

      <FormControl sx={{ mt: 1 }}>
        <Checkbox
          onChange={e => {
            onFrequencyTypeUpdate(e.target.checked ? 'trigger' : 'once')
            if (!e.target.checked) {
              onTriggerUpdate(null)
            }
          }}
          checked={frequencyType === 'trigger'}
          disabled={!isPlusAccount(userProfile)}
          overlay
          label='Trigger this task based on a thing state'
        />
        <FormHelperText sx={{ opacity: !isPlusAccount(userProfile) ? 0.5 : 1 }}>
          Is this something that should be done when a thing state changes?{' '}
          {userProfile && !isPlusAccount(userProfile) && (
            <Chip variant='soft' color='warning'>
              Plus Feature
            </Chip>
          )}
        </FormHelperText>
        {!isPlusAccount(userProfile) && (
          <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
            Thing-based triggers are not available in the Basic plan. Upgrade to
            Plus to automatically trigger tasks when device states change.
          </Typography>
        )}
      </FormControl>

      {frequencyType === 'trigger' && (
        <ThingTriggerSection
          things={allUserThings}
          onTriggerUpdate={onTriggerUpdate}
          onValidate={OnTriggerValidate}
          isAttemptToSave={isAttemptToSave}
          selected={selectedThing}
        />
      )}
    </Box>
  )
}

export default RepeatSection
