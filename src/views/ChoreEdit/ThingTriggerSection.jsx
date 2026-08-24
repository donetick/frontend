import { Widgets } from '@mui/icons-material'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  Input,
  Option,
  Select,
  TextField,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
const isValidTrigger = (thing, condition, triggerState) => {
  const newErrors = {}
  if (!thing || !triggerState) {
    newErrors.thing = 'Please select a thing and trigger state'
    return false
  }
  if (thing.type === 'boolean') {
    if (['true', 'false'].includes(triggerState)) {
      return true
    } else {
      newErrors.type = 'Boolean type does not require a condition'
      return false
    }
  }
  if (thing.type === 'number') {
    if (isNaN(triggerState)) {
      newErrors.triggerState = 'Trigger state must be a number'
      return false
    }
    if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(condition)) {
      return true
    }
  }
  if (thing.type === 'text') {
    if (typeof triggerState === 'string') {
      return true
    }
  }
  newErrors.triggerState = 'Trigger state must be a number'

  return false
}

const ThingTriggerSection = ({
  isAttepmtingToSave,
  onTriggerUpdate,
  onValidate,
  selected,
  things,
}) => {
  const { t } = useTranslation('chores')
  const [selectedThing, setSelectedThing] = useState(null)
  const [condition, setCondition] = useState(null)
  const [triggerState, setTriggerState] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (selected) {
      setSelectedThing(things?.find(t => t.id === selected.thingId))
      setCondition(selected.condition)
      setTriggerState(selected.triggerState)
    }
  }, [things])

  useEffect(() => {
    if (selectedThing && triggerState) {
      onTriggerUpdate({
        thing: selectedThing,
        condition: condition,
        triggerState: triggerState,
      })
    }
    if (isValidTrigger(selectedThing, condition, triggerState)) {
      onValidate(true)
    } else {
      onValidate(false)
    }
  }, [selectedThing, condition, triggerState])

  return (
    <Card sx={{ mt: 1 }}>
      <Typography level='h5'>{t('thing.triggerHint')}</Typography>
      {things?.length === 0 && (
        <Typography level='body-sm'>
          {t('thing.noThingsMessage')}
          <Button
            startDecorator={<Widgets />}
            size='sm'
            onClick={() => {
              navigate('/things')
            }}
          >
            {t('thing.goToThings')}
          </Button>{' '}
          {t('thing.noThingsSuffix')}
        </Typography>
      )}
      <FormControl error={isAttepmtingToSave && !selectedThing}>
        <Autocomplete
          options={things}
          value={selectedThing}
          onChange={(e, newValue) => setSelectedThing(newValue)}
          getOptionLabel={option => option.name}
          renderOption={(props, option) => (
            <Box {...props}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                }}
              >
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <Typography level='body-lg' textColor='primary'>
                    {option.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography level='body2' textColor='text.secondary'>
                    <Chip>{t('thing.typeChip', { type: option.type })}</Chip>{' '}
                    <Chip>{t('thing.stateChip', { state: option.state })}</Chip>
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
          renderInput={params => (
            <TextField {...params} label={t('thing.selectThing')} />
          )}
        />
      </FormControl>
      <Typography level='body-sm'>{t('thing.conditionHint')}</Typography>
      {selectedThing?.type == 'boolean' && (
        <Box>
          <Typography level='body-sm'>
            {t('thing.stateChangeHint', { name: selectedThing.name })}
          </Typography>
          <Select
            value={triggerState}
            onChange={e => {
              if (e?.target.value === 'true' || e?.target.value === 'false')
                setTriggerState(e.target.value)
              else setTriggerState('false')
            }}
          >
            <Option value='true' onClick={() => setTriggerState('true')}>
              {t('thing.boolTrue')}
            </Option>
            <Option value='false' onClick={() => setTriggerState('false')}>
              {t('thing.boolFalse')}
            </Option>
          </Select>
        </Box>
      )}
      {selectedThing?.type == 'number' && (
        <Box>
          <Typography level='body-sm'>
            {t('thing.stateChangeHint', { name: selectedThing.name })}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, direction: 'row' }}>
            <Typography level='body-sm'>{t('thing.stateIs')}</Typography>
            <Select value={condition} sx={{ width: '50%' }}>
              {[
                { name: t('thing.conditions.eq'), value: 'eq' },
                { name: t('thing.conditions.neq'), value: 'neq' },
                { name: t('thing.conditions.gt'), value: 'gt' },
                { name: t('thing.conditions.gte'), value: 'gte' },
                { name: t('thing.conditions.lt'), value: 'lt' },
                { name: t('thing.conditions.lte'), value: 'lte' },
              ].map(condition => (
                <Option
                  key={condition.value}
                  value={condition.value}
                  onClick={() => setCondition(condition.value)}
                >
                  {condition.name}
                </Option>
              ))}
            </Select>
            <Input
              type='number'
              value={triggerState}
              onChange={e => setTriggerState(e.target.value)}
              sx={{ width: '50%' }}
            />
          </Box>
        </Box>
      )}
      {selectedThing?.type == 'text' && (
        <Box>
          <Typography level='body-sm'>
            {t('thing.stateChangeHint', { name: selectedThing.name })}
          </Typography>

          <Input
            value={triggerState}
            onChange={e => setTriggerState(e.target.value)}
            label={t('thing.enterText')}
          />
        </Box>
      )}
    </Card>
  )
}

export default ThingTriggerSection
