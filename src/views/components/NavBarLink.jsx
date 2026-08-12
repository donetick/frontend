import {
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
} from '@mui/joy'
import { Link } from 'react-router-dom'

const NavBarLink = ({ link }) => {
  const { to, icon, label, onClick } = link
  return (
    <ListItem>
      <ListItemButton
        key={to}
        {...(onClick ? { onClick } : { component: Link, to })}
        variant='plain'
        color='neutral'
        sx={{
          borderRadius: 4,
          py: 1.2,
        }}
      >
        <ListItemDecorator>{icon}</ListItemDecorator>
        <ListItemContent>{label}</ListItemContent>
      </ListItemButton>
    </ListItem>
  )
}

export default NavBarLink
