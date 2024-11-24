const LABEL_COLORS = [
  { name: 'Default', value: '#FFFFFF' },
  { name: 'Salmon', value: '#ff7961' },
  { name: 'Teal', value: '#26a69a' },
  { name: 'Sky Blue', value: '#80d8ff' },
  { name: 'Grape', value: '#7e57c2' },
  { name: 'Sunshine', value: '#ffee58' },
  { name: 'Coral', value: '#ff7043' },
  { name: 'Lavender', value: '#ce93d8' },
  { name: 'Rose', value: '#f48fb1' },
  { name: 'Charcoal', value: '#616161' },
  { name: 'Sienna', value: '#8d6e63' },
  { name: 'Mint', value: '#a7ffeb' },
  { name: 'Amber', value: '#ffc107' },
  { name: 'Cobalt', value: '#3f51b5' },
  { name: 'Emerald', value: '#4caf50' },
  { name: 'Peach', value: '#ffab91' },
  { name: 'Ocean', value: '#0288d1' },
  { name: 'Mustard', value: '#ffca28' },
  { name: 'Ruby', value: '#d32f2f' },
  { name: 'Periwinkle', value: '#b39ddb' },
  { name: 'Turquoise', value: '#00bcd4' },
  { name: 'Lime', value: '#cddc39' },
  { name: 'Blush', value: '#f8bbd0' },
  { name: 'Ash', value: '#90a4ae' },
  { name: 'Sand', value: '#d7ccc8' },
]

export default LABEL_COLORS

export const getTextColorFromBackgroundColor = bgColor => {
  if (!bgColor) return ''
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#ffffff'
}
