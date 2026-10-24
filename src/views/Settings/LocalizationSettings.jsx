import { OpenInNewRounded } from '@mui/icons-material'
import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  Link,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useTranslation } from 'react-i18next'

import {
  DATE_FORMATS,
  TIME_FORMATS,
  useLocalization,
} from '@/contexts/LocalizationContext'

import { track } from '../../analytics'
import SettingsLayout from './SettingsLayout'
import SettingsSection from './SettingsSection'

const choiceSx = selected => ({
  position: 'relative',
  minWidth: 0,
  p: 1.5,
  border: '1px solid',
  borderColor: selected ? 'primary.outlinedColor' : 'divider',
  bgcolor: selected ? 'primary.softBg' : 'background.surface',
  borderRadius: 'lg',
  '&:focus-within': {
    outline: '2px solid',
    outlineColor: 'focusVisible',
    outlineOffset: 2,
  },
})

const LocalizationSettings = () => {
  const { t } = useTranslation('settings')
  const {
    availableLanguages,
    dateFormat,
    firstDayOfWeek,
    isRTL,
    language,
    setDateFormat,
    setFirstDayOfWeek,
    setLanguage,
    setTimeFormat,
    timeFormat,
  } = useLocalization()

  // One fixed example makes formats easy to compare, including after a
  // language switch (without waiting for Moment's global locale effect).
  const sampleDate = moment('2026-01-15T14:30:00').locale(language)
  const dateFormatOptions = [
    { value: DATE_FORMATS.MDY, label: t('localization.formats.mdy') },
    { value: DATE_FORMATS.DMY, label: t('localization.formats.dmy') },
    { value: DATE_FORMATS.YMD, label: t('localization.formats.ymd') },
    { value: DATE_FORMATS.LONG, label: t('localization.formats.long') },
    { value: DATE_FORMATS.SHORT, label: t('localization.formats.short') },
  ]
  const weekStarts = [
    { value: 0, name: 'sunday' },
    { value: 1, name: 'monday' },
    { value: 6, name: 'saturday' },
  ]

  return (
    <SettingsLayout title={t('localization.title')}>
      <Box sx={{ maxWidth: 680, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 560, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('localization.description')}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <SettingsSection
            title={t('localization.language')}
            description={t('localization.languageDescription')}
          >
            <FormControl>
              <FormLabel htmlFor='settings-language'>
                {t('localization.language')}
              </FormLabel>
              <Select
                value={language}
                slotProps={{
                  button: { id: 'settings-language' },
                  listbox: { sx: { maxHeight: 320, maxWidth: 'calc(100vw - 32px)' } },
                }}
                onChange={(_, value) => {
                  if (!value) return
                  setLanguage(value)
                  track('localization_setting_changed', {
                    setting: 'language',
                    value,
                  })
                }}
                sx={{ minHeight: 48, '& .MuiSelect-button': { whiteSpace: 'normal' } }}
              >
                {availableLanguages.map(lang => (
                  <Option key={lang.code} value={lang.code} sx={{ minHeight: 44 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'baseline', minWidth: 0 }}>
                      <Typography component='span' lang={lang.code} dir='auto'>
                        {lang.nativeName}
                      </Typography>
                      {lang.nativeName !== lang.name && (
                        <Typography component='span' level='body-sm' textColor='text.secondary'>
                          ({lang.name})
                        </Typography>
                      )}
                    </Box>
                  </Option>
                ))}
              </Select>
              <FormHelperText>{t('localization.languageDefaultsHint')}</FormHelperText>
              {isRTL && <FormHelperText>{t('localization.rtlNotice')}</FormHelperText>}
            </FormControl>
            {language !== 'en' && (
              <Link
                href={`https://crowdin.com/project/donetick/${language}`}
                target='_blank'
                rel='noopener noreferrer'
                endDecorator={<OpenInNewRounded sx={{ fontSize: 16 }} />}
                onClick={() => track('localization_help_translate_clicked', { language })}
                sx={{ mt: 1.5, fontSize: 'sm' }}
              >
                {t('localization.helpTranslate')}
              </Link>
            )}
          </SettingsSection>

          <SettingsSection
            title={t('localization.dateFormat')}
            description={t('localization.dateFormatDescription')}
          >
            <RadioGroup
              aria-label={t('localization.dateFormat')}
              name='date-format'
              value={dateFormat}
              onChange={event => {
                const value = event.target.value
                setDateFormat(value)
                track('localization_setting_changed', { setting: 'date_format', value })
              }}
              sx={{ gap: 1 }}
            >
              {dateFormatOptions.map(option => (
                <Sheet key={option.value} sx={choiceSx(dateFormat === option.value)}>
                  <Radio
                    overlay
                    value={option.value}
                    label={
                      <Box sx={{ minWidth: 0 }}>
                        <Typography level='title-sm'>{sampleDate.format(option.value)}</Typography>
                        <Typography level='body-sm' textColor='text.secondary' sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
                          {option.label}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', '& .MuiRadio-radio': { mt: 0.25 } }}
                  />
                </Sheet>
              ))}
            </RadioGroup>
          </SettingsSection>

          <SettingsSection
            title={t('localization.timeFormat')}
            description={t('localization.timeFormatDescription')}
          >
            <RadioGroup
              aria-label={t('localization.timeFormat')}
              name='time-format'
              value={timeFormat}
              onChange={event => {
                const value = event.target.value
                setTimeFormat(value)
                track('localization_setting_changed', { setting: 'time_format', value })
              }}
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}
            >
              {[TIME_FORMATS.HOUR_12, TIME_FORMATS.HOUR_24].map(value => (
                <Sheet key={value} sx={choiceSx(timeFormat === value)}>
                  <Typography aria-hidden='true' level='title-lg' sx={{ mb: 1.5, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>
                    {sampleDate.format(value)}
                  </Typography>
                  <Radio
                    overlay
                    value={value}
                    label={t(value === TIME_FORMATS.HOUR_12 ? 'localization.12hour' : 'localization.24hour')}
                    sx={{ alignItems: 'flex-start', '& .MuiRadio-label': { overflowWrap: 'anywhere' } }}
                  />
                </Sheet>
              ))}
            </RadioGroup>
          </SettingsSection>

          <SettingsSection
            title={t('localization.firstDayOfWeek')}
            description={t('localization.firstDayOfWeekDescription')}
          >
            <RadioGroup
              aria-label={t('localization.firstDayOfWeek')}
              name='week-start'
              value={String(firstDayOfWeek)}
              onChange={event => {
                const value = Number(event.target.value)
                setFirstDayOfWeek(value)
                track('localization_setting_changed', {
                  setting: 'first_day_of_week',
                  value: weekStarts.find(day => day.value === value).name,
                })
              }}
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}
            >
              {weekStarts.map(day => (
                <Sheet key={day.value} sx={choiceSx(firstDayOfWeek === day.value)}>
                  <Radio
                    overlay
                    value={String(day.value)}
                    label={t(`localization.${day.name}`)}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      '& .MuiRadio-label': { overflowWrap: 'anywhere' },
                    }}
                  />
                </Sheet>
              ))}
            </RadioGroup>
          </SettingsSection>
        </Box>
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 2 }}>
          {t('layout.savedOnDevice')}
        </Typography>
      </Box>
    </SettingsLayout>
  )
}

export default LocalizationSettings
