import {
  useLocalization,
  DATE_FORMATS,
  TIME_FORMATS,
} from '@/contexts/LocalizationContext'
import { LanguageOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
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
  const { t } = useTranslation('settings')
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
    <SettingsLayout title="Localization">
      <div className='grid gap-4'>
        <Typography level='body-md'>
          {t('localization.description')}
        </Typography>

        <Card variant='outlined' sx={{ p: 3, mb: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LanguageOutlined />
              <Typography level='title-md'>
                {t('localization.language')}
              </Typography>
            </Box>
            <Typography level='body-sm' sx={{ mb: 2 }}>
              {t('localization.languageDescription')}
            </Typography>
            <FormControl>
              <Select
                value={language}
                onChange={(_, value) => setLanguage(value)}
                sx={{ minWidth: 250 }}
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
                  This language uses right-to-left (RTL) text direction
                </FormHelperText>
              )}
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography level='title-md' sx={{ mb: 1 }}>
              {t('localization.dateFormat')}
            </Typography>
            <Typography level='body-sm' sx={{ mb: 2 }}>
              {t('localization.dateFormatDescription')}
            </Typography>
            <FormControl>
              <Select
                value={dateFormat}
                onChange={(_, value) => setDateFormat(value)}
                sx={{ minWidth: 250 }}
              >
                {dateFormatOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                      <Typography>{option.label}</Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                        {sampleDate.format(option.value)}
                      </Typography>
                    </Box>
                  </Option>
                ))}
              </Select>
              <FormHelperText>
                Preview: {sampleDate.format(dateFormat)}
              </FormHelperText>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography level='title-md' sx={{ mb: 1 }}>
              {t('localization.timeFormat')}
            </Typography>
            <Typography level='body-sm' sx={{ mb: 2 }}>
              {t('localization.timeFormatDescription')}
            </Typography>
            <FormControl>
              <Select
                value={timeFormat}
                onChange={(_, value) => setTimeFormat(value)}
                sx={{ minWidth: 250 }}
              >
                <Option value={TIME_FORMATS.HOUR_12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                    <Typography>{t('localization.12hour')}</Typography>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {sampleDate.format(TIME_FORMATS.HOUR_12)}
                    </Typography>
                  </Box>
                </Option>
                <Option value={TIME_FORMATS.HOUR_24}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                    <Typography>{t('localization.24hour')}</Typography>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {sampleDate.format(TIME_FORMATS.HOUR_24)}
                    </Typography>
                  </Box>
                </Option>
              </Select>
              <FormHelperText>
                Preview: {sampleDate.format(timeFormat)}
              </FormHelperText>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography level='title-md' sx={{ mb: 1 }}>
              {t('localization.firstDayOfWeek')}
            </Typography>
            <Typography level='body-sm' sx={{ mb: 2 }}>
              {t('localization.firstDayOfWeekDescription')}
            </Typography>
            <FormControl>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
              </Box>
            </FormControl>
          </Box>
        </Card>
      </div>
    </SettingsLayout>
  )
}

export default LocalizationSettings
