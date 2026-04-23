import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  Grid,
  Input,
  List,
  ListItem,
  Option,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../../contexts/LocalizationContext'
import { useUserProfile } from '../../queries/UserQueries'
import { isPlusAccount } from '../../utils/Helpers'
import ThingTriggerSection from './ThingTriggerSection'

const FREQUENCY_TYPES_RADIOS = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'adaptive',
  'custom',
]

const FREQUENCY_TYPE_MESSAGE = {
  adaptive:
    'This chore will be scheduled dynamically based on previous completion dates.',
  custom: 'This chore will be scheduled based on a custom frequency.',
}
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']
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

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const WEEK_PATTERNS = {
  every_week: 'Every week',
  week_of_month: 'Specific occurrences in the month',
}

const DAY_OCCURRENCE_OPTIONS = [
  { value: 1, label: '1st occurrence' },
  { value: 2, label: '2nd occurrence' },
  { value: 3, label: '3rd occurrence' },
  { value: 4, label: '4th occurrence' },
  { value: -1, label: 'Last occurrence' },
]
// Helper function to generate schedule preview text
const generateSchedulePreview = (metadata, formatTimeFn, t) => {
  if (!metadata?.days?.length) return ''

  const dayNames = metadata.days
    .map(day => t(`chores:repeat.dayAbbreviations.${day}`))
    .join(', ')

  const timeStr = metadata.time
    ? formatTimeFn(metadata.time)
    : formatTimeFn(moment().hour(18).minute(0).toISOString())

  if (metadata.weekPattern === 'every_week' || !metadata.weekPattern) {
    return `${t('chores:repeat.everyWeek')} ${dayNames} ${t('chores:repeat.at')} ${timeStr}`
  }

  if (
    metadata.weekPattern === 'week_of_month' &&
    metadata.occurrences?.length
  ) {
    const occurrenceStr = metadata.occurrences
      .map(w => t(`chores:repeat.occurrences.${w}`))
      .join(', ')
    return `${t('chores:repeat.every')} ${occurrenceStr} ${dayNames} ${t('chores:repeat.ofMonth')} ${t('chores:repeat.at')} ${timeStr}`
  }

  return `${t('chores:repeat.every')} ${dayNames} ${t('chores:repeat.at')} ${timeStr}`
}

const RepeatOnSections = ({
  frequencyType,
  frequency,
  onFrequencyUpdate,
  frequencyMetadata,
  onFrequencyMetadataUpdate,
}) => {
  const { t } = useTranslation(['chores', 'common'])
  const { fmt } = useLocalization()
  // if time on frequencyMetadata is not set, try to set it to the nextDueDate if available,
  // otherwise set it to 18:00 of the current day
  useEffect(() => {
    if (!frequencyMetadata?.time) {
      frequencyMetadata.time = moment(
        moment(new Date()).format('YYYY-MM-DD') + 'T' + '18:00',
      ).format()
    }
    // Initialize weekPattern if not set
    if (!frequencyMetadata?.weekPattern) {
      onFrequencyMetadataUpdate({
        ...frequencyMetadata,
        weekPattern: 'every_week',
        occurrences: [],
      })
    }
  }, [frequencyMetadata, onFrequencyMetadataUpdate])

  const timePickerComponent = (
    <Grid
      item
      sm={12}
      sx={{
        display: 'flex',
        direction: 'column',
        flexDirection: 'column',
      }}
    >
      <Typography level='h5'>{t('chores:repeat.timeOfDay')}: </Typography>
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

  switch (frequencyType) {
    case 'interval':
      return (
        <>
          <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography level='h5'>{t('chores:repeat.every')}: </Typography>
            <Input
              slotProps={{
                input: {
                  min: 1,
                  max: 1000,
                },
              }}
              type='number'
              value={frequency}
              onChange={e => {
                onFrequencyUpdate(e.target.value)
              }}
            />
            <Select
              placeholder={t('chores:repeat.unit')}
              value={frequencyMetadata?.unit || 'days'}
              sx={{ ml: 1 }}
            >
              {['hours', 'days', 'weeks', 'months', 'years'].map(item => (
                <Option
                  key={item}
                  value={item}
                  onClick={() => {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      unit: item,
                    })
                  }}
                >
                  {item === 'hours'
                    ? t('common:labels.hours')
                    : t(`chores:frequency.units.${item}`)}
                </Option>
              ))}
            </Select>
          </Grid>
          {timePickerComponent}
        </>
      )
    case 'days_of_the_week':
      return (
        <>
          <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Card>
              <List
                orientation='horizontal'
                wrap
                sx={{
                  '--List-gap': '8px',
                  '--ListItem-radius': '20px',
                }}
              >
                {DAYS.map(item => (
                  <ListItem key={item}>
                    <Checkbox
                      checked={frequencyMetadata?.days?.includes(item) || false}
                      onClick={() => {
                        const newDaysOfTheWeek = frequencyMetadata['days'] || []
                        if (newDaysOfTheWeek.includes(item)) {
                          newDaysOfTheWeek.splice(
                            newDaysOfTheWeek.indexOf(item),
                            1,
                          )
                        } else {
                          newDaysOfTheWeek.push(item)
                        }

                        onFrequencyMetadataUpdate({
                          ...frequencyMetadata,
                          days: newDaysOfTheWeek.sort(),
                        })
                      }}
                      overlay
                      disableIcon
                      variant='soft'
                      label={t(`chores:repeat.days.${item}`)}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                checked={frequencyMetadata?.days?.length === 7}
                onClick={() => {
                  if (frequencyMetadata?.days?.length === 7) {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      days: [],
                      weekPattern: 'every_week',
                      occurrences: [],
                    })
                  } else {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      days: DAYS.map(item => item),
                    })
                  }
                }}
                overlay
                disableIcon
              >
                {frequencyMetadata?.days?.length === 7
                  ? t('chores:repeat.unselectAll')
                  : t('chores:repeat.selectAll')}
              </Button>
            </Card>
          </Grid>

          <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box>
              <RadioGroup
                value={frequencyMetadata?.weekPattern || 'every_week'}
                onChange={event => {
                  const newPattern = event.target.value
                  onFrequencyMetadataUpdate({
                    ...frequencyMetadata,
                    weekPattern: newPattern,
                    occurrences:
                      newPattern === 'every_week'
                        ? []
                        : frequencyMetadata?.occurrences || [],
                  })
                }}
                sx={{ gap: 1, '& > div': { p: 1 } }}
              >
                {Object.entries(WEEK_PATTERNS).map(([value, label]) => (
                  <FormControl key={value}>
                    <Radio
                      value={value}
                      label={
                        value === 'every_week'
                          ? t('chores:repeat.everyWeek')
                          : t('chores:repeat.weekOfMonth')
                      }
                      variant='soft'
                    />
                    {value === 'every_week' && (
                      <FormHelperText>{t('chores:repeat.everyWeekHelper')}</FormHelperText>
                    )}
                    {value === 'week_of_month' && (
                      <FormHelperText>{t('chores:repeat.weekOfMonthHelper')}</FormHelperText>
                    )}
                  </FormControl>
                ))}
              </RadioGroup>

              {frequencyMetadata?.weekPattern === 'week_of_month' && (
                <Box mt={2}>
                  <Typography level='body-sm' mb={1}>
                    {t('chores:repeat.occurrencePrompt')}:
                  </Typography>
                  <Typography level='body-xs' color='neutral' mb={2}>
                    {t('chores:repeat.occurrenceExample')}
                  </Typography>
                  <Card>
                    <List
                      orientation='horizontal'
                      wrap
                      sx={{
                        '--List-gap': '8px',
                        '--ListItem-radius': '20px',
                      }}
                    >
                      {DAY_OCCURRENCE_OPTIONS.map(option => (
                        <ListItem key={option.value}>
                          <Checkbox
                            checked={
                              frequencyMetadata?.occurrences?.includes(
                                option.value,
                              ) || false
                            }
                            onChange={() => {
                              const currentOccurrences =
                                frequencyMetadata?.occurrences || []
                              const newOccurrences =
                                currentOccurrences.includes(option.value)
                                  ? currentOccurrences.filter(
                                      w => w !== option.value,
                                    )
                                  : [...currentOccurrences, option.value]
                              onFrequencyMetadataUpdate({
                                ...frequencyMetadata,
                                occurrences: newOccurrences.sort((a, b) => {
                                  if (a === -1) return 1 // Last occurrence goes to end
                                  if (b === -1) return -1
                                  return a - b
                                }),
                              })
                            }}
                            overlay
                            disableIcon
                            variant='soft'
                            label={t(
                              `chores:repeat.occurrences.${option.value}`,
                            )}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Button
                      size='sm'
                      variant='soft'
                      color='neutral'
                      onClick={() => {
                        if (
                          frequencyMetadata?.occurrences?.length ===
                          DAY_OCCURRENCE_OPTIONS.length
                        ) {
                          onFrequencyMetadataUpdate({
                            ...frequencyMetadata,
                            occurrences: [],
                          })
                        } else {
                          onFrequencyMetadataUpdate({
                            ...frequencyMetadata,
                            occurrences: DAY_OCCURRENCE_OPTIONS.map(
                              option => option.value,
                            ),
                          })
                        }
                      }}
                      overlay
                      disableIcon
                    >
                      {frequencyMetadata?.occurrences?.length ===
                      DAY_OCCURRENCE_OPTIONS.length
                        ? t('chores:repeat.unselectAll')
                        : t('chores:repeat.selectAll')}
                    </Button>
                  </Card>
                </Box>
              )}

              {/* Quarter week pattern removed - doesn't make sense with Nth day approach */}

              {/* Live Preview */}
              {frequencyMetadata?.days?.length > 0 && (
                <Card mt={2} p={2}>
                  <Typography level='body-sm' color='primary'>
                    {generateSchedulePreview(frequencyMetadata, fmt.time, t)}
                  </Typography>
                </Card>
              )}
            </Box>
          </Grid>

          {timePickerComponent}
        </>
      )
    case 'day_of_the_month':
      return (
        <>
          <Grid
            item
            sm={12}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Card>
              <List
                orientation='horizontal'
                wrap
                sx={{
                  '--List-gap': '8px',
                  '--ListItem-radius': '20px',
                }}
              >
                {MONTHS.map(item => (
                  <ListItem key={item}>
                    <Checkbox
                      checked={frequencyMetadata?.months?.includes(item)}
                      onClick={() => {
                        const newMonthsOfTheYear =
                          frequencyMetadata['months'] || []
                        if (newMonthsOfTheYear.includes(item)) {
                          newMonthsOfTheYear.splice(
                            newMonthsOfTheYear.indexOf(item),
                            1,
                          )
                        } else {
                          newMonthsOfTheYear.push(item)
                        }

                        onFrequencyMetadataUpdate({
                          ...frequencyMetadata,
                          months: newMonthsOfTheYear.sort(),
                        })
                        console.log('newMonthsOfTheYear', newMonthsOfTheYear)
                        // setDaysOfTheWeek(newDaysOfTheWeek)
                      }}
                      overlay
                      disableIcon
                      variant='soft'
                      label={t(`chores:repeat.months.${item}`)}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                checked={frequencyMetadata?.months?.length === 12}
                onClick={() => {
                  if (frequencyMetadata?.months?.length === 12) {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      months: [],
                    })
                  } else {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      months: MONTHS.map(item => item),
                    })
                  }
                }}
                overlay
                disableIcon
              >
                {frequencyMetadata?.months?.length === 12
                  ? t('chores:repeat.unselectAll')
                  : t('chores:repeat.selectAll')}
              </Button>
            </Card>
          </Grid>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Typography>{t('chores:repeat.onThe')} </Typography>
            <Input
              sx={{ width: '80px' }}
              type='number'
              value={frequency}
              onChange={e => {
                if (e.target.value < 1) {
                  e.target.value = 1
                } else if (e.target.value > 31) {
                  e.target.value = 31
                }
                // setDayOftheMonth(e.target.value)

                onFrequencyUpdate(e.target.value)
              }}
            />
            <Typography>{t('chores:repeat.ofSelectedMonths')}</Typography>
          </Box>
          {timePickerComponent}
        </>
      )

    default:
      return <></>
  }
}

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
  const { t } = useTranslation(['chores', 'common'])
  const { data: userProfile } = useUserProfile()

  return (
    <Box mt={2}>
      <Typography level='h4'>{t('chores:repeat.repeat')}:</Typography>
      <FormControl sx={{ mt: 1 }}>
        <Checkbox
          onChange={e => {
            onFrequencyTypeUpdate(e.target.checked ? 'daily' : 'once')
            if (e.target.checked) {
              onTriggerUpdate(null)
            }
          }}
          defaultChecked={!['once', 'trigger'].includes(frequencyType)}
          checked={!['once', 'trigger'].includes(frequencyType)}
          value={!['once', 'trigger'].includes(frequencyType)}
          overlay
          label={t('chores:repeat.repeatTask')}
        />
        <FormHelperText>{t('chores:repeat.repeatHelper')}</FormHelperText>
      </FormControl>
      {!['once', 'trigger'].includes(frequencyType) && (
        <>
          <Card sx={{ mt: 1 }}>
            <Typography level='h5'>{t('chores:repeat.howOften')}</Typography>

            <List
              orientation='horizontal'
              wrap
              sx={{
                '--List-gap': '8px',
                '--ListItem-radius': '20px',
              }}
            >
              {FREQUENCY_TYPES_RADIOS.map(item => (
                <ListItem key={item}>
                  <Checkbox
                    // disabled={index === 0}
                    checked={
                      item === frequencyType ||
                      (item === 'custom' &&
                        REPEAT_ON_TYPE.includes(frequencyType))
                    }
                    // defaultChecked={item === frequencyType}
                    onClick={() => {
                      if (item === 'custom') {
                        onFrequencyTypeUpdate(REPEAT_ON_TYPE[0])
                        onFrequencyUpdate(1)
                        onFrequencyMetadataUpdate({
                          unit: 'days',
                          time: frequencyMetadata?.time
                            ? frequencyMetadata?.time
                            : moment(
                                moment(new Date()).format('YYYY-MM-DD') +
                                  'T' +
                                  '18:00',
                              ).format(),
                          timezone:
                            Intl.DateTimeFormat().resolvedOptions().timeZone,
                        })

                        return
                      }
                      onFrequencyTypeUpdate(item)
                    }}
                    overlay
                    disableIcon
                    variant='soft'
                    label={
                      (item === 'custom'
                        ? t('chores:repeat.options.custom')
                        : t(`chores:frequency.${item}`))
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Typography>
              {frequencyType === 'adaptive'
                ? t('chores:repeat.typeMessages.adaptive')
                : frequencyType === 'custom'
                  ? t('chores:repeat.typeMessages.custom')
                  : ''}
            </Typography>
            {frequencyType === 'custom' ||
              (REPEAT_ON_TYPE.includes(frequencyType) && (
                <>
                  <Grid container spacing={1} mt={2}>
                    <Grid item>
                      <Typography>{t('chores:repeat.repeatOn')}:</Typography>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <RadioGroup
                          orientation='horizontal'
                          aria-labelledby='segmented-controls-example'
                          name='justify'
                          // value={justify}
                          // onChange={event => setJustify(event.target.value)}
                          sx={{
                            minHeight: 48,
                            padding: '4px',
                            borderRadius: '12px',
                            bgcolor: 'neutral.softBg',
                            '--RadioGroup-gap': '4px',
                            '--Radio-actionRadius': '8px',
                            mb: 1,
                          }}
                        >
                          {REPEAT_ON_TYPE.map(item => (
                            <Radio
                              key={item}
                              color='neutral'
                              checked={item === frequencyType}
                              onClick={() => {
                                if (
                                  item === 'day_of_the_month' ||
                                  item === 'interval'
                                ) {
                                  onFrequencyUpdate(1)
                                }
                                onFrequencyTypeUpdate(item)
                                if (item === 'days_of_the_week') {
                                  onFrequencyMetadataUpdate({
                                    ...frequencyMetadata,
                                    days: [],
                                    weekPattern: 'every_week',
                                    weekNumbers: [],
                                  })
                                } else if (item === 'day_of_the_month') {
                                  onFrequencyMetadataUpdate({
                                    ...frequencyMetadata,
                                    months: [],
                                  })
                                } else if (item === 'interval') {
                                  onFrequencyMetadataUpdate({
                                    ...frequencyMetadata,
                                    unit: 'days',
                                  })
                                }
                                // setRepeatOn(item)
                              }}
                              value={item}
                              disableIcon
                              label={t(`chores:repeat.options.${item}`)}
                              variant='plain'
                              sx={{
                                px: 2,
                                alignItems: 'center',
                              }}
                              slotProps={{
                                action: ({ checked }) => ({
                                  sx: {
                                    ...(checked && {
                                      bgcolor: 'background.surface',
                                      boxShadow: 'sm',
                                      '&:hover': {
                                        bgcolor: 'background.surface',
                                      },
                                    }),
                                  },
                                }),
                              }}
                            />
                          ))}
                        </RadioGroup>
                      </Box>
                    </Grid>

                    <RepeatOnSections
                      frequency={frequency}
                      onFrequencyUpdate={onFrequencyUpdate}
                      frequencyType={frequencyType}
                      onFrequencyTypeUpdate={onFrequencyTypeUpdate}
                      frequencyMetadata={frequencyMetadata || {}}
                      onFrequencyMetadataUpdate={onFrequencyMetadataUpdate}
                      things={allUserThings}
                    />
                  </Grid>
                </>
              ))}
            <FormControl error={Boolean(frequencyError)}>
              <FormHelperText error>{frequencyError}</FormHelperText>
            </FormControl>
          </Card>
        </>
      )}
      <FormControl sx={{ mt: 1 }}>
        <Checkbox
          onChange={e => {
            onFrequencyTypeUpdate(e.target.checked ? 'trigger' : 'once')
            //  if unchecked, set selectedThing to null:
            if (!e.target.checked) {
              onTriggerUpdate(null)
            }
          }}
          defaultChecked={frequencyType === 'trigger'}
          checked={frequencyType === 'trigger'}
          value={frequencyType === 'trigger'}
          disabled={!isPlusAccount(userProfile)}
          overlay
          label={t('chores:repeat.triggerTask')}
        />
        <FormHelperText
          sx={{
            opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
          }}
        >
          {t('chores:repeat.triggerHelper')}{' '}
          {userProfile && !isPlusAccount(userProfile) && (
            <Chip variant='soft' color='warning'>
              {t('chores:repeat.plusFeature')}
            </Chip>
          )}
        </FormHelperText>
        {!isPlusAccount(userProfile) && (
          <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
            {t('chores:repeat.triggerBasicPlan')}
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
