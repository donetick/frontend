import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { customDueDateBounds } from '../../../utils/CustomDueDate'

const CustomDueDateFields = ({ onChange, value }) => {
  const { t } = useTranslation('chores')
  const relative = value.mode === 'relative'
  const key = 'filterBuilder.customDueDate'
  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <FormControl>
        <FormLabel>{t(`${key}.mode`)}</FormLabel>
        <Select
          value={value.mode}
          onChange={(_, mode) => {
            if (mode)
              onChange({
                mode,
                start: mode === 'relative' ? 0 : '',
                end: mode === 'relative' ? 14 : '',
              })
          }}
        >
          <Option value='relative'>{t(`${key}.relative`)}</Option>
          <Option value='fixed'>{t(`${key}.fixed`)}</Option>
        </Select>
      </FormControl>
      <Typography level='body-xs'>
        {t(`${key}.${relative ? 'relativeHint' : 'fixedHint'}`)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {['start', 'end'].map(bound => (
          <FormControl key={bound} sx={{ flex: '1 1 140px' }}>
            <FormLabel>{t(`${key}.${bound}`)}</FormLabel>
            <Input
              type={relative ? 'number' : 'date'}
              value={value[bound]}
              slotProps={{
                input: relative ? { min: -36500, max: 36500, step: 1 } : {},
              }}
              onChange={event =>
                onChange({
                  ...value,
                  [bound]:
                    relative && event.target.value !== ''
                      ? Number(event.target.value)
                      : event.target.value,
                })
              }
            />
          </FormControl>
        ))}
      </Box>
      {!customDueDateBounds(value) && (
        <Typography role='alert' color='danger' level='body-sm'>
          {t(`${key}.invalid`)}
        </Typography>
      )}
    </Box>
  )
}

export default CustomDueDateFields
