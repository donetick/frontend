import { ArrowBack, KeyboardArrowRight } from '@mui/icons-material'
import {
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Typography,
} from '@mui/joy'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MOTION } from '../../constants/motion'
import { useResponsiveQuery } from '../../hooks/useResponsiveQuery'
import { useSwipeBack } from '../../hooks/useSwipeBack'
import PanelTransition from '../animations/PanelTransition'
import AppModal from './AppModal'

const ROOT_PANEL = 'actions'

// Animate opacity only: Popper owns the menu's transform for positioning.
const menuRevealSx = {
  animation: `action-menu-reveal ${MOTION.popup}ms ${MOTION.easeOut}`,
  '@keyframes action-menu-reveal': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}

// Popper's default tethering keeps a popup close to its trigger even when that
// leaves part of a tall menu off-screen. These modifiers prefer another side,
// then allow the popup to shift within the viewport before scrolling is needed.
const MENU_POSITION_MODIFIERS = [
  {
    name: 'flip',
    options: {
      fallbackPlacements: ['top-end', 'bottom-start', 'top-start'],
      padding: 12,
    },
  },
  {
    name: 'preventOverflow',
    options: { altAxis: true, padding: 12, tether: false },
  },
]

const SUBMENU_POSITION_MODIFIERS = [
  {
    name: 'flip',
    options: {
      fallbackPlacements: ['left-start', 'right-end', 'left-end'],
      padding: 12,
    },
  },
  {
    name: 'preventOverflow',
    options: { altAxis: true, padding: 12, tether: false },
  },
]

// After hiding actions the caller does not support, the dividers around them
// would otherwise stack up or dangle at the edges of the list.
const collapseDividers = items =>
  items.filter((item, index) => {
    if (item.type !== 'divider') return true
    if (index === 0 || index === items.length - 1) return false
    return items[index - 1].type !== 'divider'
  })

const isInteractive = item => item.type !== 'divider' && item.type !== 'header'

const prepare = items => collapseDividers((items || []).filter(Boolean))

/**
 * The app's action surface. One declarative item list renders as a desktop
 * menu or a phone sheet, so callers never branch on viewport themselves.
 *
 * An item is `{ key, icon, label, onClick, color, endDecorator, selected,
 * disabled }`, or `{ key, type: 'divider' }`, or `{ key, type: 'header', label }`
 * to title a run of items. Giving an item a `panel` key instead of an `onClick`
 * drills into `panels[key]` — a side submenu on desktop, a slide-in panel with
 * a back affordance and back-swipe on a phone. An item with `keepOpen` leaves
 * the surface up after activating, for settings you may want to change twice.
 *
 * Rendering its own trigger and owning its open state is the default. Passing
 * `anchorEl` switches it to controlled mode: the trigger is left to the caller
 * and the menu is driven from outside. That lets a long list keep a single
 * menu instance instead of one per row — see ChoreListView.
 */
const ActionMenu = ({
  anchorEl: controlledAnchorEl,
  'aria-label': ariaLabel,
  items = [],
  menuSx = {},
  onClose: controlledOnClose,
  onMouseEnter,
  onMouseLeave,
  onOpen,
  panels = {},
  sheetContentSx = { px: 0, pb: 1 },
  title,
  trigger,
}) => {
  const { t } = useTranslation('common')
  const isControlled = controlledAnchorEl !== undefined
  const [uncontrolledAnchorEl, setUncontrolledAnchorEl] = useState(null)
  const anchorEl = isControlled ? controlledAnchorEl : uncontrolledAnchorEl
  const [activePanel, setActivePanel] = useState(null)
  const [submenuAnchorEl, setSubmenuAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const submenuRef = useRef(null)
  const closeTimerRef = useRef(null)
  // Phone-only condition (matches AddTaskModal.jsx) — tablets/desktop keep the
  // Menu, which has room for a side submenu.
  const isSmallScreen = useResponsiveQuery('small')
  const open = Boolean(anchorEl)

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const closePanel = () => {
    clearCloseTimer()
    setActivePanel(null)
    setSubmenuAnchorEl(null)
  }

  // Moving the pointer from a panel row to its submenu crosses other root
  // rows along the way (the "safe triangle"). Closing on contact there would
  // kill the submenu before the user arrives, so give them a moment to land
  // on it instead of reacting to every row the cursor grazes.
  const scheduleClosePanel = () => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      closePanel()
    }, 200)
  }

  useEffect(() => clearCloseTimer, [])

  const handleClose = () => {
    closePanel()
    if (isControlled) {
      controlledOnClose?.()
    } else {
      setUncontrolledAnchorEl(null)
    }
  }

  useEffect(() => {
    if (isSmallScreen) {
      // AppModal owns its own backdrop/escape close behavior on small screens.
      if (anchorEl && onOpen) {
        onOpen()
      }
      return
    }

    // Only listen while open — a closed menu has nothing to dismiss, and a list
    // of these would otherwise put one listener per row on the document.
    if (!anchorEl) return

    const handleMenuOutsideClick = event => {
      if (
        !anchorEl.contains(event.target) &&
        !menuRef.current?.contains(event.target) &&
        !submenuRef.current?.contains(event.target)
      ) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleMenuOutsideClick)
    if (onOpen) {
      onOpen()
    }
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl, onOpen, isSmallScreen])

  // A panel left open from a previous visit would otherwise be what the user
  // sees the next time the menu opens.
  useEffect(() => {
    if (!anchorEl) closePanel()
  }, [anchorEl])

  const swipeBackHandlers = useSwipeBack(
    isSmallScreen && open && activePanel ? closePanel : null,
  )

  const openPanel = (panel, target) => {
    clearCloseTimer()
    setActivePanel(panel)
    setSubmenuAnchorEl(isSmallScreen ? null : target)
  }

  // Two stacked rows each with their own submenu hit the same safe-triangle
  // problem on the way in: crossing row B while aiming for row A's submenu
  // would otherwise swap the submenu to B's on contact. Delay the switch so
  // the pointer has time to reach A's submenu — which cancels it via
  // clearCloseTimer — before B takes over.
  const scheduleOpenPanel = (panel, target) => {
    if (panel === activePanel) {
      clearCloseTimer()
      return
    }
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      openPanel(panel, target)
    }, 200)
  }

  const handleItemActivate = (item, target) => {
    if (item.panel) {
      openPanel(item.panel, target)
      return
    }
    item.onClick?.()
    if (!item.keepOpen) handleClose()
  }

  const panel = activePanel ? panels[activePanel] : null
  const rootItems = prepare(items)
  const panelItems = prepare(panel?.items)
  // An item pointing at a panel the caller did not supply would strand the
  // sheet on an empty screen with only a back button.
  const visibleItems = panel ? panelItems : rootItems
  const panelKey = panel ? activePanel : ROOT_PANEL

  const sectionLabelSx = {
    color: 'text.tertiary',
    fontWeight: 'lg',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  }

  // Only root rows drive the submenu. Wiring these to a submenu's own rows
  // would close it the moment the pointer arrived to pick something.
  const hoverHandlers = item =>
    item.panel
      ? {
          onFocus: event => openPanel(item.panel, event.currentTarget),
          onMouseEnter: event =>
            scheduleOpenPanel(item.panel, event.currentTarget),
        }
      : { onFocus: closePanel, onMouseEnter: scheduleClosePanel }

  const renderMenuItems = (entries, { root = false } = {}) =>
    entries.map(item => {
      if (item.type === 'divider') return <Divider key={item.key} />
      if (item.type === 'header') {
        return (
          <ListItem key={item.key} sticky>
            <Typography level='body-xs' sx={sectionLabelSx}>
              {item.label}
            </Typography>
          </ListItem>
        )
      }
      return (
        <MenuItem
          key={item.key}
          color={item.color}
          disabled={item.disabled}
          selected={item.selected}
          {...(root ? hoverHandlers(item) : {})}
          onClick={event => {
            event.stopPropagation()
            handleItemActivate(item, event.currentTarget)
          }}
        >
          {item.icon}
          {item.label}
          {(item.endDecorator || item.panel) && (
            <ListItemDecorator sx={{ ml: 'auto', minInlineSize: 0 }}>
              {item.endDecorator || <KeyboardArrowRight fontSize='small' />}
            </ListItemDecorator>
          )}
        </MenuItem>
      )
    })

  const renderSheetItems = entries =>
    entries.map(item => {
      if (item.type === 'divider') return <Divider key={item.key} />
      if (item.type === 'header') {
        return (
          <ListItem key={item.key}>
            <Typography level='body-xs' sx={sectionLabelSx}>
              {item.label}
            </Typography>
          </ListItem>
        )
      }
      return (
        <ListItem key={item.key}>
          <ListItemButton
            color={item.color}
            disabled={item.disabled}
            selected={item.selected}
            onClick={event => {
              event.stopPropagation()
              handleItemActivate(item, event.currentTarget)
            }}
          >
            <ListItemDecorator>{item.icon}</ListItemDecorator>
            <ListItemContent>{item.label}</ListItemContent>
            {item.endDecorator}
          </ListItemButton>
        </ListItem>
      )
    })

  const renderedTrigger =
    isControlled || !trigger
      ? null
      : React.cloneElement(trigger, {
          'aria-expanded': open,
          'aria-haspopup': 'menu',
          'aria-label': trigger.props['aria-label'] || ariaLabel,
          onClick: event => {
            event.stopPropagation()
            setUncontrolledAnchorEl(event.currentTarget)
          },
          onMouseEnter,
          onMouseLeave,
        })

  return (
    <>
      {renderedTrigger}

      {isSmallScreen ? (
        <AppModal
          open={open}
          onClose={handleClose}
          title={panel?.title || title}
          mobilePresentation='sheet'
          showHandle
          contentSx={sheetContentSx}
        >
          <div
            {...swipeBackHandlers}
            style={{
              touchAction: panel ? 'pan-y pinch-zoom' : 'auto',
            }}
          >
            <PanelTransition
              panelKey={panelKey}
              active={open}
              backwards={!panel}
            >
              {panel && (
                <Button
                  variant='plain'
                  color='neutral'
                  size='sm'
                  startDecorator={<ArrowBack fontSize='small' />}
                  onClick={event => {
                    event.stopPropagation()
                    closePanel()
                  }}
                  sx={{ mx: 2, mb: 1 }}
                >
                  <Typography level='body-sm' fontWeight={600}>
                    {t('back')}
                  </Typography>
                </Button>
              )}
              <List
                sx={{
                  '--ListItem-minHeight': '48px',
                  '--ListItem-radius': '8px',
                  px: 1,
                }}
              >
                {renderSheetItems(visibleItems)}
              </List>
            </PanelTransition>
          </div>
        </AppModal>
      ) : (
        <>
          <Menu
            size='sm'
            ref={menuRef}
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            placement='bottom-end'
            strategy='fixed'
            modifiers={MENU_POSITION_MODIFIERS}
            sx={{
              '--ListItem-minHeight': '36px',
              ...menuRevealSx,
              minWidth: 244,
              maxWidth: 288,
              // Let the popper use the full desktop viewport. Scrolling is only
              // needed when the menu genuinely cannot fit on screen.
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
              p: 0.5,
              ...menuSx,
            }}
          >
            {renderMenuItems(rootItems, { root: true })}
          </Menu>

          <Menu
            size='sm'
            ref={submenuRef}
            anchorEl={submenuAnchorEl}
            open={Boolean(submenuAnchorEl) && panelItems.some(isInteractive)}
            onClose={closePanel}
            onMouseEnter={clearCloseTimer}
            placement='right-start'
            strategy='fixed'
            modifiers={SUBMENU_POSITION_MODIFIERS}
            sx={{
              '--ListItem-minHeight': '36px',
              ...menuRevealSx,
              minWidth: 200,
              maxWidth: 272,
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
              p: 0.5,
            }}
          >
            {renderMenuItems(panelItems)}
          </Menu>
        </>
      )}
    </>
  )
}

export default ActionMenu
