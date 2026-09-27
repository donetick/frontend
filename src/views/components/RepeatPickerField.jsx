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
import { useTranslation } from 'react-i18next'

import ModalActions from '../../components/common/ModalActions'
import NumberInput from '../../components/common/NumberInput'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { getRecurrentChipText } from '../../utils/ChoreCardHelpers'

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

const OCCURRENCE_VALUES = [1, 2, 3, 4, -1]

// -1 is the "last occurrence" sentinel; everything else keys off its number.
const occurrenceKey = value => (value === -1 ? 'last' : String(value))

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

  let { frequency, frequencyMetadata, frequencyType } = value

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
const TimeRow = ({ metadata, onUpdate }) => {
  const { t } = useTranslation('chores')
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
      <SectionLabel>{t('repeat.picker.timeOfDay')}</SectionLabel>
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
}

const pillListSx = {
  '--List-gap': '8px',
  '--ListItem-radius': '20px',
}

// Interval section
const IntervalSection = ({
  frequency,
  frequencyMetadata,
  onFrequencyMetadataUpdate,
  onFrequencyUpdate,
}) => {
  const { t } = useTranslation('chores')
  return (
    <Box>
      <SectionLabel>{t('repeat.picker.repeatEvery')}</SectionLabel>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
      >
        <NumberInput
          size='sm'
          value={frequency}
          min={1}
          max={999}
          selectOnFocus
          onValueChange={onFrequencyUpdate}
          sx={{ width: 72 }}
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
                label={t(`repeat.unit.${unit}`)}
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
}

// Days of week section
const DaysOfWeekSection = ({
  frequencyMetadata,
  onFrequencyMetadataUpdate,
}) => {
  const { t } = useTranslation('chores')
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
      <SectionLabel>{t('repeat.picker.days')}</SectionLabel>
      <List orientation='horizontal' wrap sx={pillListSx}>
        {DAYS.map(day => (
          <ListItem key={day}>
            <Checkbox
              checked={selectedDays.includes(day)}
              onClick={() => toggleDay(day)}
              overlay
              disableIcon
              variant='soft'
              label={t(`repeat.daysShort.${day}`)}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 2 }}>
        <SectionLabel>{t('repeat.picker.pattern')}</SectionLabel>
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
            { value: 'every_week', labelKey: 'everyWeek' },
            { value: 'week_of_month', labelKey: 'specificWeeks' },
          ].map(opt => (
            <Radio
              key={opt.value}
              value={opt.value}
              color='neutral'
              disableIcon
              label={t(`repeat.picker.${opt.labelKey}`)}
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
          <SectionLabel>{t('repeat.picker.occurrences')}</SectionLabel>
          <List orientation='horizontal' wrap sx={pillListSx}>
            {OCCURRENCE_VALUES.map(opt => (
              <ListItem key={opt}>
                <Checkbox
                  checked={selectedOccurrences.includes(opt)}
                  onClick={() => toggleOccurrence(opt)}
                  overlay
                  disableIcon
                  variant='soft'
                  label={t(`repeat.occurrenceShort.${occurrenceKey(opt)}`)}
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
  onFrequencyMetadataUpdate,
  onFrequencyUpdate,
}) => {
  const { t } = useTranslation('chores')
  const selectedMonths = frequencyMetadata?.months || []

  const toggleMonth = month => {
    const next = selectedMonths.includes(month)
      ? selectedMonths.filter(m => m !== month)
      : [...selectedMonths, month]
    onFrequencyMetadataUpdate({ ...frequencyMetadata, months: next })
  }

  return (
    <Box>
      <SectionLabel>{t('repeat.picker.months')}</SectionLabel>
      <List orientation='horizontal' wrap sx={pillListSx}>
        {MONTHS.map(month => (
          <ListItem key={month}>
            <Checkbox
              checked={selectedMonths.includes(month)}
              onClick={() => toggleMonth(month)}
              overlay
              disableIcon
              variant='soft'
              label={t(`repeat.monthsShort.${month}`)}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
        <SectionLabel>{t('repeat.picker.dayOfMonth')}</SectionLabel>
        <NumberInput
          size='sm'
          value={frequency}
          min={1}
          max={31}
          selectOnFocus
          onValueChange={onFrequencyUpdate}
          sx={{ width: 72 }}
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
  emptyDisplay = 'icon-text',
  onChange,
  onClear,
  size = 'sm',
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localFrequencyType, setLocalFrequencyType] = useState('daily')
  const [localFrequency, setLocalFrequency] = useState(1)
  const [localFrequencyMetadata, setLocalFrequencyMetadata] =
    useState(defaultMetadata)
  const { ResponsiveModal } = useResponsiveModal()
  const { t } = useTranslation('chores')

  useEffect(() => {
    if (!isOpen) return
    const init = initLocalState(value)
    setLocalFrequencyType(init.frequencyType)
    setLocalFrequency(init.frequency)
    setLocalFrequencyMetadata(init.frequencyMetadata)
  }, [isOpen, value])

  const hasRepeat = Boolean(value)
  const shouldShowLabel = hasRepeat || emptyDisplay === 'icon-text'
  const displayLabel = hasRepeat
    ? getRecurrentChipText(value)
    : t('repeat.picker.trigger')
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
            aria-label={t('repeat.picker.clearAria')}
            size='sm'
            variant='soft'
            color='danger'
            onClick={e => {
              e.stopPropagation()
              onClear?.()
            }}
            sx={{
              position: 'absolute',
              top: -18,
              right: -18,
              zIndex: 10,
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
        title={t('repeat.picker.modalTitle')}
        footer={
          <ModalActions
            tertiary={
              hasRepeat
                ? {
                    label: t('repeat.picker.remove'),
                    color: 'danger',
                    onClick: () => {
                      onClear?.()
                      setIsOpen(false)
                    },
                  }
                : undefined
            }
            secondary={{
              label: t('common:cancel'),
              onClick: () => setIsOpen(false),
            }}
            primary={{ label: t('repeat.picker.apply'), onClick: handleSave }}
          />
        }
      >
        {/* Frequency type selector */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <SectionLabel>{t('repeat.picker.frequency')}</SectionLabel>
            <List orientation='horizontal' wrap sx={pillListSx}>
              {FREQUENCY_TYPES.map(type => (
                <ListItem key={type}>
                  <Checkbox
                    checked={displayType === type}
                    onClick={() => handleTypeSelect(type)}
                    overlay
                    disableIcon
                    variant='soft'
                    label={t(`repeat.freqType.${type}`)}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Custom sub-type + detail panel */}
          {displayType === 'custom' && (
            <>
              <Box>
                <SectionLabel>{t('repeat.picker.scheduleType')}</SectionLabel>
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
                      label={t(`repeat.repeatOnType.${type}`)}
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
