import {
  AccountBalance,
  Book,
  Build,
  BusinessCenter,
  Code,
  Computer,
  DirectionsCar,
  FitnessCenter,
  Flight,
  FolderOpen,
  Games,
  Home,
  LocalHospital,
  MusicNote,
  Palette,
  Pets,
  PhotoCamera,
  Restaurant,
  School,
  Science,
  ShoppingCart,
  SportsSoccer,
  Work,
  Yard,
} from '@mui/icons-material'

const PROJECT_ICONS = [
  { name: 'Folder', icon: FolderOpen, value: 'FolderOpen' },
  { name: 'Work', icon: Work, value: 'Work' },
  { name: 'Home', icon: Home, value: 'Home' },
  { name: 'School', icon: School, value: 'School' },
  { name: 'Business', icon: BusinessCenter, value: 'BusinessCenter' },
  { name: 'Code', icon: Code, value: 'Code' },
  { name: 'Build', icon: Build, value: 'Build' },
  { name: 'Design', icon: Palette, value: 'Palette' },
  { name: 'Sports', icon: SportsSoccer, value: 'SportsSoccer' },
  { name: 'Fitness', icon: FitnessCenter, value: 'FitnessCenter' },
  { name: 'Shopping', icon: ShoppingCart, value: 'ShoppingCart' },
  { name: 'Food', icon: Restaurant, value: 'Restaurant' },
  { name: 'Travel', icon: Flight, value: 'Flight' },
  { name: 'Study', icon: Book, value: 'Book' },
  { name: 'Music', icon: MusicNote, value: 'MusicNote' },
  { name: 'Photo', icon: PhotoCamera, value: 'PhotoCamera' },
  { name: 'Games', icon: Games, value: 'Games' },
  { name: 'Science', icon: Science, value: 'Science' },
  { name: 'Finance', icon: AccountBalance, value: 'AccountBalance' },
  { name: 'Health', icon: LocalHospital, value: 'LocalHospital' },
  { name: 'Auto', icon: DirectionsCar, value: 'DirectionsCar' },
  { name: 'Pets', icon: Pets, value: 'Pets' },
  { name: 'Garden', icon: Yard, value: 'Garden' },
  { name: 'Tech', icon: Computer, value: 'Computer' },
]

export default PROJECT_ICONS

export const getIconComponent = iconValue => {
  const iconData = PROJECT_ICONS.find(icon => icon.value === iconValue)
  return iconData ? iconData.icon : FolderOpen
}
