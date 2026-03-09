export const TIME_UNITS = [
  { label: 'Mins', value: 'm', seconds: 60 },
  { label: 'Hours', value: 'h', seconds: 3600 },
  { label: 'Days', value: 'd', seconds: 86400 },
]

export function secondsToValueAndUnit(totalSeconds) {
  if (totalSeconds % 86400 === 0)
    return { value: totalSeconds / 86400, unit: 'd' }
  if (totalSeconds % 3600 === 0)
    return { value: totalSeconds / 3600, unit: 'h' }
  return { value: Math.round(totalSeconds / 60), unit: 'm' }
}

export function valueAndUnitToSeconds(value, unit) {
  const unitInfo = TIME_UNITS.find(u => u.value === unit)
  return value * (unitInfo?.seconds ?? 1)
}
