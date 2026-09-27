import {
  ListItem,
  ListItemButton,
  ListItemDecorator,
  Tooltip,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { Link, useLocation } from 'react-router-dom'

const NavBarLink = ({ compact = false, link }) => {
  const { exact, icon, label, onClick, to } = link
  const { pathname } = useLocation()
  const active = Boolean(
    to &&
    (exact
      ? pathname === to
      : pathname === to || pathname.startsWith(`${to}/`)),
  )

  return (
    <ListItem sx={{ justifyContent: compact ? 'center' : 'flex-start', p: 0 }}>
      <Tooltip title={compact ? label : ''} placement='right'>
        <ListItemButton
          {...(onClick ? { onClick } : { component: Link, to })}
          aria-current={active ? 'page' : undefined}
          aria-label={compact ? label : undefined}
          variant={active ? 'soft' : 'plain'}
          color={active ? 'primary' : 'neutral'}
          sx={{
            borderRadius: 'md',
            fontFamily: 'var(--joy-fontFamily-body)',
            gap: compact ? 0 : undefined,
            justifyContent: compact ? 'center' : 'flex-start',
            minHeight: 48,
            mx: compact ? 'auto' : 0,
            px: compact ? 0 : 1.5,
            width: compact ? 48 : '100%',
            py: 1,
            transition: 'background-color 160ms ease, color 160ms ease',
            '& .MuiListItemDecorator-root': {
              color: active ? 'primary.plainColor' : 'text.tertiary',
              marginInlineEnd: compact ? '0 !important' : undefined,
              minInlineSize: compact ? 0 : 34,
            },
            '& svg': { fontSize: 21 },
          }}
        >
          <ListItemDecorator>{icon}</ListItemDecorator>
          {!compact && (
            <Typography level='body-sm' sx={{ fontWeight: 400 }}>
              {label}
            </Typography>
          )}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  )
}

NavBarLink.propTypes = {
  compact: PropTypes.bool,
  link: PropTypes.shape({
    exact: PropTypes.bool,
    icon: PropTypes.node.isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    to: PropTypes.string,
  }).isRequired,
}

export default NavBarLink
