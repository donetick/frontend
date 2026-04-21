import {
  DATE_FORMATS,
  TIME_FORMATS,
  useLocalization,
} from '@/contexts/LocalizationContext'
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  FormControl,
  FormHelperText,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import SettingsLayout from './SettingsLayout'

const LocalizationSettings = () => {
  const { t } = useTranslation(['settings', 'common'])
  const {
    language,
    setLanguage,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat,
    firstDayOfWeek,
    setFirstDayOfWeek,
    availableLanguages,
    isRTL,
  } = useLocalization()

  const sampleDate = moment('2024-01-15 14:30:00')

  const dateFormatOptions = [
    { value: DATE_FORMATS.MDY, label: t('localization.formats.mdy') },
    { value: DATE_FORMATS.DMY, label: t('localization.formats.dmy') },
    { value: DATE_FORMATS.YMD, label: t('localization.formats.ymd') },
    { value: DATE_FORMATS.LONG, label: t('localization.formats.long') },
    { value: DATE_FORMATS.SHORT, label: t('localization.formats.short') },
  ]

  return (
    <SettingsLayout title={t('settings:localization.title')}>
      <div className='grid gap-4 py-4'>
        <Typography level='body-md'>{t('localization.description')}</Typography>

        <Typography level='h3'>{t('localization.language')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('localization.languageDescription')}
        </Typography>
        <FormControl>
          <Select
            value={language}
            onChange={(_, value) => setLanguage(value)}
            sx={{ maxWidth: '300px' }}
          >
            {availableLanguages.map(lang => (
              <Option key={lang.code} value={lang.code}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography>{lang.nativeName}</Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    ({lang.name})
                  </Typography>
                </Box>
              </Option>
            ))}
          </Select>
          {isRTL && (
            <FormHelperText>
              {t(
                'localization.rtlNotice',
                'This language uses right-to-left (RTL) text direction',
              )}
            </FormHelperText>
          )}
        </FormControl>

        <Typography level='h3'>{t('localization.dateFormat')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('localization.dateFormatDescription')}
        </Typography>
        <FormControl>
          <Select
            value={dateFormat}
            onChange={(_, value) => setDateFormat(value)}
            sx={{ maxWidth: '300px' }}
          >
            {dateFormatOptions.map(option => (
              <Option key={option.value} value={option.value}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: 2,
                  }}
                >
                  <Typography>{option.label}</Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {sampleDate.format(option.value)}
                  </Typography>
                </Box>
              </Option>
            ))}
          </Select>
          <FormHelperText>
            {t('common:labels.preview')}: {sampleDate.format(dateFormat)}
          </FormHelperText>
        </FormControl>

        <Typography level='h3'>{t('localization.timeFormat')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('localization.timeFormatDescription')}
        </Typography>
        <FormControl>
          <Select
            value={timeFormat}
            onChange={(_, value) => setTimeFormat(value)}
            sx={{ maxWidth: '300px' }}
          >
            <Option value={TIME_FORMATS.HOUR_12}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 2,
                }}
              >
                <Typography>{t('localization.12hour')}</Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {sampleDate.format(TIME_FORMATS.HOUR_12)}
                </Typography>
              </Box>
            </Option>
            <Option value={TIME_FORMATS.HOUR_24}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 2,
                }}
              >
                <Typography>{t('localization.24hour')}</Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {sampleDate.format(TIME_FORMATS.HOUR_24)}
                </Typography>
              </Box>
            </Option>
          </Select>
          <FormHelperText>
            {t('common:labels.preview')}: {sampleDate.format(timeFormat)}
          </FormHelperText>
        </FormControl>

        <Typography level='h3'>{t('localization.firstDayOfWeek')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('localization.firstDayOfWeekDescription')}
        </Typography>
        <FormControl>
          <ButtonGroup variant='outlined'>
            <Button
              variant={firstDayOfWeek === 0 ? 'solid' : 'outlined'}
              onClick={() => setFirstDayOfWeek(0)}
            >
              {t('localization.sunday')}
            </Button>
            <Button
              variant={firstDayOfWeek === 1 ? 'solid' : 'outlined'}
              onClick={() => setFirstDayOfWeek(1)}
            >
              {t('localization.monday')}
            </Button>
            <Button
              variant={firstDayOfWeek === 6 ? 'solid' : 'outlined'}
              onClick={() => setFirstDayOfWeek(6)}
            >
              {t('localization.saturday')}
            </Button>
          </ButtonGroup>
        </FormControl>
      </div>
    </SettingsLayout>
  )
}

export default LocalizationSettings
