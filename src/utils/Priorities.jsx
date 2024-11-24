import {
  HorizontalRule,
  KeyboardControlKey,
  KeyboardDoubleArrowUp,
  PriorityHigh,
} from '@mui/icons-material'

const Priorities = [
  {
    name: 'P4',
    value: 4,
    icon: <HorizontalRule />,
    color: '',
  },
  {
    name: 'P3 ',
    value: 3,
    icon: <KeyboardControlKey />,
    color: '',
  },
  {
    name: 'P2',
    value: 2,
    icon: <KeyboardDoubleArrowUp />,
    color: 'warning',
  },
  {
    name: 'P1',
    value: 1,
    icon: <PriorityHigh />,
    color: 'danger',
  },
]

export default Priorities
