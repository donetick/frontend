import {
  Add,
  CalendarMonthOutlined,
  DeleteOutline,
  TitleOutlined,
} from '@mui/icons-material'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import NumberInput from '../../components/common/NumberInput'
import EditorSection from '../ChoreEdit/EditorSection'

// Keep the portable recurrence phrase as the source of truth. Unsupported
// interval shapes retain their text editor rather than being silently rewritten.
function TemplateScheduleField({ onChange, row }) {
  const { t } = useTranslation('chores')
  const name = row.title.replace(/\s*—\s*{{\s*item\s*}}/g, '')
  const interval = row.repeat?.match(
    /^every (?:(\d+) )?(day|week|month|year)s?$/i,
  )
  if (!interval)
    return (
      <FormControl>
        <FormLabel>{name}</FormLabel>
        <Input
          value={row.repeat ?? ''}
          onChange={event => onChange(event.target.value)}
        />
      </FormControl>
    )
  const count = Number(interval[1] || 1)
  const unit = interval[2].toLowerCase()
  const update = (nextCount, nextUnit) =>
    onChange(`every ${nextCount} ${nextUnit}${nextCount === 1 ? '' : 's'}`)
  return (
    <Stack spacing={1}>
      <Typography level='title-sm'>{name}</Typography>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography level='body-sm'>{t('templateLibrary.every')}</Typography>
        <NumberInput
          value={count}
          min={1}
          onValueChange={value => {
            if (Number.isSafeInteger(value) && value >= 1) update(value, unit)
          }}
          slotProps={{
            input: { 'aria-label': t('templateLibrary.intervalFor', { name }) },
          }}
          sx={{ width: 80, flexShrink: 0 }}
        />
        <Select
          aria-label={t('templateLibrary.unitFor', { name })}
          value={unit}
          onChange={(_, value) => {
            if (value) update(count, value)
          }}
          sx={{ flex: 1, minWidth: 0 }}
        >
          {['day', 'week', 'month', 'year'].map(value => (
            <Option key={value} value={value}>
              {t(`templateLibrary.units.${value}`, { count })}
            </Option>
          ))}
        </Select>
      </Stack>
    </Stack>
  )
}
TemplateScheduleField.propTypes = {
  onChange: PropTypes.func.isRequired,
  row: PropTypes.object.isRequired,
}

export default function TemplatePersonalization({
  children,
  guided,
  instances,
  onInstancesChange,
  onScheduleChange,
  onValueChange,
  template,
}) {
  const { t } = useTranslation('chores')
  const inputs = template.inputs
  const summary = instances
    .map(
      (values, index) =>
        String(values[inputs[0]?.name] ?? '').trim() ||
        t('templateLibrary.item', { number: index + 1 }),
    )
    .join(', ')
  return (
    <Box
      sx={{
        // Match the modal body gutters so sections span its full width while
        // EditorSection keeps the controls aligned with the rest of the content.
        alignSelf: 'center',
        width: {
          xs: 'calc(100% + 32px)',
          sm: 'calc(100% + 48px)',
        },
        '& > :last-child': { borderBottom: 0 },
      }}
    >
      <EditorSection
        section='template-items'
        title={t('templateLibrary.items')}
        error={instances.some(values =>
          inputs.some(
            input => input.required && !String(values[input.name] ?? '').trim(),
          ),
        )}
        icon={TitleOutlined}
        summary={summary}
        collapsible
        defaultOpen
      >
        <Stack spacing={2}>
          <Typography level='body-sm' textColor='text.tertiary'>
            {t('templateLibrary.instancesHint')}
          </Typography>
          {instances.map((values, instance) => (
            <Box
              key={instance}
              sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
            >
              <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                {instances.length > 1 && (
                  <Typography level='body-xs'>
                    {t('templateLibrary.item', { number: instance + 1 })}
                  </Typography>
                )}
                {inputs.map(input => {
                  const missing =
                    input.required && !String(values[input.name] ?? '').trim()
                  return (
                    <FormControl
                      key={input.name}
                      required={input.required}
                      error={missing}
                    >
                      <FormLabel>{input.label}</FormLabel>
                      <Input
                        value={values[input.name] ?? ''}
                        onChange={event =>
                          onValueChange(
                            instance,
                            input.name,
                            event.target.value,
                          )
                        }
                      />
                      {missing && (
                        <FormHelperText>
                          {t('templateLibrary.nameRequired')}
                        </FormHelperText>
                      )}
                      {!input.required && (
                        <FormHelperText>
                          {t('bulkImport.optional')}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )
                })}
              </Stack>
              {instances.length > 1 && (
                <IconButton
                  variant='plain'
                  color='danger'
                  aria-label={t('templateLibrary.removeItem', {
                    number: instance + 1,
                  })}
                  onClick={() =>
                    onInstancesChange(
                      instances.filter((_, index) => index !== instance),
                    )
                  }
                  sx={{ mt: 4.5 }}
                >
                  <DeleteOutline />
                </IconButton>
              )}
            </Box>
          ))}
          <Button
            size='sm'
            variant='plain'
            startDecorator={<Add />}
            sx={{ alignSelf: 'flex-start' }}
            onClick={() =>
              onInstancesChange([
                ...instances,
                Object.fromEntries(
                  inputs.map(input => [input.name, input.default]),
                ),
              ])
            }
          >
            {t('templateLibrary.addInstance')}
          </Button>
        </Stack>
      </EditorSection>
      {children}
      {guided && (
        <EditorSection
          section='template-schedules'
          title={t('templateLibrary.schedules')}
          icon={CalendarMonthOutlined}
          summary={t('templateLibrary.taskCount', {
            count: template.rows.length,
          })}
          collapsible
        >
          <Stack spacing={2.5}>
            <Typography level='body-sm' textColor='text.tertiary'>
              {t('templateLibrary.scheduleHint')}
            </Typography>
            {template.rows.map((row, index) => (
              <TemplateScheduleField
                key={index}
                row={row}
                onChange={value => onScheduleChange(index, value)}
              />
            ))}
          </Stack>
        </EditorSection>
      )}
    </Box>
  )
}
TemplatePersonalization.propTypes = {
  children: PropTypes.node,
  guided: PropTypes.bool,
  instances: PropTypes.array.isRequired,
  onInstancesChange: PropTypes.func.isRequired,
  onScheduleChange: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired,
  template: PropTypes.object.isRequired,
}
