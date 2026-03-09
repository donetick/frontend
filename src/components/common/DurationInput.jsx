import { Add, Remove } from '@mui/icons-material'
import { Box, IconButton, Input, Option, Select } from '@mui/joy'
import { useEffect, useState } from 'react'
import {
  secondsToValueAndUnit,
  TIME_UNITS,
  valueAndUnitToSeconds,
} from '../../utils/DurationUtils'

/**
 * A reusable duration picker: [−] number [+] unit-select
 *
 * Props:
 *   value    – duration in seconds (positive integer)
 *   onChange – called with new duration in seconds
 *   size     – Joy UI size ('sm' | 'md')
 *   minValue – minimum numeric value (default 1)
 */
const DurationInput = ({ value, onChange, size = 'md', minValue = 1 }) => {
  const derived =
    value != null && value >= 0
      ? secondsToValueAndUnit(value)
      : { value: 1, unit: 'h' }
  const [displayValue, setDisplayValue] = useState(derived.value)
  const [unit, setUnit] = useState(derived.unit)

  useEffect(() => {
    if (value != null && value >= 0) {
      const { value: v, unit: u } = secondsToValueAndUnit(value)
      setDisplayValue(v)
      setUnit(u)
    }
  }, [value])

  const emit = (v, u) => {
    onChange(valueAndUnitToSeconds(v, u))
  }

  const handleDecrement = () => {
    const next = Math.max(minValue, displayValue - 1)
    setDisplayValue(next)
    emit(next, unit)
  }

  const handleIncrement = () => {
    const next = displayValue + 1
    setDisplayValue(next)
    emit(next, unit)
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <IconButton
        size={size}
        variant='outlined'
        color='neutral'
        onClick={handleDecrement}
        disabled={displayValue <= minValue}
      >
        <Remove fontSize='small' />
      </IconButton>

      <Input
        type='number'
        value={displayValue}
        size={size}
        slotProps={{ input: { min: minValue } }}
        sx={{ maxWidth: 70, textAlign: 'center' }}
        onChange={e => {
          const v = Math.max(minValue, parseInt(e.target.value) || minValue)
          setDisplayValue(v)
          emit(v, unit)
        }}
      />

      <IconButton
        size={size}
        variant='outlined'
        color='neutral'
        onClick={handleIncrement}
      >
        <Add fontSize='small' />
      </IconButton>

      <Select
        value={unit}
        size={size}
        sx={{ minWidth: 90, ml: 0.5 }}
        onChange={(_, newUnit) => {
          setUnit(newUnit)
          emit(displayValue, newUnit)
        }}
      >
        {TIME_UNITS.map(u => (
          <Option key={u.value} value={u.value}>
            {u.label}
          </Option>
        ))}
      </Select>
    </Box>
  )
}

export default DurationInput
