import {
  Check,
  FilterAlt,
  FolderOpen,
  KeyboardArrowDown,
  Settings,
  Style,
} from '@mui/icons-material'
import {
  Avatar,
  Divider,
  Dropdown,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Typography,
} from '@mui/joy'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { getTextColorFromBackgroundColor } from '../../utils/Colors'
import { getIconComponent } from '../../utils/ProjectIcons'

const TYPE_CONFIG = {
  filter: {
    fallbackColor: '#64748b',
    headerKey: 'common:navigation.filters',
    manageKey: 'common:navigation.filters',
    managePath: '/filters',
  },
  label: {
    fallbackColor: '#64748b',
    headerKey: 'common:navigation.labels',
    manageKey: 'common:navigation.labels',
    managePath: '/labels',
  },
  project: {
    fallbackColor: '#1976d2',
    headerKey: 'projects:selector.title',
    manageKey: 'projects:selector.manage',
    managePath: '/projects',
  },
}

const ResourceAvatar = ({ isSelected, item, type }) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.project
  const color = item?.color || config.fallbackColor
  const iconColor = getTextColorFromBackgroundColor(color)
  let icon = <FolderOpen sx={{ color: iconColor, fontSize: 14 }} />

  if (type === 'project') {
    icon = createElement(getIconComponent(item?.icon || 'FolderOpen'), {
      sx: { color: iconColor, fontSize: 14 },
    })
  } else if (type === 'filter') {
    icon = <FilterAlt sx={{ color: iconColor, fontSize: 14 }} />
  } else if (type === 'label') {
    icon = <Style sx={{ color: iconColor, fontSize: 14 }} />
  }

  return (
    <Avatar
      size='sm'
      sx={{
        width: 26,
        height: 26,
        bgcolor: color,
        border: '2px solid',
        borderColor: isSelected ? color : 'background.surface',
        boxShadow: isSelected ? `0 0 0 1px ${color}` : 'sm',
        color: iconColor,
      }}
    >
      {icon}
    </Avatar>
  )
}

const NavBarResourceSwitcher = ({ selector, title }) => {
  const { t } = useTranslation(['common', 'projects', 'chores', 'filters'])
  const navigate = useNavigate()
  const { items, onSelect, selectedId, type } = selector
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.project
  const selectedItem = items.find(
    item => String(item.id) === String(selectedId),
  )

  const getItemName = item =>
    type === 'project' && item.id === 'default'
      ? t('chores:toolbar.defaultProject')
      : item.name

  const getItemDescription = item => {
    if (type === 'project' && item.id === 'default') {
      return t('projects:defaultDescription')
    }
    if (type === 'filter') {
      return t('filters:tasks', { count: item.count || 0 })
    }
    return null
  }

  return (
    <Dropdown>
      <MenuButton
        aria-label={`${t(config.headerKey)}: ${title}`}
        variant='plain'
        color='neutral'
        sx={{
          '--Button-gap': '10px',
          borderRadius: 'lg',
          flex: 1,
          fontWeight: 'lg',
          justifyContent: 'flex-start',
          minWidth: 0,
          px: 0.75,
          py: 0.5,
          '&:hover': { bgcolor: 'background.level1' },
        }}
      >
        <KeyboardArrowDown sx={{ fontSize: 20, color: 'text.tertiary' }} />
        {selectedItem &&
          !(type === 'project' && selectedItem.id === 'default') && (
            <ResourceAvatar item={selectedItem} type={type} />
          )}
        <Typography
          component='span'
          level='title-md'
          sx={{
            marginInlineStart: '10px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
      </MenuButton>

      <Menu
        placement='bottom-start'
        size='sm'
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          boxShadow:
            '0 12px 32px -8px rgba(0, 0, 0, 0.18), 0 2px 8px -2px rgba(0, 0, 0, 0.08)',
          maxHeight: 'min(64dvh, 440px)',
          minWidth: 'min(300px, calc(100vw - 16px))',
          overflowY: 'auto',
          p: 0.75,
          zIndex: 'var(--joy-zIndex-modal)',
        }}
      >
        <Typography
          level='body-xs'
          sx={{
            color: 'text.tertiary',
            fontWeight: 'xl',
            letterSpacing: '0.04em',
            px: 1.25,
            pt: 0.75,
            pb: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {t(config.headerKey)}
        </Typography>

        {items.map(item => {
          const isSelected = String(item.id) === String(selectedId)
          const description = getItemDescription(item)

          return (
            <MenuItem
              key={item.id}
              selected={isSelected}
              onClick={() => onSelect(item)}
              sx={{
                alignItems: 'center',
                borderRadius: '12px',
                gap: 1.75,
                minHeight: 52,
                mb: 0.25,
                px: 1.25,
                transition: 'background-color 120ms ease',
                ...(isSelected && {
                  bgcolor: 'primary.softBg',
                  '&:hover': { bgcolor: 'primary.softHoverBg' },
                }),
              }}
            >
              <ListItemDecorator sx={{ minInlineSize: 0 }}>
                <ResourceAvatar
                  isSelected={isSelected}
                  item={item}
                  type={type}
                />
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='title-sm' fontWeight='lg' noWrap>
                  {getItemName(item)}
                </Typography>
                {description && (
                  <Typography
                    level='body-xs'
                    noWrap
                    sx={{ color: 'text.tertiary' }}
                  >
                    {description}
                  </Typography>
                )}
              </ListItemContent>
              {isSelected && (
                <Check color='primary' sx={{ flexShrink: 0, fontSize: 18 }} />
              )}
            </MenuItem>
          )
        })}

        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => navigate(config.managePath)}
          sx={{
            alignItems: 'center',
            borderRadius: '12px',
            gap: 1.75,
            minHeight: 48,
            px: 1.25,
          }}
        >
          <ListItemDecorator sx={{ minInlineSize: 0 }}>
            <Avatar
              size='sm'
              variant='soft'
              color='neutral'
              sx={{ width: 26, height: 26, borderRadius: '8px' }}
            >
              <Settings sx={{ fontSize: 15 }} />
            </Avatar>
          </ListItemDecorator>
          <ListItemContent>
            <Typography level='title-sm' fontWeight='lg'>
              {t(config.manageKey)}
            </Typography>
          </ListItemContent>
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default NavBarResourceSwitcher
