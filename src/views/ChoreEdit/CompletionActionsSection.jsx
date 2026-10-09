import { Add, Delete } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { GetThings } from '../../utils/Fetcher'

export default function CompletionActionsSection({
  actions,
  onChange,
  onValidate,
  points,
  onPointsChange,
}) {
  const [things, setThings] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    GetThings()
      .then(response => {
        if (!response.ok) throw new Error('Unable to load Things')
        return response.json()
      })
      .then(data => {
        setThings(data.res || [])
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }, [])
  const isValid = action => {
    const thing = things.find(item => item.id === action.thingId)
    if (!thing || !['set', 'add'].includes(action.operation)) return false
    if (action.operation === 'add' && thing.type !== 'number') return false
    if (thing.type === 'number') return /^[+-]?\d+$/.test(action.value)
    if (thing.type === 'boolean')
      return ['true', 'false'].includes(action.value)
    return thing.type === 'text'
  }
  const hasPoints = points !== -1
  const pointsValid =
    !hasPoints || (Number.isInteger(points) && points >= 0 && points <= 1000)
  useEffect(() => {
    onValidate(
      pointsValid &&
        (actions.length === 0 ||
          (loaded && !loadError && actions.every(isValid))),
    )
  }, [actions, things, loaded, loadError, points])
  const update = (index, changes) =>
    onChange(
      actions.map((action, i) =>
        i === index ? { ...action, ...changes } : action,
      ),
    )
  return (
    <Box mb={3}>
      <Typography level='h4'>On completion</Typography>
      <Typography level='body-sm' mb={1}>
        Award points or change Things when this task is completed. Skipping or
        postponing does not run these actions.
      </Typography>
      {loadError && (
        <Typography color='danger'>
          Unable to load Things. Reload to try again.
        </Typography>
      )}
      {loaded && !loadError && things.length === 0 && (
        <Typography level='body-sm'>
          Create a Thing on the Things page to add Thing actions.
        </Typography>
      )}
      {hasPoints && (
        <Card variant='outlined' sx={{ mb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography level='title-md'>Award points</Typography>
            <IconButton
              aria-label='Remove points action'
              onClick={() => onPointsChange(-1)}
            >
              <Delete />
            </IconButton>
          </Box>
          <FormControl error={!pointsValid}>
            <FormLabel>Points</FormLabel>
            <Input
              type='number'
              value={points}
              slotProps={{ input: { min: 0, max: 1000, step: 1 } }}
              onChange={event =>
                onPointsChange(
                  event.target.value === '' ? '' : Number(event.target.value),
                )
              }
            />
            <FormHelperText>
              {pointsValid
                ? 'Awarded to the user who completes the task, after approval when required.'
                : 'Enter a whole number from 0 to 1000.'}
            </FormHelperText>
          </FormControl>
        </Card>
      )}
      {actions.map((action, index) => {
        const thing = things.find(item => item.id === action.thingId)
        return (
          <Card key={index} variant='outlined' sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Thing</FormLabel>
                <Select
                  value={action.thingId || null}
                  placeholder='Select a Thing'
                  onChange={(_, id) => {
                    if (id == null) return
                    const selected = things.find(item => item.id === id)
                    update(index, {
                      thingId: id,
                      operation: 'set',
                      value:
                        selected?.type === 'boolean'
                          ? 'false'
                          : selected?.type === 'number'
                            ? '0'
                            : '',
                    })
                  }}
                >
                  {things.map(item => (
                    <Option key={item.id} value={item.id}>
                      {item.name}
                    </Option>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                aria-label='Remove completion action'
                onClick={() => onChange(actions.filter((_, i) => i !== index))}
              >
                <Delete />
              </IconButton>
            </Box>
            <FormControl>
              <FormLabel>Action</FormLabel>
              <Select
                value={action.operation}
                onChange={(_, operation) => {
                  if (operation) update(index, { operation })
                }}
              >
                <Option value='set'>Set value</Option>
                <Option value='add' disabled={thing?.type !== 'number'}>
                  Increase / decrease
                </Option>
              </Select>
            </FormControl>
            <FormControl error={loaded && !isValid(action)}>
              <FormLabel>
                {action.operation === 'add' ? 'Amount' : 'Value'}
              </FormLabel>
              {thing?.type === 'boolean' ? (
                <Select
                  value={action.value}
                  onChange={(_, value) => update(index, { value })}
                >
                  <Option value='false'>False</Option>
                  <Option value='true'>True</Option>
                </Select>
              ) : (
                <Input
                  type={thing?.type === 'number' ? 'number' : 'text'}
                  value={action.value}
                  onChange={event =>
                    update(index, { value: event.target.value })
                  }
                />
              )}
              {action.operation === 'add' && (
                <FormHelperText>
                  Use a negative amount to decrease the value.
                </FormHelperText>
              )}
              {loaded && !isValid(action) && (
                <FormHelperText>
                  Select a Thing and enter a valid value.
                </FormHelperText>
              )}
            </FormControl>
          </Card>
        )
      })}
      <Dropdown>
        <MenuButton
          slots={{ root: Button }}
          slotProps={{
            root: { variant: 'outlined', size: 'sm', startDecorator: <Add /> },
          }}
        >
          Add action
        </MenuButton>
        <Menu>
          <MenuItem disabled={hasPoints} onClick={() => onPointsChange(1)}>
            Award points
          </MenuItem>
          <MenuItem
            disabled={
              !loaded || loadError || !things.length || actions.length >= 20
            }
            onClick={() =>
              onChange([
                ...actions,
                { thingId: 0, operation: 'set', value: '' },
              ])
            }
          >
            Change a Thing
          </MenuItem>
        </Menu>
      </Dropdown>
    </Box>
  )
}
