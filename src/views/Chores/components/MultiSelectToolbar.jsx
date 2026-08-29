import {
  Archive,
  CalendarMonth,
  Check,
  CheckBox,
  CheckBoxOutlineBlank,
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
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  ListItemContent,
  ListItemDecorator,
  Menu,
  MenuItem,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../../components/common/AppModal'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../../utils/Colors'
import Priorities from '../../../utils/Priorities'
import { getIconComponent } from '../../../utils/ProjectIcons'
import DueDatePickerModal, {
  splitDueDate,
} from '../../components/DueDatePickerModal'

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

// `onSetDueDate` takes the same { dueDateOnly, dueTime, useCustomTime } shape
// the picker emits, or null to unplan. The quick options move the date only and
// leave the time unset, so each task keeps whatever hour it was already due at
// (and stays "anytime" if it had none).
// 23:59 is the app's "no specific time" stamp, so the picker should open on
// Anytime for it rather than showing it as a time the user chose.
const prefillDueDate = value => {
  const parts = splitDueDate(value)
  return parts.dueTime === '23:59'
    ? { dueDateOnly: parts.dueDateOnly, dueTime: null, useCustomTime: false }
    : parts
}

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

const SectionHeader = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    {icon && (
      <Box
        sx={{
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          '& svg': { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography level='title-sm' fontWeight={600}>
      {label}
    </Typography>
    {value && (
      <Typography level='body-xs' sx={{ ml: 'auto', color: 'text.tertiary' }}>
        {value}
      </Typography>
    )}
  </Box>
)

const ChipRow = ({ children }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{children}</Box>
)

const selectableChipSx = {
  py: 0.64,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  userSelect: 'none',
  '&:hover': { opacity: 0.85 },
}

const MultiSelectToolbar = ({
  isVisible,
  labels = [],
  members = [],
  onArchive,
  onClear,
  onComplete,
  onDelete,
  onMoveToProject,
  onSelectAll,
  onSetAssignee,
  onSetDueDate,
  onSetPriority,
  onSkip,
  // Shape produced by useMultiSelect.getSelectionSummary — drives which value
  // each control shows as current, and which labels can be added vs removed.
  onToggleLabel,
  projects = [],
  selectAllDisabled,
  selectedCount,
  selectionSummary,
  showKeyboardShortcuts,
}) => {
  const { t } = useTranslation('chores')
  const [moreOpen, setMoreOpen] = useState(false)
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false)
  const [dueMenuAnchor, setDueMenuAnchor] = useState(null)
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null)
  const dueMenuRef = useRef(null)
  const projectMenuRef = useRef(null)

  const closeDueMenu = () => setDueMenuAnchor(null)
  const closeProjectMenu = () => setProjectMenuAnchor(null)

  const summary = selectionSummary || {}
  const labelState = summary.labels || { common: [], partial: [] }
  const commonLabelIds = new Set(labelState.common || [])
  const partialLabelIds = new Set(labelState.partial || [])

  // null from the summary means "no restriction" — every circle member is a
  // valid assignee for the whole selection.
  const assignableMembers =
    summary.assignableUserIds == null
      ? members
      : members.filter(m => summary.assignableUserIds.includes(m.userId))

  // Every bulk edit clears the selection, so the sheet has nothing left to act
  // on afterwards.
  const runAndClose =
    action =>
    (...args) => {
      setMoreOpen(false)
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

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
        // Generous enough that the action buttons can wrap to two or three
        // rows on a narrow screen without being clipped, while still giving
        // the collapse something finite to animate to.
        maxHeight: isVisible ? '400px' : '0',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
        marginBottom: isVisible ? 2 : 0,
      }}
    >
      <Box
        sx={{
          backgroundColor: 'background.surface',
          backdropFilter: 'blur(8px)',
          borderRadius: 'lg',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'm',
          gap: 1.5,
          display: 'flex',
          // Narrow screens stack: the selection status gets its own row, then
          // the actions get the full width to lay out in. Only above md is
          // there room to put both on one line.
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'nowrap',
            // Stacked, the count sits left and All/Close anchor right, so the
            // status row reads edge to edge instead of floating in the middle.
            justifyContent: { xs: 'space-between', md: 'flex-start' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBox sx={{ color: 'primary.500' }} />
            <Typography level='body-sm' fontWeight='md'>
              {t('archived.selected', { count: selectedCount })}
            </Typography>
          </Box>

          <Divider
            orientation='vertical'
            sx={{
              display: { xs: 'none', md: 'block' },
            }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size='sm'
              variant='outlined'
              onClick={onSelectAll}
              startDecorator={<SelectAll />}
              disabled={selectAllDisabled}
              sx={{
                minWidth: 'auto',
                '--Button-paddingInline': '0.75rem',
                position: 'relative',
              }}
              title={t('archived.selectAllTitle')}
            >
              {t('archived.all')}
              {showKeyboardShortcuts && (
                <KeyboardShortcutHint
                  shortcut='A'
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    zIndex: 1000,
                  }}
                />
              )}
            </Button>
            <Button
              size='sm'
              variant='outlined'
              onClick={onClear}
              startDecorator={
                selectedCount === 0 ? <Close /> : <CheckBoxOutlineBlank />
              }
              sx={{
                minWidth: 'auto',
                '--Button-paddingInline': '0.75rem',
                position: 'relative',
              }}
              title={
                selectedCount === 0
                  ? t('archived.closeMultiSelect')
                  : t('archived.clearMultiSelect')
              }
            >
              {selectedCount === 0 ? t('archived.close') : t('archived.clear')}
              {showKeyboardShortcuts && (
                <KeyboardShortcutHint
                  withCtrl={false}
                  shortcut='Esc'
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    zIndex: 1000,
                  }}
                />
              )}
            </Button>
          </Box>
        </Box>

        {/* The verbs a task can be done to — complete, reschedule, move,
            archive, delete — all keep permanent buttons and wrap to a second
            row when they need to. The sheet holds only the field editors
            (priority, assignee, labels), so nothing appears in both places. */}
        <Box
          sx={{
            gap: 1,
            // Stacked, the actions become an auto-fitting grid: every button
            // stretches to fill its cell, so the rows come out flush instead
            // of trailing ragged whitespace. Above md they go back to a
            // right-aligned row.
            display: { xs: 'grid', md: 'flex' },
            gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            size='sm'
            variant='solid'
            color='success'
            onClick={onComplete}
            startDecorator={<Done />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.completeTitle')}
          >
            {t('multiToolbar.complete')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='Enter'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>

          {onSetDueDate && (
            <>
              <Button
                size='sm'
                variant='soft'
                color='primary'
                ref={dueMenuRef}
                onClick={() =>
                  setDueMenuAnchor(prev => (prev ? null : dueMenuRef.current))
                }
                startDecorator={<CalendarMonth />}
                disabled={selectedCount === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                }}
                title={
                  dueDateValue
                    ? t('multiToolbar.dueTitleSet', { value: dueDateValue })
                    : t('multiToolbar.dueTitleEmpty')
                }
              >
                {t('multiToolbar.due')}
              </Button>
              <Menu
                size='md'
                anchorEl={dueMenuAnchor}
                open={Boolean(dueMenuAnchor)}
                onClose={closeDueMenu}
                placement='bottom-end'
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
                      <Typography
                        level='body-xs'
                        sx={{ color: 'text.tertiary' }}
                      >
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
            </>
          )}

          <Button
            size='sm'
            variant='soft'
            color='warning'
            onClick={onSkip}
            startDecorator={<SkipNext />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.skipTitle')}
          >
            {t('multiToolbar.skip')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='/'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>

          {onMoveToProject && (
            <>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                ref={projectMenuRef}
                onClick={() =>
                  setProjectMenuAnchor(prev =>
                    prev ? null : projectMenuRef.current,
                  )
                }
                startDecorator={<DriveFileMove />}
                disabled={selectedCount === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                }}
                title={t('multiToolbar.moveTitle')}
              >
                {t('multiToolbar.move')}
              </Button>
              <Menu
                size='md'
                anchorEl={projectMenuAnchor}
                open={Boolean(projectMenuAnchor)}
                onClose={closeProjectMenu}
                placement='bottom-end'
              >
                <MenuItem
                  onClick={() => {
                    closeProjectMenu()
                    onMoveToProject({
                      id: null,
                      name: t('multiToolbar.defaultProject'),
                    })
                  }}
                >
                  <ListItemDecorator>
                    {renderProjectAvatar(LABEL_COLORS[0].value, 'FolderOpen')}
                  </ListItemDecorator>
                  <ListItemContent>
                    <Typography level='body-sm'>
                      {t('multiToolbar.defaultProject')}
                    </Typography>
                  </ListItemContent>
                </MenuItem>
                {projects.map(project => (
                  <MenuItem
                    key={project.id}
                    onClick={() => {
                      closeProjectMenu()
                      onMoveToProject(project)
                    }}
                  >
                    <ListItemDecorator>
                      {renderProjectAvatar(project.color, project.icon)}
                    </ListItemDecorator>
                    <ListItemContent>
                      <Typography level='body-sm'>{project.name}</Typography>
                    </ListItemContent>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          <Button
            size='sm'
            variant='soft'
            color='danger'
            onClick={onArchive}
            startDecorator={<Archive />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.archiveTitle')}
          >
            {t('multiToolbar.archive')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='X'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>

          <Button
            size='sm'
            variant='soft'
            color='danger'
            onClick={onDelete}
            startDecorator={<Delete />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
              position: 'relative',
            }}
            title={t('multiToolbar.deleteTitle')}
          >
            {t('archived.delete')}
            {showKeyboardShortcuts && selectedCount > 0 && (
              <KeyboardShortcutHint
                shortcut='E'
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 1000,
                }}
              />
            )}
          </Button>

          <Button
            size='sm'
            variant='outlined'
            color='neutral'
            onClick={() => setMoreOpen(true)}
            startDecorator={<MoreHoriz />}
            disabled={selectedCount === 0}
            sx={{
              '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
            }}
            title={t('multiToolbar.moreTitle')}
          >
            {t('multiToolbar.more')}
          </Button>
        </Box>
      </Box>

      {/* ── More sheet: the field editors that have no button in the bar ────── */}
      <AppModal
        open={moreOpen}
        isMobile
        onClose={() => setMoreOpen(false)}
        maxHeight='92vh'
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBox sx={{ fontSize: 20 }} />
            {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
          </Box>
        }
        footer={
          <Button
            variant='plain'
            color='neutral'
            onClick={() => setMoreOpen(false)}
            sx={{ minWidth: 140 }}
          >
            {t('multiToolbar.done')}
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Due date, project and the destructive actions are deliberately
              absent — each has its own button in the bar, and two entry points
              would just make them ambiguous. */}
          {onSetPriority && (
            <>
              <SectionHeader
                icon={<Flag />}
                label={t('multiToolbar.priority')}
                value={priorityValue}
              />
              <ChipRow>
                {Priorities.map(priority => {
                  const isCurrent =
                    !summary.priority?.isMixed &&
                    summary.priority?.value === priority.value
                  return (
                    <Chip
                      key={priority.value}
                      variant={isCurrent ? 'solid' : 'soft'}
                      color={
                        isCurrent ? priority.color || 'primary' : 'neutral'
                      }
                      startDecorator={
                        isCurrent ? <Check sx={{ fontSize: 14 }} /> : undefined
                      }
                      onClick={runAndClose(() => onSetPriority(priority.value))}
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
                  const isCurrent =
                    !summary.assignee?.isMixed &&
                    summary.assignee?.value === member.userId
                  return (
                    <Chip
                      key={member.userId}
                      variant={isCurrent ? 'solid' : 'soft'}
                      color={isCurrent ? 'primary' : 'neutral'}
                      startDecorator={
                        isCurrent ? (
                          <Check sx={{ fontSize: 14 }} />
                        ) : (
                          <Avatar size='sm' sx={{ width: 20, height: 20 }}>
                            {(member.displayName || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>
                        )
                      }
                      onClick={runAndClose(() => onSetAssignee(member.userId))}
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
                  only some of the selection has it — tapping completes the set. */}
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
        </Box>
      </AppModal>

      {dueDatePickerOpen && (
        <DueDatePickerModal
          open
          title={`Due date for ${selectedCount} task${selectedCount !== 1 ? 's' : ''}`}
          {...prefillDueDate(
            summary.dueDate?.isMixed ? null : summary.dueDate?.value,
          )}
          onClose={() => setDueDatePickerOpen(false)}
          onApply={parts => {
            setDueDatePickerOpen(false)
            setMoreOpen(false)
            // Passed through as parts, not a timestamp: leaving the time on
            // "Anytime" means "keep each task's own hour", which only the
            // per-chore handler can resolve.
            onSetDueDate?.(parts.dueDateOnly ? parts : null)
          }}
          onRemove={() => {
            setDueDatePickerOpen(false)
            setMoreOpen(false)
            onSetDueDate?.(null)
          }}
        />
      )}
    </Box>
  )
}

export default MultiSelectToolbar
