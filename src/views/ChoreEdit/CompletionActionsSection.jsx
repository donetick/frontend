import { Add, Delete } from '@mui/icons-material'
import { Box, Button, Card, FormControl, FormHelperText, FormLabel, IconButton, Input, Option, Select, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { GetThings } from '../../utils/Fetcher'

export default function CompletionActionsSection({ actions, onChange, onValidate }) {
  const [things, setThings] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    GetThings().then(response => {
      if (!response.ok) throw new Error('Unable to load Things')
      return response.json()
    }).then(data => { setThings(data.res || []); setLoaded(true) })
      .catch(() => { setLoadError(true); setLoaded(true) })
  }, [])
  const isValid = action => {
    const thing = things.find(item => item.id === action.thingId)
    if (!thing || !['set', 'add'].includes(action.operation)) return false
    if (action.operation === 'add' && thing.type !== 'number') return false
    if (thing.type === 'number') return /^[+-]?\d+$/.test(action.value)
    if (thing.type === 'boolean') return ['true', 'false'].includes(action.value)
    return thing.type === 'text'
  }
  useEffect(() => { onValidate(actions.length === 0 || (loaded && !loadError && actions.every(isValid))) }, [actions, things, loaded, loadError])
  const update = (index, changes) => onChange(actions.map((action, i) => i === index ? { ...action, ...changes } : action))
  return <Box mb={3}>
    <Typography level='h4'>On completion</Typography>
    <Typography level='body-sm' mb={1}>Change Things when this task is completed. Actions run in order; skipping or postponing does not run them.</Typography>
    {loadError && <Typography color='danger'>Unable to load Things. Reload to try again.</Typography>}
    {loaded && !loadError && things.length === 0 && <Typography level='body-sm'>Create a Thing on the Things page to add an action.</Typography>}
    {actions.map((action, index) => {
      const thing = things.find(item => item.id === action.thingId)
      return <Card key={index} variant='outlined' sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Thing</FormLabel>
            <Select value={action.thingId || null} placeholder='Select a Thing'
              onChange={(_, id) => {
                if (id == null) return
                const selected = things.find(item => item.id === id)
                update(index, { thingId: id, operation: 'set', value: selected?.type === 'boolean' ? 'false' : selected?.type === 'number' ? '0' : '' })
              }}>
              {things.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
            </Select>
          </FormControl>
          <IconButton aria-label='Remove completion action' onClick={() => onChange(actions.filter((_, i) => i !== index))}><Delete /></IconButton>
        </Box>
        <FormControl>
          <FormLabel>Action</FormLabel>
          <Select value={action.operation} onChange={(_, operation) => { if (operation) update(index, { operation }) }}>
            <Option value='set'>Set value</Option>
            <Option value='add' disabled={thing?.type !== 'number'}>Increase / decrease</Option>
          </Select>
        </FormControl>
        <FormControl error={loaded && !isValid(action)}>
          <FormLabel>{action.operation === 'add' ? 'Amount' : 'Value'}</FormLabel>
          {thing?.type === 'boolean' ? <Select value={action.value} onChange={(_, value) => update(index, { value })}>
            <Option value='false'>False</Option><Option value='true'>True</Option>
          </Select> : <Input type={thing?.type === 'number' ? 'number' : 'text'} value={action.value}
            onChange={event => update(index, { value: event.target.value })} />}
          {action.operation === 'add' && <FormHelperText>Use a negative amount to decrease the value.</FormHelperText>}
          {loaded && !isValid(action) && <FormHelperText>Select a Thing and enter a valid value.</FormHelperText>}
        </FormControl>
      </Card>
    })}
    <Button variant='outlined' size='sm' startDecorator={<Add />} disabled={!loaded || loadError || !things.length || actions.length >= 20}
      onClick={() => onChange([...actions, { thingId: 0, operation: 'set', value: '' }])}>Add action</Button>
  </Box>
}
