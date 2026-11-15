import {
  Box,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  List,
  ListItem,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FieldGroupTitle, FieldHint } from '../../components/common/FieldGroup'
import {
  normalizeRecurrenceBounds,
  PERIOD_TYPES,
  serializeRecurrenceBounds,
  STOP_TYPES,
  validateRecurrenceBounds,
} from '../../utils/RecurrenceBounds'

export const BOUNDS_ERRORS = {
  invalidPeriodType: 'Choose a valid active period.',
  invalidStopType: 'Choose a valid way to stop repeating.',
  invalidDate: 'Enter a valid date.',
  stopBeforeStart: 'Stop date must be on or after the start date.',
  invalidLimit: 'Enter a whole number of completions greater than zero.',
}

const PERIOD_LABELS = {
  always: 'Always active',
  starts: 'From a date',
  seasonal: 'Seasonal',
}

const STOP_LABELS = {
  never: 'Never',
  completions: 'After a number of completions',
  date: 'On a specific date',
}

// Seasons have no year, so February always offers 29 and never silently clamps.
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const pad = value => String(value).padStart(2, '0')

// There is no native year-less date input, so month and day are picked apart.
function SeasonEndpointPicker({ dayLabel, monthLabel, onChange, value }) {
  const { i18n, t } = useTranslation('chores')
  const [rawMonth, rawDay] = String(value || '').split('-')
  const month = Number(rawMonth) || 0
  const day = Number(rawDay) || 0
  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(i18n.language, {
      month: 'long',
      timeZone: 'UTC',
    })
    return MONTH_LENGTHS.map((_, index) =>
      format.format(new Date(Date.UTC(2001, index, 1))),
    )
  }, [i18n.language])
  const unset = t('repeat.bounds.unset', { defaultValue: 'Not set' })

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Select
        value={month}
        placeholder={unset}
        slotProps={{ button: { 'aria-label': monthLabel } }}
        sx={{ flex: '2 1 0' }}
        onChange={(_, next) => {
          if (next == null) return
          if (!next) return onChange(undefined)
          // Keep the day in range when moving to a shorter month.
          const clamped = Math.min(day || 1, MONTH_LENGTHS[next - 1])
          onChange(`${pad(next)}-${pad(clamped)}`)
        }}
      >
        <Option value={0}>{unset}</Option>
        {monthNames.map((name, index) => (
          <Option key={name} value={index + 1}>
            {name}
          </Option>
        ))}
      </Select>
      <Select
        value={day}
        disabled={!month}
        placeholder={unset}
        slotProps={{ button: { 'aria-label': dayLabel } }}
        sx={{ flex: '1 1 0' }}
        onChange={(_, next) => next && onChange(`${pad(month)}-${pad(next)}`)}
      >
        {Array.from({ length: MONTH_LENGTHS[month - 1] || 0 }, (_, index) => (
          <Option key={index} value={index + 1}>
            {index + 1}
          </Option>
        ))}
      </Select>
    </Box>
  )
}

function ChipChoices({
  ariaLabel,
  labels,
  onSelect,
  options,
  prefix,
  selected,
  text,
}) {
  return (
    <FormControl>
      <List
        orientation='horizontal'
        wrap
        aria-label={ariaLabel}
        sx={{ '--List-gap': '8px', '--ListItem-radius': '20px' }}
      >
        {options.map(item => (
          <ListItem key={item}>
            <Checkbox
              checked={item === selected}
              onClick={() => onSelect(item)}
              overlay
              disableIcon
              variant='soft'
              label={text(`${prefix}.${item}`, labels[item])}
            />
          </ListItem>
        ))}
      </List>
    </FormControl>
  )
}

// Shared by the full editor and quick-add picker. Updates only its metadata key.
export default function RecurrenceBoundsFields({ metadata = {}, onChange }) {
  const { t } = useTranslation('chores')
  const { activePeriod, stopRepeating } = normalizeRecurrenceBounds(
    metadata?.scheduleBounds,
  )
  const bounds = { activePeriod, stopRepeating }
  const error = validateRecurrenceBounds(bounds)
  const text = (key, fallback) =>
    t(`repeat.bounds.${key}`, { defaultValue: fallback })
  // An untouched "always active, never stops" selection is stored as nothing.
  const emit = next =>
    onChange({ ...metadata, scheduleBounds: serializeRecurrenceBounds(next) })
  // Switching a type drops the fields it does not own, so a date is never
  // silently reinterpreted as a seasonal endpoint or carried into "always".
  const selectPeriod = type => emit({ ...bounds, activePeriod: { type } })
  const selectStop = type => emit({ ...bounds, stopRepeating: { type } })
  const updatePeriod = patch =>
    emit({ ...bounds, activePeriod: { ...activePeriod, ...patch } })
  const updateStop = patch =>
    emit({ ...bounds, stopRepeating: { ...stopRepeating, ...patch } })

  const seasonal = activePeriod.type === 'seasonal'
  const limitLabel = text('limitLabel', 'Number of completions')
  const stopDateLabel = text('stopDateLabel', 'Stops after')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <FieldGroupTitle sx={{ mb: 0 }}>
        {text('activePeriod', 'Active period')}
      </FieldGroupTitle>
      <ChipChoices
        ariaLabel={text('activePeriod', 'Active period')}
        labels={PERIOD_LABELS}
        onSelect={selectPeriod}
        options={PERIOD_TYPES}
        prefix='period'
        selected={activePeriod.type}
        text={text}
      />
      {activePeriod.type === 'always' && (
        <FieldHint sx={{ mb: 0 }}>
          {text(
            'alwaysHelp',
            'This task is live from now on, with no start date or season.',
          )}
        </FieldHint>
      )}
      {activePeriod.type === 'starts' && (
        <FormControl sx={{ maxWidth: '200px' }}>
          <FormLabel>{text('startsOn', 'Starts on')}</FormLabel>
          <Input
            type='date'
            value={activePeriod.start || ''}
            onChange={event =>
              updatePeriod({ start: event.target.value || undefined })
            }
            slotProps={{
              input: { 'aria-label': text('startsOn', 'Starts on') },
            }}
          />
          <FormHelperText>
            {text(
              'startsHelp',
              'Before this date the task is dormant, not overdue.',
            )}
          </FormHelperText>
        </FormControl>
      )}
      {seasonal && (
        <>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {['start', 'end'].map(endpoint => {
              const label =
                endpoint === 'start'
                  ? text('seasonStart', 'Season start')
                  : text('seasonEnd', 'Season end')
              return (
                <FormControl key={endpoint} sx={{ flex: '1 1 240px' }}>
                  <FormLabel>{label}</FormLabel>
                  <SeasonEndpointPicker
                    value={activePeriod[endpoint]}
                    onChange={value => updatePeriod({ [endpoint]: value })}
                    monthLabel={`${label} — ${text('monthLabel', 'Month')}`}
                    dayLabel={`${label} — ${text('dayLabel', 'Day')}`}
                  />
                </FormControl>
              )
            })}
          </Box>
          <FieldHint sx={{ mb: 0 }}>
            {text(
              'seasonalHelp',
              'The season repeats every year and may wrap across New Year, for example November 1 to February 28. An omitted start means January 1; an omitted end means December 31. Outside the season the task is dormant, not overdue, and its recurring schedule stays anchored.',
            )}
          </FieldHint>
        </>
      )}

      <FieldGroupTitle
        sx={{ mt: 0.5, mb: 0 }}
        endDecorator={
          <Typography
            level='body-xs'
            textColor='text.tertiary'
            sx={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}
          >
            {text('stopOptional', '(optional)')}
          </Typography>
        }
      >
        {text('stopRepeating', 'Stop repeating')}
      </FieldGroupTitle>
      <ChipChoices
        ariaLabel={text('stopRepeating', 'Stop repeating')}
        labels={STOP_LABELS}
        onSelect={selectStop}
        options={STOP_TYPES}
        prefix='stop'
        selected={stopRepeating.type}
        text={text}
      />
      {stopRepeating.type === 'completions' && (
        <FormControl>
          <FormLabel>{limitLabel}</FormLabel>
          <Input
            type='number'
            sx={{ maxWidth: '160px' }}
            value={stopRepeating.completionLimit ?? ''}
            onChange={event =>
              updateStop({
                completionLimit:
                  event.target.value === ''
                    ? undefined
                    : Number(event.target.value),
              })
            }
            slotProps={{
              input: { min: 1, step: 1, 'aria-label': limitLabel },
            }}
          />
          <FormHelperText>
            {text(
              'limitHint',
              'The task ends once it has been completed this many times, counted across every season. Only completed tasks count, not skips or misses.',
            )}
          </FormHelperText>
        </FormControl>
      )}
      {stopRepeating.type === 'date' && (
        <FormControl sx={{ maxWidth: '200px' }}>
          <FormLabel>{stopDateLabel}</FormLabel>
          <Input
            type='date'
            value={stopRepeating.date || ''}
            onChange={event =>
              updateStop({ date: event.target.value || undefined })
            }
            slotProps={{ input: { 'aria-label': stopDateLabel } }}
          />
          <FormHelperText>
            {text(
              'stopDateHint',
              'Inclusive, in the schedule’s timezone. The task ends after this date and is not generated again.',
            )}
          </FormHelperText>
        </FormControl>
      )}
      {error && (
        <FormControl error>
          <FormHelperText role='alert'>
            {text(error, BOUNDS_ERRORS[error])}
          </FormHelperText>
        </FormControl>
      )}
    </Box>
  )
}
