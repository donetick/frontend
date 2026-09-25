import '@meauxt/react-swipeable-list/dist/styles.css'

import { SwipeableList, Type as ListType } from '@meauxt/react-swipeable-list'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import ChoreActionMenu from '../components/ChoreActionMenu'
import ChoreCard from './ChoreCard'
import CompactChoreCard from './CompactChoreCard'
import ChoreSwipeableItem, {
  SWIPE_COMMIT_THRESHOLD,
} from './components/ChoreSwipeableItem'
import {
  getChoreLeadingActions,
  getChoreTrailingActions,
} from './components/ChoreSwipeActions'

const ChoreListView = ({
  chores,
  handleChoreAction,
  handleLabelFiltering,
  isMultiSelectMode,
  membersData,
  onLongPressChore,
  selectedChores,
  showActions = true,
  toggleChoreSelection,
  toggleMultiSelectMode,
  userLabels,
  userProfile,
  viewMode,
}) => {
  const navigate = useNavigate()
  const { t } = useTranslation('chores')

  // One action menu for the whole list rather than one per row. `chore` is kept
  // after closing so the menu can animate out with its content intact.
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null)
  const [actionMenuChore, setActionMenuChore] = useState(null)
  const openActionMenu = useCallback((anchor, chore) => {
    setActionMenuChore(chore)
    setActionMenuAnchor(anchor)
  }, [])
  const closeActionMenu = useCallback(() => setActionMenuAnchor(null), [])

  // The swipe-action offset below has to follow the card component, not the
  // raw view mode.
  const usesCompactCard = viewMode === 'compact'

  const renderChoreCard = (chore, key) => {
    const CardComponent = usesCompactCard ? CompactChoreCard : ChoreCard
    return (
      <CardComponent
        key={key || chore.id}
        chore={chore}
        performers={membersData?.res}
        userLabels={userLabels}
        onChipClick={handleLabelFiltering}
        onAction={handleChoreAction}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedChores.has(chore.id)}
        onSelectionToggle={() => toggleChoreSelection(chore.id)}
        onOpenActionMenu={openActionMenu}
        showActions={showActions}
      />
    )
  }
  const swipeActionArgs = chore => ({
    chore,
    handleChoreAction,
    isMultiSelectMode,
    showActions,
    t,
    usesCompactCard,
    userProfile,
  })

  // fullSwipe makes the leading action (complete/start) a single flick with no
  // aiming. It also arms the last trailing action — delete — which is safe
  // because delete opens a confirmation modal rather than deleting outright.
  //
  // The threshold has to clear the trailing tray's own width or the tray can
  // never be fully revealed: three 76px tiles are ~58% of a phone-width row,
  // so at the default 0.5 the swipe always commits before you can see the
  // actions, let alone pick one. 0.8 leaves room to open the tray and tap,
  // and keeps the full-swipe commit a deliberately long drag.
  const renderChores = chores => {
    return (
      <SwipeableList
        type={ListType.IOS}
        fullSwipe
        threshold={SWIPE_COMMIT_THRESHOLD}
      >
        {chores.map(chore => (
          <ChoreSwipeableItem
            key={chore.id}
            leadingActions={getChoreLeadingActions(swipeActionArgs(chore))}
            trailingActions={getChoreTrailingActions({
              ...swipeActionArgs(chore),
              navigate,
            })}
            onClick={() => {
              if (isMultiSelectMode) {
                toggleChoreSelection(chore.id)
              } else {
                navigate(`/chores/${chore.id}`)
              }
            }}
            longPressEnabled={Boolean(onLongPressChore)}
            onLongPress={() => onLongPressChore?.(chore.id)}
          >
            {renderChoreCard(chore)}
          </ChoreSwipeableItem>
        ))}
      </SwipeableList>
    )
  }

  return (
    <>
      {renderChores(chores)}
      <ChoreActionMenu
        chore={actionMenuChore}
        anchorEl={actionMenuAnchor}
        onClose={closeActionMenu}
        onAction={handleChoreAction}
        onCompleteWithNote={() =>
          handleChoreAction('completeWithNote', actionMenuChore)
        }
        onCompleteWithPastDate={() =>
          handleChoreAction('completeWithPastDate', actionMenuChore)
        }
        onChangeAssignee={() =>
          handleChoreAction('changeAssignee', actionMenuChore)
        }
        onChangeDueDate={() =>
          handleChoreAction('changeDueDate', actionMenuChore)
        }
        onWriteNFC={() => handleChoreAction('writeNFC', actionMenuChore)}
        onNudge={() => handleChoreAction('nudge', actionMenuChore)}
        onDelete={() => handleChoreAction('delete', actionMenuChore)}
      />
    </>
  )
}

export default ChoreListView
