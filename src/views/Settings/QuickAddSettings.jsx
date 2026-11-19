import { Box, Switch, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import {
  QUICK_ADD_FIELDS,
  saveQuickAddMoreFields,
  useQuickAddMoreFields,
} from '../../utils/QuickAddFieldsPreference'
import SettingsLayout from './SettingsLayout'
import SettingsSection from './SettingsSection'

const QuickAddSettings = () => {
  const { t } = useTranslation('settings')
  const moreFields = useQuickAddMoreFields()

  return (
    <SettingsLayout title={t('layout.quickAddSettings.title')}>
      <Box sx={{ maxWidth: 680, pb: 4 }}>
        <Typography
          level='body-md'
          textColor='text.secondary'
          sx={{ maxWidth: 560, mb: 3, mt: -1, textWrap: 'pretty' }}
        >
          {t('layout.quickAddSettings.description')}
        </Typography>
        <SettingsSection
          title={t('layout.quickAddSettings.fieldsTitle')}
          description={t('layout.quickAddSettings.helper')}
        >
          {QUICK_ADD_FIELDS.map(field => {
            const inMore = moreFields.includes(field.id)
            const label = t(field.labelKey)
            const description = t(
              `layout.quickAddSettings.fieldDescriptions.${field.id}`,
            )
            return (
              <Box
                key={field.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='title-sm' id={`quick-add-${field.id}`}>
                    {label}
                  </Typography>
                  <Typography level='body-sm' textColor='text.secondary'>
                    {t(
                      inMore
                        ? 'layout.quickAddSettings.inMore'
                        : 'layout.quickAddSettings.inQuickAdd',
                    )}
                    {description ? ` · ${description}` : ''}
                  </Typography>
                </Box>
                <Switch
                  checked={!inMore}
                  onChange={event => {
                    const showInQuickAdd = event.target.checked
                    saveQuickAddMoreFields(
                      showInQuickAdd
                        ? moreFields.filter(id => id !== field.id)
                        : [...moreFields, field.id],
                    )
                  }}
                  color={!inMore ? 'primary' : 'neutral'}
                  slotProps={{
                    input: { 'aria-labelledby': `quick-add-${field.id}` },
                  }}
                  sx={{ flexShrink: 0 }}
                />
              </Box>
            )
          })}
        </SettingsSection>
        <Typography level='body-xs' textColor='text.tertiary' sx={{ mt: 2 }}>
          {t('layout.savedOnDevice')}
        </Typography>
      </Box>
    </SettingsLayout>
  )
}

export default QuickAddSettings
