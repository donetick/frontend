import '@meauxt/react-swipeable-list/dist/styles.css'

import { SwipeableList, Type as ListType } from '@meauxt/react-swipeable-list'
import { Sheet } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import CompactChoreCard from '../../Chores/CompactChoreCard'
import ChoreSwipeableItem, {
  SWIPE_COMMIT_THRESHOLD,
} from '../../Chores/components/ChoreSwipeableItem'
import {
  getChoreLeadingActions,
  getChoreTrailingActions,
} from '../../Chores/components/ChoreSwipeActions'

/**
 * Home renders the same row the task list renders. CompactChoreCard owns the
 * priority stripe, due chip, metadata, complete / approve controls and the
 * action menu, so Home introduces no second task visual and inherits every
 * behaviour change made to the list — including the swipeable trailing
 * actions, which come from the same shared helper the task list uses.
 */
const HomeChoreList = ({ chores, onAction, performers, userProfile }) => {
  const navigate = useNavigate()
  const { t } = useTranslation('chores')

  return (
    <Sheet
      variant='outlined'
      sx={{ borderRadius: 'lg', overflow: 'hidden', p: 0 }}
    >
      {/* See ChoreListView for why fullSwipe and threshold are set this way. */}
      <SwipeableList
        type={ListType.IOS}
        fullSwipe
        threshold={SWIPE_COMMIT_THRESHOLD}
      >
        {chores.map((chore, index) => (
          <ChoreSwipeableItem
            key={chore.id}
            leadingActions={getChoreLeadingActions({
              chore,
              handleChoreAction: onAction,
              t,
              userProfile,
            })}
            trailingActions={getChoreTrailingActions({
              chore,
              handleChoreAction: onAction,
              navigate,
              t,
              userProfile,
            })}
            onClick={() => navigate(`/chores/${chore.id}`)}
          >
            <CompactChoreCard
              chore={chore}
              performers={performers}
              onAction={onAction}
              showDivider={index !== chores.length - 1}
            />
          </ChoreSwipeableItem>
        ))}
      </SwipeableList>
    </Sheet>
  )
}

HomeChoreList.propTypes = {
  chores: PropTypes.array.isRequired,
  onAction: PropTypes.func.isRequired,
  performers: PropTypes.array,
  userProfile: PropTypes.object,
}

export default HomeChoreList
