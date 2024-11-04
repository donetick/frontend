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
  },
  {
    name: 'P3 ',
    value: 3,
    icon: <KeyboardControlKey />,
  },
  {
    name: 'P2',
    value: 2,
    icon: <KeyboardDoubleArrowUp />,
  },
  {
    name: 'P1',
    value: 1,
    icon: <PriorityHigh />,
  },
]

export default Priorities
