import '@meauxt/react-swipeable-list/dist/styles.css'

import { SwipeableList, Type as ListType } from '@meauxt/react-swipeable-list'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import ChoreActionMenu from '../components/ChoreActionMenu'
import ChoreCard from './ChoreCard'
import CompactChoreCard from './CompactChoreCard'
import ChoreSwipeableItem from './components/ChoreSwipeableItem'
import { getChoreTrailingActions } from './components/ChoreSwipeActions'

const ChoreListView = ({
  chores,
  handleChoreAction,
  handleLabelFiltering,
  isMultiSelectMode,
  isOfficialInstance,
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

  // 'default' renders the compact card too, so the swipe-action offset below
  // has to follow the card component, not the raw view mode.
  const usesCompactCard = viewMode === 'compact' || viewMode === 'default'

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
  const getTrailingActions = chore =>
    getChoreTrailingActions({
      chore,
      handleChoreAction,
      isMultiSelectMode,
      isOfficialInstance,
      navigate,
      showActions,
      t,
      usesCompactCard,
      userProfile,
    })

  const renderChores = chores => {
    return (
      <SwipeableList type={ListType.IOS} fullSwipe={false}>
        {chores.map(chore => (
          <ChoreSwipeableItem
            key={chore.id}
            trailingActions={getTrailingActions(chore)}
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
