import { Sheet } from '@mui/joy'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'

import CompactChoreCard from '../../Chores/CompactChoreCard'

/**
 * Home renders the same row the task list renders. CompactChoreCard owns the
 * priority stripe, due chip, metadata, complete / approve controls and the
 * action menu, so Home introduces no second task visual and inherits every
 * behaviour change made to the list.
 */
const HomeChoreList = ({ chores, onAction, performers }) => {
  const navigate = useNavigate()

  /**
   * The card has no click handler of its own — in the task list the swipeable
   * wrapper supplies one — so opening the task is this list's job. It is
   * delegated rather than wrapped because the card draws its own row divider
   * with `&:last-child`, which only resolves correctly while the cards are
   * direct children of this container.
   *
   * Buttons inside the card (complete, approve, the action menu) stop
   * propagation, so they never reach this handler.
   */
  const openClickedRow = event => {
    const rows = Array.from(event.currentTarget.children)
    const index = rows.findIndex(row => row.contains(event.target))
    if (index >= 0) navigate(`/chores/${chores[index].id}`)
  }

  return (
    <Sheet
      variant='outlined'
      onClick={openClickedRow}
      sx={{ borderRadius: 'lg', overflow: 'hidden', p: 0 }}
    >
      {chores.map(chore => (
        <CompactChoreCard
          key={chore.id}
          chore={chore}
          performers={performers}
          onAction={onAction}
        />
      ))}
    </Sheet>
  )
}

HomeChoreList.propTypes = {
  chores: PropTypes.array.isRequired,
  onAction: PropTypes.func.isRequired,
  performers: PropTypes.array,
}

export default HomeChoreList
