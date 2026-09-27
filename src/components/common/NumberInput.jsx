import { Input } from '@mui/joy'
import PropTypes from 'prop-types'
import { useState } from 'react'

const toDraft = value =>
  value === null || value === undefined ? '' : String(value)

/**
 * Number input that keeps its editable text locally, so users can temporarily
 * clear the field before entering a replacement value. Valid values are
 * emitted while typing and the final value is normalized on blur.
 */
const NumberInput = ({
  allowEmpty = false,
  emptyValue = null,
  fallbackValue,
  integer = true,
  max,
  min,
  onBlur,
  onFocus,
  onValueChange,
  selectOnFocus = false,
  slotProps,
  step = integer ? 1 : 'any',
  value,
  ...props
}) => {
  const [draftState, setDraftState] = useState({
    sourceValue: value,
    value: toDraft(value),
  })

  if (!Object.is(draftState.sourceValue, value)) {
    setDraftState({ sourceValue: value, value: toDraft(value) })
  }

  const draft = draftState.value
  const setDraft = next => {
    setDraftState({ sourceValue: value, value: next })
  }

  const parse = raw => {
    if (raw.trim() === '') return null

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null

    return integer ? Math.trunc(parsed) : parsed
  }

  const normalize = raw => {
    let next = parse(raw)

    if (next === null) {
      const fallback = fallbackValue ?? min ?? 0
      next = integer ? Math.trunc(Number(fallback)) : Number(fallback)
    }

    if (min !== null && min !== undefined) next = Math.max(min, next)
    if (max !== null && max !== undefined) next = Math.min(max, next)

    return next
  }

  const handleChange = event => {
    const raw = event.target.value
    setDraft(raw)

    if (raw === '' && allowEmpty) {
      onValueChange(emptyValue)
      return
    }

    const parsed = parse(raw)
    if (parsed !== null) onValueChange(parsed)
  }

  const handleBlur = event => {
    if (draft === '' && allowEmpty) {
      onBlur?.(event)
      return
    }

    const next = normalize(draft)
    setDraft(String(next))
    onValueChange(next)
    onBlur?.(event)
  }

  return (
    <Input
      {...props}
      type='number'
      value={draft}
      onChange={handleChange}
      onFocus={event => {
        if (selectOnFocus) event.target.select()
        onFocus?.(event)
      }}
      onBlur={handleBlur}
      slotProps={{
        ...slotProps,
        input: {
          ...slotProps?.input,
          min,
          max,
          step,
        },
      }}
    />
  )
}

NumberInput.propTypes = {
  allowEmpty: PropTypes.bool,
  emptyValue: PropTypes.any,
  fallbackValue: PropTypes.number,
  integer: PropTypes.bool,
  max: PropTypes.number,
  min: PropTypes.number,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  onValueChange: PropTypes.func.isRequired,
  selectOnFocus: PropTypes.bool,
  slotProps: PropTypes.object,
  step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

export default NumberInput
