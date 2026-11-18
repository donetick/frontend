import {
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_OVERDUE_FOLLOW_UP_LIMIT,
  DEFAULT_OVERDUE_NAGGING_MINUTES,
  isValidFollowUpInterval,
  isValidFollowUpLimit,
  MAX_OVERDUE_FOLLOW_UP_LIMIT,
  MAX_OVERDUE_NAGGING_MINUTES,
} from '../../utils/overdueNagging'

const OverdueNaggingSettings = ({ allowed, onChange, value }) => {
  const { t } = useTranslation('chores')
  const enabled = Boolean(value)
  const maxFollowUps = value?.maxFollowUps ?? DEFAULT_OVERDUE_FOLLOW_UP_LIMIT
  const invalidLimit = !isValidFollowUpLimit(maxFollowUps)
  const invalidInterval =
    enabled && !isValidFollowUpInterval(value.intervalMinutes)
  return (
    <Stack spacing={1.5}>
      <Checkbox
        label={t('remind.overdueNagging')}
        checked={enabled}
        disabled={!enabled && !allowed}
        onChange={event =>
          onChange(
            event.target.checked
              ? {
                  intervalMinutes: DEFAULT_OVERDUE_NAGGING_MINUTES,
                  maxFollowUps: DEFAULT_OVERDUE_FOLLOW_UP_LIMIT,
                  continueUntilComplete: false,
                }
              : null,
          )
        }
      />
      {enabled && allowed && (
        <>
          <FormControl error={invalidInterval}>
            <FormLabel>{t('remind.overdueNaggingInterval')}</FormLabel>
            <Input
              type='number'
              size='sm'
              value={value.intervalMinutes}
              slotProps={{
                input: { min: 1, max: MAX_OVERDUE_NAGGING_MINUTES, step: 1 },
              }}
              onChange={event =>
                onChange({
                  ...value,
                  intervalMinutes:
                    event.target.value === '' ? '' : Number(event.target.value),
                })
              }
            />
            <FormHelperText>
              {invalidInterval
                ? t('remind.overdueNaggingIntervalInvalid')
                : t('remind.overdueNaggingHelp')}
            </FormHelperText>
          </FormControl>
          <Checkbox
            label={t('remind.overdueFollowUpUntilComplete')}
            checked={Boolean(value.continueUntilComplete)}
            onChange={event =>
              onChange({
                ...value,
                continueUntilComplete: event.target.checked,
              })
            }
          />
          {value.continueUntilComplete ? (
            <FormHelperText>
              {t('remind.overdueFollowUpUntilCompleteHelp')}
            </FormHelperText>
          ) : (
            <FormControl error={invalidLimit}>
              <FormLabel>{t('remind.overdueFollowUpLimit')}</FormLabel>
              <Input
                type='number'
                size='sm'
                value={maxFollowUps}
                slotProps={{
                  input: { min: 1, max: MAX_OVERDUE_FOLLOW_UP_LIMIT, step: 1 },
                }}
                onChange={event =>
                  onChange({
                    ...value,
                    maxFollowUps:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  })
                }
              />
              <FormHelperText>
                {invalidLimit
                  ? t('remind.overdueFollowUpLimitInvalid')
                  : t('remind.overdueFollowUpLimitHelp')}
              </FormHelperText>
            </FormControl>
          )}
        </>
      )}
      {!allowed && (
        <FormHelperText>
          {t('remind.overdueNaggingNeedsDueDate')}
        </FormHelperText>
      )}
    </Stack>
  )
}

OverdueNaggingSettings.propTypes = {
  allowed: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.shape({
    intervalMinutes: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      .isRequired,
    maxFollowUps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    continueUntilComplete: PropTypes.bool,
  }),
}

export default OverdueNaggingSettings
