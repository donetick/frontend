import {
  Archive,
  CalendarMonth,
  Check,
  ChevronRight,
  Close,
  Delete,
  Done,
  DriveFileMove,
  EditCalendar,
  Flag,
  Label as LabelIcon,
  MoreHoriz,
  Person,
  Remove,
  SelectAll,
  SkipNext,
  ViewColumn,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Sheet,
  Typography,
} from '@mui/joy'
import useMediaQuery from '@mui/material/useMediaQuery'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../../components/common/AppModal'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../../utils/Colors'
import Priorities from '../../../utils/Priorities'
import { getIconComponent } from '../../../utils/ProjectIcons'
import { getSafeBottom } from '../../../utils/SafeAreaUtils'
import DueDatePickerModal, {
  splitDueDate,
} from '../../components/DueDatePickerModal'
import { ProjectAccessIcon } from '../../Projects/ProjectVisibilityField'

const renderProjectAvatar = (color, icon) => {
  const bg = color || LABEL_COLORS[0].value
  const IconComponent = getIconComponent(icon || 'FolderOpen')
  return (
    <Avatar size='sm' sx={{ width: 22, height: 22, backgroundColor: bg }}>
      <IconComponent
        sx={{ fontSize: 13, color: getTextColorFromBackgroundColor(bg) }}
      />
    </Avatar>
  )
}

// Same tethering fix ChoreActionMenu applies: Popper's default keeps a popup
// glued to its trigger even when that pushes part of a tall menu off-screen.
// This menu opens upward from a bar at the bottom edge, so the fallbacks run
// the other way round.
const MENU_POSITION_MODIFIERS = [
  {
    name: 'flip',
    options: {
      fallbackPlacements: ['bottom-end', 'top-start', 'bottom-start'],
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

// Matches ChoreActionMenu so the single-task menu and the bulk menu are the
// same object at two scales.
const MENU_SX = {
  '--ListItem-minHeight': '36px',
  maxHeight: 'calc(100dvh - 24px)',
  maxWidth: 288,
  minWidth: 244,
  overflowY: 'auto',
  p: 0.5,
}

const SUBMENU_SX = {
  '--ListItem-minHeight': '36px',
  maxHeight: 'calc(100dvh - 24px)',
  maxWidth: 272,
  minWidth: 200,
  overflowY: 'auto',
  p: 0.5,
}

// `onSetDueDate` takes the same { dueDateOnly, dueTime, useCustomTime } shape
// the picker emits, or null to unplan. The quick options move the date only and
// leave the time unset, so each task keeps whatever hour it was already due at
// (and stays "anytime" if it had none).
const dateOnly = date => ({
  dueDateOnly: date.format('YYYY-MM-DD'),
  dueTime: null,
  useCustomTime: false,
})

const DUE_DATE_PRESETS = [
  {
    key: 'today',
    labelKey: 'presetToday',
    resolve: () => dateOnly(moment()),
    hint: () => moment().format('ddd, MMM D'),
  },
  {
    key: 'tomorrow',
    labelKey: 'presetTomorrow',
    resolve: () => dateOnly(moment().add(1, 'day')),
    hint: () => moment().add(1, 'day').format('ddd, MMM D'),
  },
  {
    key: 'next-week',
    labelKey: 'presetNextWeek',
    resolve: () => dateOnly(moment().add(1, 'week').startOf('isoWeek')),
    hint: () => moment().add(1, 'week').startOf('isoWeek').format('ddd, MMM D'),
  },
]

// Matches Home's SectionHeader: the sheet's groups should read like the rest of
// the app's sections, not like a settings form.
const SectionHeader = ({ icon, label, value }) => (
  <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, mb: 1.25 }}>
    {icon && (
      <Box
        sx={{
          alignItems: 'center',
          color: 'text.secondary',
          display: 'flex',
          '& svg': { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography level='title-sm' sx={{ letterSpacing: '0.01em' }}>
      {label}
    </Typography>
    {value && (
      <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 'auto' }}>
        {value}
      </Typography>
    )}
  </Box>
)

SectionHeader.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
}

const ChipRow = ({ children }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{children}</Box>
)

ChipRow.propTypes = { children: PropTypes.node }

const selectableChipSx = {
  py: 0.64,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  userSelect: 'none',
  '&:hover': { opacity: 0.85 },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
}

/**
 * One tappable line in the mobile sheet. Every action that isn't one of the
 * three primaries is a row like this, so they rank by position in a list rather
 * than by each having its own colour.
 */
const SheetRow = ({ color = 'neutral', hint, icon, label, onClick }) => (
  <Box
    component='button'
    type='button'
    onClick={onClick}
    sx={{
      alignItems: 'center',
      background: 'transparent',
      border: 'none',
      borderRadius: 'sm',
      color: color === 'danger' ? 'danger.plainColor' : 'text.primary',
      cursor: 'pointer',
      display: 'flex',
      font: 'inherit',
      gap: 1.5,
      mx: -1,
      px: 1,
      py: 1.125,
      textAlign: 'start',
      transition: 'background-color 150ms ease',
      width: 'calc(100% + 16px)',
      '&:hover': {
        backgroundColor:
          color === 'danger' ? 'danger.softBg' : 'neutral.softBg',
      },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    }}
  >
    <Box
      sx={{
        alignItems: 'center',
        color: color === 'danger' ? 'inherit' : 'text.secondary',
        display: 'flex',
        '& svg': { fontSize: 20 },
      }}
    >
      {icon}
    </Box>
    <Typography level='body-sm' sx={{ color: 'inherit', fontWeight: 500 }}>
      {label}
    </Typography>
    {hint && <Box sx={{ ml: 'auto' }}>{hint}</Box>}
  </Box>
)

SheetRow.propTypes = {
  color: PropTypes.oneOf(['neutral', 'danger']),
  hint: PropTypes.node,
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
}

/**
 * The bulk-action bar for multi-select.
 *
 * It lives at the bottom of the viewport, in the slot the add-task FAB occupies
 * the rest of the time: selection happens by tapping cards down the list, so
 * the actions belong under the thumb rather than above the content they act on.
 * Geometry, motion and the pill shape are shared with Home's CaptureBar so the
 * two never read as different systems.
 *
 * Only three controls are permanent — complete, reschedule, and the overflow
 * that holds everything else. Eight equally-weighted buttons meant nothing was
 * primary; one solid button plus a menu means the common case is obvious and
 * the destructive case takes a deliberate second step.
 *
 * The overflow follows ChoreActionMenu exactly: a Joy Menu with chevron
 * submenus on a pointer, an AppModal sheet on a phone. This is the bulk twin of
 * that menu, so it is the same object at a different scale.
 */
const MultiSelectToolbar = ({
  isVisible,
  labels = [],
  members = [],
  onArchive,
  onClear,
  onComplete,
  onDelete,
  onMoveToProject,
  onMoveToSection,
  onSelectAll,
  onSetAssignee,
  onSetDueDate,
  onSetPriority,
  onSkip,
  // Shape produced by useMultiSelect.getSelectionSummary — drives which value
  // each control shows as current, and which labels can be added vs removed.
  onToggleLabel,
  projects = [],
  sections = [],
  selectAllDisabled,
  selectedCount,
  selectionSummary,
  showKeyboardShortcuts,
}) => {
  const { t } = useTranslation('chores')
  // Same phone-only condition ChoreActionMenu and AddTaskModal use: tablets and
  // desktops keep the menu, only phones get the sheet.
  const isSmallScreen = useMediaQuery('(max-width:600px)')
  const [editOpen, setEditOpen] = useState(false)
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false)
  const [dueMenuAnchor, setDueMenuAnchor] = useState(null)
  // One picker mechanism for both shells: a submenu beside the menu item on
  // desktop, a popup anchored to the row on a phone.
  const [picker, setPicker] = useState(null)
  const [submenuAnchor, setSubmenuAnchor] = useState(null)
  const dueMenuRef = useRef(null)
  const editButtonRef = useRef(null)

  const closeDueMenu = () => setDueMenuAnchor(null)

  const closeSubmenu = () => {
    setPicker(null)
    setSubmenuAnchor(null)
  }

  const openPicker = (kind, target) => {
    setPicker(kind)
    setSubmenuAnchor(target)
  }

  const closeEditPanel = useCallback(() => {
    setEditOpen(false)
    setPicker(null)
    setSubmenuAnchor(null)
  }, [])

  // Leaving multi-select (or losing the selection to a bulk action) has to take
  // the menu with it, or a popup is left anchored to a bar that slid away.
  useEffect(() => {
    if (!isVisible || selectedCount === 0) closeEditPanel()
  }, [closeEditPanel, isVisible, selectedCount])

  const summary = selectionSummary || {}
  const labelState = summary.labels || { common: [], partial: [] }
  const commonLabelIds = new Set(labelState.common || [])
  const partialLabelIds = new Set(labelState.partial || [])
  const hasSelection = selectedCount > 0

  // null from the summary means "no restriction" — every circle member is a
  // valid assignee for the whole selection.
  const assignableMembers =
    summary.assignableUserIds == null
      ? members
      : members.filter(m => summary.assignableUserIds.includes(m.userId))

  // Every bulk edit clears the selection, so the menu has nothing left to act
  // on afterwards.
  const runAndClose =
    action =>
    (...args) => {
      closeEditPanel()
      action?.(...args)
    }

  const dueDateValue = summary.dueDate?.isMixed
    ? t('multiToolbar.mixed')
    : summary.dueDate?.value
      ? moment(summary.dueDate.value).format('MMM D')
      : null

  const priorityValue = summary.priority?.isMixed
    ? t('multiToolbar.mixed')
    : Priorities.find(p => p.value === summary.priority?.value)?.name.trim() ||
      null

  const assigneeValue = summary.assignee?.isMixed
    ? t('multiToolbar.mixed')
    : members.find(m => m.userId === summary.assignee?.value)?.displayName ||
      null

  // What the selection has in common, stated where a touch user can actually
  // read it. The old bar computed exactly this and spent it on `title`
  // tooltips, which don't exist on a phone. Mixed fields are omitted rather
  // than listed as "Mixed" three times.
  const summaryLine = [
    !summary.dueDate?.isMixed && summary.dueDate?.value
      ? t('multiToolbar.summaryDue', {
          value: moment(summary.dueDate.value).format('MMM D'),
        })
      : null,
    !summary.priority?.isMixed && priorityValue ? priorityValue : null,
    !summary.assignee?.isMixed && assigneeValue ? assigneeValue : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const shortcut = (key, props = {}) =>
    showKeyboardShortcuts ? (
      <KeyboardShortcutHint shortcut={key} {...props} />
    ) : null

  const isPriorityCurrent = value =>
    !summary.priority?.isMixed && summary.priority?.value === value

  const isAssigneeCurrent = userId =>
    !summary.assignee?.isMixed && summary.assignee?.value === userId

  // ── Submenu contents ─────────────────────────────────────────────────────
  // Shared by both shells: on desktop these fill the submenu next to the menu
  // item, on a phone the popup anchored to the sheet row.

  const renderPriorityItems = () =>
    [...Priorities, { name: t('multiToolbar.noPriority'), value: 0 }].map(
      priority => (
        <MenuItem
          key={priority.value}
          selected={isPriorityCurrent(priority.value)}
          onClick={runAndClose(() => onSetPriority(priority.value))}
        >
          <ListItemDecorator>
            {isPriorityCurrent(priority.value) ? (
              <Check sx={{ fontSize: 18 }} />
            ) : (
              priority.icon || <Remove sx={{ fontSize: 18 }} />
            )}
          </ListItemDecorator>
          <ListItemContent>
            <Typography level='body-sm'>{priority.name.trim()}</Typography>
          </ListItemContent>
        </MenuItem>
      ),
    )

  const renderAssigneeItems = () =>
    assignableMembers.map(member => (
      <MenuItem
        key={member.userId}
        selected={isAssigneeCurrent(member.userId)}
        onClick={runAndClose(() => onSetAssignee(member.userId))}
      >
        <ListItemDecorator>
          {isAssigneeCurrent(member.userId) ? (
            <Check sx={{ fontSize: 18 }} />
          ) : (
            <Avatar size='sm' sx={{ height: 22, width: 22 }}>
              {(member.displayName || '?').charAt(0).toUpperCase()}
            </Avatar>
          )}
        </ListItemDecorator>
        <ListItemContent>
          <Typography level='body-sm'>
            {member.displayName || member.username}
          </Typography>
        </ListItemContent>
      </MenuItem>
    ))

  // A label on every selected task shows a check and removes on click; one on
  // only some of them shows a dash and completes the set.
  const renderLabelItems = () =>
    labels.map(label => {
      const onAll = commonLabelIds.has(label.id)
      const onSome = partialLabelIds.has(label.id)
      return (
        <MenuItem
          key={label.id}
          selected={onAll}
          onClick={runAndClose(() =>
            onToggleLabel(label, onAll ? 'remove' : 'add'),
          )}
        >
          <ListItemDecorator>
            {onAll ? (
              <Check sx={{ fontSize: 18 }} />
            ) : onSome ? (
              <Remove sx={{ fontSize: 18 }} />
            ) : (
              <Box
                sx={{
                  backgroundColor: label.color || 'neutral.softBg',
                  borderRadius: '50%',
                  height: 12,
                  width: 12,
                }}
              />
            )}
          </ListItemDecorator>
          <ListItemContent>
            <Typography level='body-sm'>{label.name}</Typography>
          </ListItemContent>
        </MenuItem>
      )
    })

  const renderProjectItems = () => [
    <MenuItem
      key='__default'
      onClick={runAndClose(() =>
        onMoveToProject({ id: null, name: t('multiToolbar.defaultProject') }),
      )}
    >
      <ListItemDecorator>
        {renderProjectAvatar(LABEL_COLORS[0].value, 'FolderOpen')}
      </ListItemDecorator>
      <ListItemContent>
        <Typography level='body-sm'>
          {t('multiToolbar.defaultProject')}
        </Typography>
      </ListItemContent>
    </MenuItem>,
    ...projects.map(project => (
      <MenuItem
        key={project.id}
        onClick={runAndClose(() => onMoveToProject(project))}
      >
        <ListItemDecorator>
          {renderProjectAvatar(project.color, project.icon)}
        </ListItemDecorator>
        <ListItemContent>
          <Typography level='body-sm'>
            {project.name}
            <ProjectAccessIcon
              project={project}
              sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'text-bottom' }}
            />
          </Typography>
        </ListItemContent>
      </MenuItem>
    )),
  ]

  const renderSectionItems = () =>
    sections.map(section => (
      <MenuItem
        key={section.id}
        onClick={runAndClose(() => onMoveToSection(section))}
      >
        <ListItemDecorator>
          <ViewColumn sx={{ fontSize: 18 }} />
        </ListItemDecorator>
        <ListItemContent>
          <Typography level='body-sm'>{section.name}</Typography>
        </ListItemContent>
      </MenuItem>
    ))

  const renderSubmenuItems = () => {
    switch (picker) {
      case 'priority':
        return renderPriorityItems()
      case 'assignee':
        return renderAssigneeItems()
      case 'labels':
        return renderLabelItems()
      case 'project':
        return renderProjectItems()
      case 'section':
        return renderSectionItems()
      default:
        return null
    }
  }

  return (
    <>
      <Box
        role='toolbar'
        aria-label={t('multiToolbar.toolbarLabel')}
        aria-hidden={!isVisible}
        sx={{
          bottom: getSafeBottom(12, 4),
          display: 'flex',
          insetInlineEnd: 0,
          insetInlineStart: 'var(--app-navigation-width, 0px)',
          justifyContent: 'center',
          opacity: isVisible ? 1 : 0,
          pointerEvents: 'none',
          position: 'fixed',
          px: 2,
          transform: isVisible ? 'translateY(0)' : 'translateY(150px)',
          transition: 'transform 220ms ease, opacity 220ms ease',
          // Above the add-task FAB (101) and the bottom navigation, below
          // modals — the sheet this bar opens has to cover it.
          zIndex: 102,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          '@media (max-width: 768px)': {
            bottom: getSafeBottom(68, 4),
          },
        }}
      >
        <Sheet
          variant='outlined'
          sx={{
            alignItems: 'center',
            borderRadius: '999px',
            boxShadow: 'lg',
            display: 'flex',
            gap: 0.75,
            // Same content column as CaptureBar, so the bar lines up with the
            // cards above it instead of spanning the whole window.
            maxWidth: 568,
            pointerEvents: isVisible ? 'auto' : 'none',
            pl: 0.75,
            pr: 0.75,
            py: 0.75,
            width: '100%',
          }}
        >
          <IconButton
            variant='plain'
            color='neutral'
            size='sm'
            onClick={onClear}
            aria-label={
              hasSelection
                ? t('archived.clearMultiSelect')
                : t('archived.closeMultiSelect')
            }
            title={
              hasSelection
                ? t('archived.clearMultiSelect')
                : t('archived.closeMultiSelect')
            }
            sx={{ borderRadius: '50%', flexShrink: 0 }}
          >
            <Close sx={{ fontSize: 19 }} />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0 }} aria-live='polite'>
            {hasSelection ? (
              <>
                <Typography
                  level='title-sm'
                  noWrap
                  sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}
                >
                  {t('multiToolbar.countSelected', { count: selectedCount })}
                </Typography>
                {summaryLine && (
                  <Typography
                    level='body-xs'
                    textColor='text.secondary'
                    noWrap
                    sx={{ lineHeight: 1.2 }}
                  >
                    {summaryLine}
                  </Typography>
                )}
              </>
            ) : (
              <Typography level='body-sm' textColor='text.secondary' noWrap>
                {t('multiToolbar.selectPrompt')}
              </Typography>
            )}
          </Box>

          {/* Nothing is selected yet, so the only useful action is to select
              something — a row of disabled buttons would just be noise. */}
          {!hasSelection ? (
            <Button
              size='sm'
              variant='soft'
              color='neutral'
              onClick={onSelectAll}
              disabled={selectAllDisabled}
              startDecorator={<SelectAll />}
              endDecorator={shortcut('A')}
              sx={{ borderRadius: '999px', flexShrink: 0 }}
              title={t('archived.selectAllTitle')}
            >
              {t('multiToolbar.selectAll')}
            </Button>
          ) : (
            <>
              <Button
                size='sm'
                variant='solid'
                color='success'
                onClick={onComplete}
                startDecorator={<Done />}
                endDecorator={shortcut('Enter')}
                sx={{ borderRadius: '999px', flexShrink: 0 }}
                title={t('multiToolbar.completeTitle')}
              >
                {t('multiToolbar.complete')}
              </Button>

              {onSetDueDate && (
                <Button
                  size='sm'
                  variant='soft'
                  color='neutral'
                  ref={dueMenuRef}
                  onClick={() =>
                    setDueMenuAnchor(prev => (prev ? null : dueMenuRef.current))
                  }
                  startDecorator={<CalendarMonth />}
                  aria-label={t('multiToolbar.due')}
                  sx={{
                    borderRadius: '999px',
                    flexShrink: 0,
                    // Icon-only on the narrowest screens: the calendar carries
                    // the meaning and the room goes to the count instead.
                    '--Button-gap': { xs: 0, sm: '0.375rem' },
                    '--Button-paddingInline': { xs: '0.5rem', sm: '0.75rem' },
                  }}
                  title={
                    dueDateValue
                      ? t('multiToolbar.dueTitleSet', { value: dueDateValue })
                      : t('multiToolbar.dueTitleEmpty')
                  }
                >
                  <Box
                    component='span'
                    sx={{ display: { xs: 'none', sm: 'inline' } }}
                  >
                    {t('multiToolbar.due')}
                  </Box>
                </Button>
              )}

              <IconButton
                variant='soft'
                color='neutral'
                size='sm'
                ref={editButtonRef}
                onClick={() => setEditOpen(prev => !prev)}
                aria-label={t('multiToolbar.editTitle')}
                title={t('multiToolbar.editTitle')}
                sx={{ borderRadius: '50%', flexShrink: 0 }}
              >
                <MoreHoriz sx={{ fontSize: 20 }} />
              </IconButton>
            </>
          )}
        </Sheet>
      </Box>

      {onSetDueDate && (
        <Menu
          size='sm'
          anchorEl={dueMenuAnchor}
          open={Boolean(dueMenuAnchor)}
          onClose={closeDueMenu}
          placement='top-end'
          strategy='fixed'
          modifiers={MENU_POSITION_MODIFIERS}
          sx={SUBMENU_SX}
        >
          {DUE_DATE_PRESETS.map(preset => (
            <MenuItem
              key={preset.key}
              onClick={() => {
                closeDueMenu()
                onSetDueDate(preset.resolve())
              }}
            >
              <ListItemDecorator>
                <CalendarMonth sx={{ fontSize: 18 }} />
              </ListItemDecorator>
              <ListItemContent>
                <Typography level='body-sm'>
                  {t(`multiToolbar.${preset.labelKey}`)}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {preset.hint()}
                </Typography>
              </ListItemContent>
            </MenuItem>
          ))}
          <Divider />
          <MenuItem
            onClick={() => {
              closeDueMenu()
              setDueDatePickerOpen(true)
            }}
          >
            <ListItemDecorator>
              <EditCalendar sx={{ fontSize: 18 }} />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm'>
                {t('multiToolbar.pickDate')}
              </Typography>
            </ListItemContent>
          </MenuItem>
          <MenuItem
            color='danger'
            onClick={() => {
              closeDueMenu()
              onSetDueDate(null)
            }}
          >
            <ListItemDecorator>
              <Remove sx={{ fontSize: 18 }} />
            </ListItemDecorator>
            <ListItemContent>
              <Typography level='body-sm'>
                {t('multiToolbar.noDueDate')}
              </Typography>
            </ListItemContent>
          </MenuItem>
        </Menu>
      )}

      {/* ── Overflow: every action that isn't one of the three primaries ──
          Fields first because they're the common case, moves next, and the
          reversible/irreversible pair last behind a divider. Due date is
          deliberately absent: it has its own button, and two entry points for
          one field is what made the old split unpredictable. */}
      {isSmallScreen ? (
        <AppModal
          open={editOpen}
          isMobile
          onClose={closeEditPanel}
          maxHeight='92vh'
          title={t('archived.selected', { count: selectedCount })}
          description={summaryLine || undefined}
          footer={
            <Button
              variant='plain'
              color='neutral'
              onClick={closeEditPanel}
              sx={{ minWidth: 140 }}
            >
              {t('multiToolbar.done')}
            </Button>
          }
        >
          {/* The phone sheet lays the fields out as chips rather than rows:
              there is room for it, and it shows what the selection already has
              instead of making you open three submenus to find out. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {onSetPriority && (
              <>
                <SectionHeader
                  icon={<Flag />}
                  label={t('multiToolbar.priority')}
                  value={priorityValue}
                />
                <ChipRow>
                  {Priorities.map(priority => {
                    const isCurrent = isPriorityCurrent(priority.value)
                    return (
                      <Chip
                        key={priority.value}
                        variant={isCurrent ? 'solid' : 'soft'}
                        color={
                          isCurrent ? priority.color || 'primary' : 'neutral'
                        }
                        startDecorator={
                          isCurrent ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : undefined
                        }
                        onClick={runAndClose(() =>
                          onSetPriority(priority.value),
                        )}
                        sx={selectableChipSx}
                      >
                        {priority.name.trim()}
                      </Chip>
                    )
                  })}
                  <Chip
                    variant='soft'
                    color='neutral'
                    onClick={runAndClose(() => onSetPriority(0))}
                    sx={selectableChipSx}
                  >
                    {t('multiToolbar.noPriority')}
                  </Chip>
                </ChipRow>
              </>
            )}

            {onSetAssignee && assignableMembers.length > 0 && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <SectionHeader
                  icon={<Person />}
                  label={t('multiToolbar.assignee')}
                  value={assigneeValue}
                />
                <ChipRow>
                  {assignableMembers.map(member => {
                    const isCurrent = isAssigneeCurrent(member.userId)
                    return (
                      <Chip
                        key={member.userId}
                        variant={isCurrent ? 'solid' : 'soft'}
                        color={isCurrent ? 'primary' : 'neutral'}
                        startDecorator={
                          isCurrent ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : (
                            <Avatar size='sm' sx={{ height: 20, width: 20 }}>
                              {(member.displayName || '?')
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>
                          )
                        }
                        onClick={runAndClose(() =>
                          onSetAssignee(member.userId),
                        )}
                        sx={selectableChipSx}
                      >
                        {member.displayName || member.username}
                      </Chip>
                    )
                  })}
                </ChipRow>
              </>
            )}

            {onToggleLabel && labels.length > 0 && (
              <>
                <Divider sx={{ my: 2.5 }} />
                {/* Tapping adds the label to every task; tapping one that is
                    already on all of them removes it. A half-filled chip means
                    only some of the selection has it — tapping completes the
                    set. */}
                <SectionHeader
                  icon={<LabelIcon />}
                  label={t('multiToolbar.labels')}
                  value={t('multiToolbar.labelsHint')}
                />
                <ChipRow>
                  {labels.map(label => {
                    const onAll = commonLabelIds.has(label.id)
                    const onSome = partialLabelIds.has(label.id)
                    return (
                      <Chip
                        key={label.id}
                        variant={onAll ? 'solid' : onSome ? 'outlined' : 'soft'}
                        color='neutral'
                        startDecorator={
                          onAll ? (
                            <Check sx={{ fontSize: 14 }} />
                          ) : onSome ? (
                            <Remove sx={{ fontSize: 14 }} />
                          ) : undefined
                        }
                        onClick={runAndClose(() =>
                          onToggleLabel(label, onAll ? 'remove' : 'add'),
                        )}
                        sx={{
                          ...selectableChipSx,
                          ...(label.color && !onAll
                            ? { borderColor: label.color }
                            : {}),
                          ...(label.color && onAll
                            ? {
                                backgroundColor: label.color,
                                color: getTextColorFromBackgroundColor(
                                  label.color,
                                ),
                              }
                            : {}),
                        }}
                      >
                        {label.name}
                      </Chip>
                    )
                  })}
                </ChipRow>
              </>
            )}

            <Divider sx={{ my: 2.5 }} />
            <SectionHeader label={t('multiToolbar.actions')} />
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {!selectAllDisabled && (
                <SheetRow
                  icon={<SelectAll />}
                  label={t('multiToolbar.selectAll')}
                  hint={shortcut('A')}
                  onClick={runAndClose(onSelectAll)}
                />
              )}
              <SheetRow
                icon={<SkipNext />}
                label={t('multiToolbar.skip')}
                hint={shortcut('/')}
                onClick={runAndClose(onSkip)}
              />
              {onMoveToProject && (
                <SheetRow
                  icon={<DriveFileMove />}
                  label={t('actionMenu.moveToProject')}
                  hint={<ChevronRight fontSize='small' />}
                  onClick={event => openPicker('project', event.currentTarget)}
                />
              )}
              {onMoveToSection && sections.length > 0 && (
                <SheetRow
                  icon={<ViewColumn />}
                  label={t('actionMenu.moveToSection')}
                  hint={<ChevronRight fontSize='small' />}
                  onClick={event => openPicker('section', event.currentTarget)}
                />
              )}
              {/* Archive is reversible, so it reads as neutral. Delete is the
                  only irreversible action here and it sits last, alone, below a
                  divider — never a thumb's width from Complete. */}
              <SheetRow
                icon={<Archive />}
                label={t('multiToolbar.archive')}
                hint={shortcut('X')}
                onClick={runAndClose(onArchive)}
              />
              <Divider sx={{ my: 1 }} />
              <SheetRow
                color='danger'
                icon={<Delete />}
                label={t('archived.delete')}
                hint={shortcut('E')}
                onClick={runAndClose(onDelete)}
              />
            </Box>
          </Box>
        </AppModal>
      ) : (
        <Menu
          size='sm'
          anchorEl={editButtonRef.current}
          open={editOpen && Boolean(editButtonRef.current)}
          onClose={closeEditPanel}
          placement='top-end'
          strategy='fixed'
          modifiers={MENU_POSITION_MODIFIERS}
          sx={MENU_SX}
        >
          {onSetPriority && (
            <MenuItem
              onClick={event => openPicker('priority', event.currentTarget)}
            >
              <ListItemDecorator>
                <Flag />
              </ListItemDecorator>
              <ListItemContent>{t('multiToolbar.priority')}</ListItemContent>
              {/* The current value rides on the row, so the menu answers "what
                  are these set to" without opening anything. */}
              {priorityValue ? (
                <Chip size='sm' variant='soft' color='neutral'>
                  {priorityValue}
                </Chip>
              ) : (
                <ChevronRight fontSize='small' />
              )}
            </MenuItem>
          )}

          {onSetAssignee && assignableMembers.length > 0 && (
            <MenuItem
              onClick={event => openPicker('assignee', event.currentTarget)}
            >
              <ListItemDecorator>
                <Person />
              </ListItemDecorator>
              <ListItemContent>{t('multiToolbar.assignee')}</ListItemContent>
              {assigneeValue ? (
                <Chip size='sm' variant='soft' color='neutral'>
                  {assigneeValue}
                </Chip>
              ) : (
                <ChevronRight fontSize='small' />
              )}
            </MenuItem>
          )}

          {onToggleLabel && labels.length > 0 && (
            <MenuItem
              onClick={event => openPicker('labels', event.currentTarget)}
            >
              <ListItemDecorator>
                <LabelIcon />
              </ListItemDecorator>
              <ListItemContent>{t('multiToolbar.labels')}</ListItemContent>
              <ChevronRight fontSize='small' />
            </MenuItem>
          )}

          <Divider />

          {!selectAllDisabled && (
            <MenuItem onClick={runAndClose(onSelectAll)}>
              <ListItemDecorator>
                <SelectAll />
              </ListItemDecorator>
              <ListItemContent>{t('multiToolbar.selectAll')}</ListItemContent>
              {shortcut('A')}
            </MenuItem>
          )}

          <MenuItem onClick={runAndClose(onSkip)}>
            <ListItemDecorator>
              <SkipNext />
            </ListItemDecorator>
            <ListItemContent>{t('multiToolbar.skip')}</ListItemContent>
            {shortcut('/')}
          </MenuItem>

          {onMoveToProject && (
            <MenuItem
              onClick={event => openPicker('project', event.currentTarget)}
            >
              <ListItemDecorator>
                <DriveFileMove />
              </ListItemDecorator>
              <ListItemContent>{t('actionMenu.moveToProject')}</ListItemContent>
              <ChevronRight fontSize='small' />
            </MenuItem>
          )}

          {onMoveToSection && sections.length > 0 && (
            <MenuItem
              onClick={event => openPicker('section', event.currentTarget)}
            >
              <ListItemDecorator>
                <ViewColumn />
              </ListItemDecorator>
              <ListItemContent>{t('actionMenu.moveToSection')}</ListItemContent>
              <ChevronRight fontSize='small' />
            </MenuItem>
          )}

          <Divider />

          {/* Archive is reversible, so it reads as neutral. Delete is the only
              irreversible action here and it sits last, alone, below a
              divider — never a cursor's width from Complete. */}
          <MenuItem onClick={runAndClose(onArchive)}>
            <ListItemDecorator>
              <Archive />
            </ListItemDecorator>
            <ListItemContent>{t('multiToolbar.archive')}</ListItemContent>
            {shortcut('X')}
          </MenuItem>

          <Divider />

          <MenuItem color='danger' onClick={runAndClose(onDelete)}>
            <ListItemDecorator>
              <Delete />
            </ListItemDecorator>
            <ListItemContent>{t('archived.delete')}</ListItemContent>
            {shortcut('E')}
          </MenuItem>
        </Menu>
      )}

      {/* One submenu for every picker, like ChoreActionMenu's: beside the menu
          item on a pointer, anchored to the sheet row on a phone. */}
      <Menu
        size='sm'
        anchorEl={submenuAnchor}
        open={Boolean(submenuAnchor && picker)}
        onClose={closeSubmenu}
        placement={isSmallScreen ? 'bottom-start' : 'right-start'}
        strategy='fixed'
        modifiers={
          isSmallScreen ? MENU_POSITION_MODIFIERS : SUBMENU_POSITION_MODIFIERS
        }
        sx={SUBMENU_SX}
      >
        {renderSubmenuItems()}
      </Menu>

      {dueDatePickerOpen && (
        <DueDatePickerModal
          open
          title={t('multiToolbar.dueDateTitle', { count: selectedCount })}
          {...splitDueDate(
            summary.dueDate?.isMixed ? null : summary.dueDate?.value,
          )}
          onClose={() => setDueDatePickerOpen(false)}
          onApply={parts => {
            setDueDatePickerOpen(false)
            closeEditPanel()
            // Passed through as parts, not a timestamp: leaving the time on
            // "Anytime" means "keep each task's own hour", which only the
            // per-chore handler can resolve.
            onSetDueDate?.(parts.dueDateOnly ? parts : null)
          }}
          onRemove={() => {
            setDueDatePickerOpen(false)
            closeEditPanel()
            onSetDueDate?.(null)
          }}
        />
      )}
    </>
  )
}

MultiSelectToolbar.propTypes = {
  isVisible: PropTypes.bool,
  labels: PropTypes.array,
  members: PropTypes.array,
  onArchive: PropTypes.func,
  onClear: PropTypes.func,
  onComplete: PropTypes.func,
  onDelete: PropTypes.func,
  onMoveToProject: PropTypes.func,
  onMoveToSection: PropTypes.func,
  onSelectAll: PropTypes.func,
  onSetAssignee: PropTypes.func,
  onSetDueDate: PropTypes.func,
  onSetPriority: PropTypes.func,
  onSkip: PropTypes.func,
  onToggleLabel: PropTypes.func,
  projects: PropTypes.array,
  sections: PropTypes.array,
  selectAllDisabled: PropTypes.bool,
  selectedCount: PropTypes.number,
  selectionSummary: PropTypes.object,
  showKeyboardShortcuts: PropTypes.bool,
}

export default MultiSelectToolbar
