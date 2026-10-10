import { Widgets } from '@mui/icons-material'
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  Input,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import NumberInput from '../../components/common/NumberInput'

const hasValue = value => value !== null && value !== undefined && value !== ''

const isValidTrigger = (thing, condition, triggerState) => {
  const newErrors = {}
  if (!thing || !hasValue(triggerState)) {
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
  const [thingSearch, setThingSearch] = useState('')
  const [condition, setCondition] = useState(null)
  const [triggerState, setTriggerState] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (selected) {
      setSelectedThing(
        things?.find(t => t.id === (selected.thingId ?? selected.thingID)),
      )
      setCondition(selected.condition)
      setTriggerState(selected.triggerState)
    }
  }, [things])

  useEffect(() => {
    setThingSearch(selectedThing?.name || '')
  }, [selectedThing])

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
    <Box sx={{ mt: 2 }}>
      {things?.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography level='body-sm'>
            Create a Thing to use it as a task trigger.
          </Typography>
          <Button
            startDecorator={<Widgets />}
            size='sm'
            variant='soft'
            onClick={() => navigate('/things')}
          >
            Go to Things
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
              alignItems: 'start',
            }}
          >
            <FormControl error={isAttepmtingToSave && !selectedThing}>
              <Typography level='h4'>Thing</Typography>
              <Autocomplete
                aria-label='Trigger Thing'
                options={things}
                value={selectedThing}
                inputValue={thingSearch}
                onInputChange={(_, value, reason) => setThingSearch(reason === 'input' ? value : selectedThing?.name || '')}
                onChange={(_, value) => setSelectedThing(value)}
                getOptionLabel={option => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                placeholder='Select a Thing'
              />
            </FormControl>
            {selectedThing?.type === 'boolean' && (
              <FormControl>
                <Typography level='h4'>Becomes</Typography>
                <Select
                  aria-label='Trigger state'
                  value={triggerState}
                  onChange={(_, value) => setTriggerState(value)}
                >
                  <Option value='true'>True</Option>
                  <Option value='false'>False</Option>
                </Select>
              </FormControl>
            )}
            {selectedThing?.type === 'text' && (
              <FormControl>
                <Typography level='h4'>Matches text</Typography>
                <Input
                  aria-label='Trigger text'
                  value={triggerState || ''}
                  onChange={e => setTriggerState(e.target.value)}
                />
              </FormControl>
            )}
            {selectedThing?.type === 'number' && (
              <FormControl>
                <Typography level='h4'>Condition</Typography>
                <Box sx={{ display: 'flex', gap: 1, minWidth: 0 }}>
                  <Select
                    aria-label='Trigger condition'
                    value={condition}
                    onChange={(_, value) => setCondition(value)}
                    sx={{ flex: 1 }}
                  >
                    {[
                      { name: 'Equal to', value: 'eq' },
                      { name: 'Not equal to', value: 'neq' },
                      { name: 'Greater than', value: 'gt' },
                      { name: 'At least', value: 'gte' },
                      { name: 'Less than', value: 'lt' },
                      { name: 'At most', value: 'lte' },
                    ].map(item => (
                      <Option key={item.value} value={item.value}>
                        {item.name}
                      </Option>
                    ))}
                  </Select>
                  <Input
                    aria-label='Trigger value'
                    type='number'
                    value={triggerState || ''}
                    onChange={e => setTriggerState(e.target.value)}
                    sx={{ width: 88 }}
                  />
                </Box>
              </FormControl>
            )}
          </Box>
          <Typography
            level='body-sm'
            textColor='text.tertiary'
            sx={{ mt: 1.5 }}
          >
            The task becomes due when this condition is met.
          </Typography>
        </>
      )}
    </Box>
  )
}

export default ThingTriggerSection
